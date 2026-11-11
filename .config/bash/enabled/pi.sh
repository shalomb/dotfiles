#!/bin/bash

# AGENT_CONTEXT: pi-profile <personal|work> [pi args...] (mirrors claude-profile)
#   Worktree resume chooser: no extra args + TTY + git repo + no --no-resume => fzf picker
# ARCHITECTURE: PI_CODING_AGENT_DIR -> ~/.pi/profiles/<name>, which holds its
#   own auth.json and symlinks every other ~/.pi/agent entry (shared config)
# DESIGN_PATTERN: single function with subcommands; env restored on exit

PI_AGENT_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"
PI_PROFILE_DIR="${PI_PROFILE_DIR:-$HOME/.pi/profiles}"

# TokenEconomizer pi extension spawns $TE_PYTHON (default "python"); only python3 exists
export TE_PYTHON="${TE_PYTHON:-python3}"

# OOM-friendly launcher (mirrors claude()/gemini()). Whole pi tree (subagents,
# LSPs, bg tasks) lives in one transient user cgroup scope, so a runaway kills
# only pi, not the desktop session.
#   MemoryHigh  soft limit: kernel throttles/reclaims before any kill
#   MemoryMax   hard cap; MemorySwapMax=0 avoids swap-thrash freezes
#   oom_score_adj=500  if the global OOM killer fires, pi dies first
#   NODE_OPTIONS heap cap: V8 GCs hard / fails fast instead of ballooning
# Tunables: PI_MEM_HIGH, PI_MEM_MAX, PI_CPU_QUOTA, PI_HEAP_MB. PI_NO_LIMITS=1 bypasses.
pi() {
  if [[ -n "${PI_NO_LIMITS:-}" ]] || ! command -v systemd-run >/dev/null; then
    command pi "$@"
    return
  fi
  agentctl gpg recover 2>/dev/null
  NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=${PI_HEAP_MB:-1536}" \
    systemd-run --user --scope -q \
    -p MemoryHigh="${PI_MEM_HIGH:-2G}" -p MemoryMax="${PI_MEM_MAX:-3G}" \
    -p MemorySwapMax=0 -p CPUQuota="${PI_CPU_QUOTA:-70%}" \
    nice -n 15 \
    sh -c 'echo 500 > /proc/self/oom_score_adj 2>/dev/null; exec "$@"' _ \
    ~/.local/bin/pi "$@"
}

_pi_profile_dir() {
  case "$1" in
  personal | work) printf '%s\n' "$PI_PROFILE_DIR/$1" ;;
  *) return 1 ;;
  esac
}

# Create profile dir; symlink all shared entries except credentials/install
_pi_profile_prepare() {
  local dir entry name
  dir="$(_pi_profile_dir "$1")" || return 1
  mkdir -p "$dir" && chmod 700 "$dir"
  for entry in "$PI_AGENT_DIR"/* "$PI_AGENT_DIR"/.[!.]*; do
    [[ -e "$entry" ]] || continue
    name="${entry##*/}"
    case "$name" in
    auth.json | install | bin | antigravity-accounts.json) continue ;;
    esac
    [[ -e "$dir/$name" || -L "$dir/$name" ]] || ln -s "$entry" "$dir/$name"
  done
}

# Encode path for session dir: / -> ->--
_pi_encode_path() {
  local p="$1"
  p="--${p//\//-\>--}--"
  printf '%s\n' "$p"
}

# Find newest session timestamp for a worktree path
_pi_newest_session() {
  local wt_path="$1" profile_dir="$2" enc session_dir newest=0 ts
  enc="$(_pi_encode_path "$wt_path")"
  session_dir="$profile_dir/sessions/$enc"
  [[ -d "$session_dir" ]] || return 0
  for f in "$session_dir"/*.jsonl; do
    [[ -f "$f" ]] || continue
    ts="${f##*/}"
    ts="${ts%%_*}"
    [[ "$ts" =~ ^[0-9]+$ ]] || continue
    ((ts > newest)) && newest="$ts"
  done
  echo "$newest"
}

# Format session age (seconds -> human readable)
_pi_age_str() {
  local ts="$1" now age days
  [[ "$ts" -eq 0 ]] && {
    echo "new"
    return
  }
  now="$(date +%s)"
  age=$((now - ts))
  days=$((age / 86400))
  if ((days > 0)); then
    echo "${days}d"
  elif ((age > 3600)); then
    echo "$((age / 3600))h"
  elif ((age > 60)); then
    echo "$((age / 60))m"
  else
    echo "${age}s"
  fi
}

# Worktree chooser: fzf picker for session-aware worktree selection
_pi_worktree_chooser() {
  local profile="$1" profile_dir common_dir line wt_path wt_branch
  local rows=() pwd_abs newest age_str label
  local use_registry=0 sessions_json cwd uuid status
  shift

  profile_dir="$(_pi_profile_dir "$profile")"
  common_dir="$(git rev-parse --git-common-dir 2>/dev/null)" || return 1
  pwd_abs="$(pwd -P)"

  # Try pi-find if available
  if command -v bun >/dev/null 2>&1 && command -v jq >/dev/null 2>&1 && command -v pi-find >/dev/null 2>&1; then
    if sessions_json="$(pi-find --json --limit 500 2>/dev/null)"; then
      use_registry=1
    fi
  fi

  # Build fzf menu
  rows+=("here")
  rows+=("+ new worktree")

  if [[ $use_registry -eq 1 ]]; then
    # Registry-based: parse JSON sessions
    local -A wt_sessions wt_status
    # Flatten JSON to single line and parse each object
    # Newest session per cwd wins (pi-find output is newest-first)
    while IFS=$'\t' read -r cwd uuid status; do
      [[ -n "$cwd" && -n "$uuid" ]] || continue
      [[ -n "${wt_sessions[$cwd]:-}" ]] && continue
      wt_sessions["$cwd"]="$uuid"
      wt_status["$cwd"]="$status"
    done < <(jq -r '.[] | [.cwd, .id, .status] | @tsv' <<<"$sessions_json" 2>/dev/null || true)

    # Parse worktree list and annotate with status
    while IFS= read -r line; do
      if [[ "$line" == worktree\ * ]]; then
        [[ -n "${wt_path:-}" ]] && {
          [[ "$wt_path" != "$pwd_abs" ]] && {
            local status_str=""
            if [[ -n "${wt_sessions[$wt_path]:-}" ]]; then
              local st="${wt_status[$wt_path]:-}"
              [[ -n "$st" ]] && status_str=" [$st]"
            fi
            label="${wt_branch:-HEAD}${status_str}"
            rows+=("$label	$wt_path")
            # Add /resume entry if session exists
            if [[ -n "${wt_sessions[$wt_path]:-}" ]]; then
              rows+=("  /resume ${wt_sessions[$wt_path]}	/resume	${wt_sessions[$wt_path]}")
            fi
          }
        }
        wt_path="${line#worktree }"
        wt_branch=""
      elif [[ "$line" == branch\ * ]]; then
        wt_branch="${line#branch }"
        wt_branch="${wt_branch#refs/heads/}"
      elif [[ "$line" == prunable\ * ]]; then
        wt_path="" # Skip prunable worktrees
      fi
    done < <(git worktree list --porcelain)

    # Last worktree
    [[ -n "${wt_path:-}" && "$wt_path" != "$pwd_abs" ]] && {
      local status_str=""
      if [[ -n "${wt_sessions[$wt_path]:-}" ]]; then
        local st="${wt_status[$wt_path]:-}"
        [[ -n "$st" ]] && status_str=" [$st]"
      fi
      label="${wt_branch:-HEAD}${status_str}"
      rows+=("$label	$wt_path")
      if [[ -n "${wt_sessions[$wt_path]:-}" ]]; then
        rows+=("  /resume ${wt_sessions[$wt_path]}	/resume	${wt_sessions[$wt_path]}")
      fi
    }
  else
    # Fallback: file-scanning method
    while IFS= read -r line; do
      if [[ "$line" == worktree\ * ]]; then
        [[ -n "${wt_path:-}" ]] && {
          [[ "$wt_path" != "$pwd_abs" ]] && {
            newest="$(_pi_newest_session "$wt_path" "$profile_dir")"
            age_str="$(_pi_age_str "$newest")"
            label="${wt_branch:-HEAD}  ($age_str)"
            rows+=("$label	$wt_path")
          }
        }
        wt_path="${line#worktree }"
        wt_branch=""
      elif [[ "$line" == branch\ * ]]; then
        wt_branch="${line#branch }"
        wt_branch="${wt_branch#refs/heads/}"
      elif [[ "$line" == prunable\ * ]]; then
        wt_path="" # Skip prunable worktrees
      fi
    done < <(git worktree list --porcelain)

    # Last worktree
    [[ -n "${wt_path:-}" && "$wt_path" != "$pwd_abs" ]] && {
      newest="$(_pi_newest_session "$wt_path" "$profile_dir")"
      age_str="$(_pi_age_str "$newest")"
      label="${wt_branch:-HEAD}  ($age_str)"
      rows+=("$label	$wt_path")
    }
  fi

  # Invoke fzf
  local choice tab_idx wt_target resume_uuid
  choice="$(printf '%s\n' "${rows[@]}" | fzf --with-nth=1 --delimiter=$'\t')" || return 1

  # Parse selection
  if [[ "$choice" == "here" ]]; then
    # Plain pi in current directory
    (
      _pi_profile_prepare "$profile" || return 1
      export PI_CODING_AGENT_DIR
      PI_CODING_AGENT_DIR="$profile_dir"
      pi "$@"
    )
  elif [[ "$choice" == "+ new worktree" ]]; then
    # Create new worktree
    local new_branch new_wt_name new_wt_path worktrees_root repo_root
    new_branch="${PI_PROFILE_NEW_BRANCH:-}"
    if [[ -z "$new_branch" ]]; then
      read -rp "Branch name (e.g. feat/foo): " new_branch
      [[ -n "$new_branch" ]] || return 1
    fi
    new_wt_name="${new_branch//\//-}"

    # Get repo root (parent of .git dir)
    if [[ "$common_dir" == /* ]]; then
      repo_root="${common_dir%/.git}"
    else
      repo_root="$(pwd -P)"
    fi
    worktrees_root="$repo_root/.worktrees"
    new_wt_path="$worktrees_root/$new_wt_name"

    # Ensure .worktrees in git exclude
    mkdir -p "$worktrees_root"
    local exclude_file="${common_dir}/info/exclude"
    mkdir -p "${common_dir}/info"
    if ! grep -qxF ".worktrees" "$exclude_file" 2>/dev/null; then
      echo ".worktrees" >>"$exclude_file"
    fi

    # Create worktree
    git worktree add -b "$new_branch" "$new_wt_path" || return 1

    # Run pi --name in new worktree
    (
      cd "$new_wt_path" || return 1
      _pi_profile_prepare "$profile" || return 1
      export PI_CODING_AGENT_DIR
      PI_CODING_AGENT_DIR="$profile_dir"
      pi --name "$new_branch" "$@"
    )
  else
    # Check if /resume entry
    tab_idx="${choice#*$'\t'}"
    if [[ "$tab_idx" == /resume$'\t'* ]]; then
      resume_uuid="${tab_idx#/resume$'\t'}"
      (
        _pi_profile_prepare "$profile" || return 1
        export PI_CODING_AGENT_DIR
        PI_CODING_AGENT_DIR="$profile_dir"
        pi --resume "$resume_uuid" "$@"
      )
    else
      # Existing worktree
      wt_target="$tab_idx"
      if [[ $use_registry -eq 1 ]]; then
        # Registry mode: always use --continue if session exists
        (
          cd "$wt_target" || return 1
          _pi_profile_prepare "$profile" || return 1
          export PI_CODING_AGENT_DIR
          PI_CODING_AGENT_DIR="$profile_dir"
          pi --continue "$@"
        )
      else
        # Fallback mode: check file age
        newest="$(_pi_newest_session "$wt_target" "$profile_dir")"
        (
          cd "$wt_target" || return 1
          _pi_profile_prepare "$profile" || return 1
          export PI_CODING_AGENT_DIR
          PI_CODING_AGENT_DIR="$profile_dir"
          if [[ "$newest" -gt 0 ]]; then
            pi --continue "$@"
          else
            pi "$@"
          fi
        )
      fi
    fi
  fi
}

_pi_profile_usage() {
  echo "Usage: pi-profile <personal|work> [pi args...]" >&2
  echo "       pi-profile switch <name> | status" >&2
}

pi-profile() {
  local profile rc prev_set=0 prev_dir args=() no_resume=0
  case "$1" in
  personal | work)
    profile="$1"
    shift

    # Strip --no-resume flag, track it
    for arg in "$@"; do
      if [[ "$arg" == "--no-resume" ]]; then
        no_resume=1
      else
        args+=("$arg")
      fi
    done

    # Decide if we should show chooser:
    # - No extra args (or only --no-resume which is now stripped)
    # - TTY on stdin and stdout (or PI_PROFILE_FORCE_TTY=1)
    # - Inside a git repo
    # - no_resume not set
    if [[ ${#args[@]} -eq 0 && $no_resume -eq 0 ]] &&
      { [[ -n "${PI_PROFILE_FORCE_TTY:-}" ]] || { [[ -t 0 && -t 1 ]]; }; } &&
      git rev-parse --git-dir &>/dev/null; then
      _pi_worktree_chooser "$profile" "${args[@]}"
      return $?
    fi

    # Pass-through mode
    _pi_profile_prepare "$profile" || return 1
    [[ -n "${PI_CODING_AGENT_DIR+x}" ]] && prev_set=1
    prev_dir="${PI_CODING_AGENT_DIR:-}"
    export PI_CODING_AGENT_DIR
    PI_CODING_AGENT_DIR="$(_pi_profile_dir "$profile")"
    pi "${args[@]}"
    rc=$?
    if ((prev_set)); then
      PI_CODING_AGENT_DIR="$prev_dir"
    else
      unset PI_CODING_AGENT_DIR
    fi
    return $rc
    ;;
  switch)
    _pi_profile_dir "${2:-}" >/dev/null || {
      _pi_profile_usage
      return 1
    }
    _pi_profile_prepare "$2" || return 1
    export PI_CODING_AGENT_DIR
    PI_CODING_AGENT_DIR="$(_pi_profile_dir "$2")"
    echo "Switched to $2"
    ;;
  status)
    local name active="default (~/.pi/agent)"
    for name in personal work; do
      [[ "${PI_CODING_AGENT_DIR:-}" == "$PI_PROFILE_DIR/$name" ]] && active="$name"
    done
    echo "active:  $active"
    for name in personal work; do
      if [[ -f "$PI_PROFILE_DIR/$name/auth.json" ]]; then
        echo "stored:  $name"
      else
        echo "stored:  $name (empty - run pi-profile $name, then /login)"
      fi
    done
    ;;
  *)
    _pi_profile_usage
    return 1
    ;;
  esac
}

# Convenience wrappers
pi-work() { pi-profile work "$@"; }
pi-personal() { pi-profile personal "$@"; }
