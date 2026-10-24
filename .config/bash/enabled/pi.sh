#!/bin/bash

# AGENT_CONTEXT: pi-profile <personal|work> [pi args...] (mirrors claude-profile)
# ARCHITECTURE: PI_CODING_AGENT_DIR -> ~/.pi/profiles/<name>, which holds its
#   own auth.json and symlinks every other ~/.pi/agent entry (shared config)
# DESIGN_PATTERN: single function with subcommands; env restored on exit

PI_AGENT_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"
PI_PROFILE_DIR="$HOME/.pi/profiles"

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

_pi_profile_usage() {
  echo "Usage: pi-profile <personal|work> [pi args...]" >&2
  echo "       pi-profile switch <name> | status" >&2
}

pi-profile() {
  local profile rc prev_set=0 prev_dir
  case "$1" in
  personal | work)
    profile="$1"
    shift
    _pi_profile_prepare "$profile" || return 1
    [[ -n "${PI_CODING_AGENT_DIR+x}" ]] && prev_set=1
    prev_dir="${PI_CODING_AGENT_DIR:-}"
    export PI_CODING_AGENT_DIR
    PI_CODING_AGENT_DIR="$(_pi_profile_dir "$profile")"
    pi "$@"
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
