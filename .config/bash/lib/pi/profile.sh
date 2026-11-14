#!/bin/bash
# AGENT_CONTEXT: pi profile resolution + preparation (pure, sourced by enabled/pi.sh)
# ARCHITECTURE: PI_PROFILE env > ~/.config/pi-profile/settings.yaml (longest-prefix
#   `paths:` map, then `default:`) > personal. Profile dir = $PI_PROFILE_DIR/<name>
# DESIGN_PATTERN: small functions, no globals mutated; tested by tests/pi/*.bats

PI_AGENT_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"
PI_PROFILE_DIR="${PI_PROFILE_DIR:-$HOME/.pi/profiles}"
PI_SETTINGS_FILE="${PI_SETTINGS_FILE:-${XDG_CONFIG_HOME:-$HOME/.config}/pi-profile/settings.yaml}"

_pi_profile_valid() { [[ "$1" == personal || "$1" == work ]]; }

_pi_profile_dir() {
  _pi_profile_valid "$1" || return 1
  printf '%s\n' "$PI_PROFILE_DIR/$1"
}

# Expand leading ~ and normalise a settings path
_pi_norm_path() {
  local p="$1"
  [[ "$p" == \~ || "$p" == \~/* ]] && p="$HOME${p#\~}"
  realpath -m -- "$p"
}

# _pi_resolve_profile [dir]  -> prints profile name
_pi_resolve_profile() {
  local dir="${1:-$PWD}" profile="personal" best=-1 key val rule cand
  local cands=("$dir")
  cands+=("$(cd -P -- "$dir" 2>/dev/null && pwd -P)")

  if [[ -n "${PI_PROFILE:-}" ]]; then
    profile="$PI_PROFILE"
  elif [[ -f "$PI_SETTINGS_FILE" ]] && command -v yq >/dev/null; then
    val="$(yq -r '.default // ""' "$PI_SETTINGS_FILE")" && [[ -n "$val" ]] && profile="$val"
    while IFS=$'\t' read -r key val; do
      [[ -n "$key" ]] || continue
      rule="$(_pi_norm_path "$key")"
      for cand in "${cands[@]}"; do
        [[ -n "$cand" ]] || continue
        if [[ "$cand" == "$rule" || "$cand" == "$rule"/* ]] && ((${#rule} > best)); then
          best=${#rule}
          profile="$val"
        fi
      done
    done < <(yq -r '(.paths // {}) | to_entries | .[] | .key + "\t" + .value' "$PI_SETTINGS_FILE")
  fi

  _pi_profile_valid "$profile" || {
    echo "pi: invalid profile '$profile' (expected personal|work)" >&2
    return 1
  }
  printf '%s\n' "$profile"
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
