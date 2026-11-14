#!/bin/bash
# AGENT_CONTEXT: decides whether to ask which worktree/session to launch, and builds a plan
# DESIGN_PATTERN: _pi_choose never launches; it fills _PI_PLAN_CWD / _PI_PLAN_ARGS
#   so the caller (pi) runs it. Inside a linked worktree there is nothing to ask.

# Is cwd inside a *linked* worktree (not the main checkout)?
_pi_in_linked_worktree() {
  local gd cd_
  gd="$(git rev-parse --absolute-git-dir 2>/dev/null)" || return 1
  cd_="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || return 1
  [[ "$gd" != "$cd_" ]]
}

# _pi_should_choose <nargs> <no_resume>
_pi_should_choose() {
  [[ "$1" -eq 0 && "$2" -eq 0 ]] || return 1
  [[ -n "${PI_FORCE_TTY:-}" ]] || { [[ -t 0 && -t 1 ]]; } || return 1
  git rev-parse --git-dir &>/dev/null || return 1
  ! _pi_in_linked_worktree
}

# Newest session timestamp for a path (file scan fallback); 0 if none
_pi_newest_session() {
  local enc="--${1//\//-\>--}--" dir f ts newest=0
  dir="$2/sessions/$enc"
  [[ -d "$dir" ]] || { echo 0; return; }
  for f in "$dir"/*.jsonl; do
    [[ -f "$f" ]] || continue
    ts="${f##*/}"; ts="${ts%%_*}"
    [[ "$ts" =~ ^[0-9]+$ ]] && ((ts > newest)) && newest="$ts"
  done
  echo "$newest"
}

_pi_age_str() {
  local ts="$1" age days
  [[ "$ts" -eq 0 ]] && { echo new; return; }
  age=$(($(date +%s) - ts)); days=$((age / 86400))
  if ((days > 0)); then echo "${days}d"
  elif ((age > 3600)); then echo "$((age / 3600))h"
  elif ((age > 60)); then echo "$((age / 60))m"
  else echo "${age}s"; fi
}

# Prints "path<TAB>branch" for each non-prunable worktree
_pi_worktrees() {
  local line path="" branch=""
  while IFS= read -r line; do
    case "$line" in
    "worktree "*) [[ -n "$path" ]] && printf '%s\t%s\n' "$path" "$branch"
      path="${line#worktree }"; branch="" ;;
    "branch "*) branch="${line#branch refs/heads/}" ;;
    "prunable "*) path="" ;;
    esac
  done < <(git worktree list --porcelain)
  [[ -n "$path" ]] && printf '%s\t%s\n' "$path" "$branch"
  return 0
}

# _pi_choose <profile> : fzf picker; sets _PI_PLAN_CWD and _PI_PLAN_ARGS (array)
_pi_choose() {
  local profile="$1" profile_dir here wt br rows=() choice target
  local -A uuid status
  profile_dir="$(_pi_profile_dir "$profile")" || return 1
  here="$(pwd -P)"

  local registry=0 json cwd id st
  if command -v pi-find >/dev/null && command -v jq >/dev/null &&
    json="$(pi-find --json --limit 500 2>/dev/null)"; then
    registry=1
    while IFS=$'\t' read -r cwd id st; do # newest-first: first per cwd wins
      [[ -n "$cwd" && -n "$id" && -z "${uuid[$cwd]:-}" ]] || continue
      uuid[$cwd]="$id"; status[$cwd]="$st"
    done < <(jq -r '.[] | [.cwd, .id, .status] | @tsv' <<<"$json" 2>/dev/null)
  fi

  rows=("here" "+ new worktree")
  local label newest
  while IFS=$'\t' read -r wt br; do
    [[ "$wt" != "$here" ]] || continue
    if ((registry)); then
      label="${br:-HEAD}${status[$wt]:+ [${status[$wt]}]}"
      rows+=("$label"$'\t'"$wt")
      [[ -n "${uuid[$wt]:-}" ]] && rows+=("  /resume ${uuid[$wt]}"$'\t'"/resume"$'\t'"${uuid[$wt]}")
    else
      newest="$(_pi_newest_session "$wt" "$profile_dir")"
      rows+=("${br:-HEAD}  ($(_pi_age_str "$newest"))"$'\t'"$wt")
    fi
  done < <(_pi_worktrees)

  choice="$(printf '%s\n' "${rows[@]}" | fzf --with-nth=1 --delimiter=$'\t')" || return 1

  _PI_PLAN_CWD="$here"; _PI_PLAN_ARGS=()
  case "$choice" in
  here) ;;
  "+ new worktree") _pi_new_worktree || return 1 ;;
  *)
    target="${choice#*$'\t'}"
    if [[ "$target" == /resume$'\t'* ]]; then
      _PI_PLAN_ARGS=(--resume "${target#/resume$'\t'}")
    else
      _PI_PLAN_CWD="$target"
      if ((registry)) || [[ "$(_pi_newest_session "$target" "$profile_dir")" -gt 0 ]]; then
        _PI_PLAN_ARGS=(--continue)
      fi
    fi ;;
  esac
}

# Creates <repo>/.worktrees/<branch-with-dashes>; sets _PI_PLAN_CWD/_PI_PLAN_ARGS
_pi_new_worktree() {
  local branch="${PI_NEW_BRANCH:-}" common root
  if [[ -z "$branch" ]]; then
    read -rp "Branch name (e.g. feat/foo): " branch
    [[ -n "$branch" ]] || return 1
  fi
  common="$(git rev-parse --path-format=absolute --git-common-dir)" || return 1
  root="${common%/.git}"
  mkdir -p "$root/.worktrees" "$common/info"
  grep -qxF ".worktrees" "$common/info/exclude" 2>/dev/null || echo ".worktrees" >>"$common/info/exclude"
  git worktree add -b "$branch" "$root/.worktrees/${branch//\//-}" || return 1
  _PI_PLAN_CWD="$root/.worktrees/${branch//\//-}"
  _PI_PLAN_ARGS=(--name "$branch")
}
