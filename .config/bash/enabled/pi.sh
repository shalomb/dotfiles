#!/bin/bash
# AGENT_CONTEXT: pi() picks the profile (personal|work) from the cwd and launches pi.
#   Config: ~/.config/pi-profile/settings.yaml (paths: longest-prefix -> profile).
#   Override: PI_PROFILE=work pi. Bare `pi` in a git main checkout offers a worktree
#   chooser; inside a linked worktree it just launches. --no-resume skips the chooser.
# ARCHITECTURE: PI_CODING_AGENT_DIR -> ~/.pi/profiles/<name> (own auth.json, rest
#   symlinked to ~/.pi/agent). Logic lives in lib/pi/{profile,launch,chooser}.sh.
# DESIGN_PATTERN: pi() only orchestrates; launches in a subshell so env never leaks.

export TE_PYTHON="${TE_PYTHON:-python3}" # TokenEconomizer spawns $TE_PYTHON

_pi_lib="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/../lib/pi"
for _pi_f in profile launch chooser; do
  # shellcheck source=/dev/null
  source "$_pi_lib/$_pi_f.sh"
done
unset _pi_lib _pi_f

pi() {
  local arg args=() no_resume=0 profile
  for arg in "$@"; do
    if [[ "$arg" == --no-resume ]]; then no_resume=1; else args+=("$arg"); fi
  done

  # Respect an explicitly pre-set agent dir (e.g. nested/child pi) unless PI_PROFILE given
  if [[ -n "${PI_CODING_AGENT_DIR:-}" && -z "${PI_PROFILE:-}" ]]; then
    _pi_run "${args[@]}"
    return
  fi

  profile="$(_pi_resolve_profile "$PWD")" || return 1
  _pi_profile_prepare "$profile" || return 1

  _PI_PLAN_CWD="$PWD"
  _PI_PLAN_ARGS=("${args[@]}")
  if _pi_should_choose "${#args[@]}" "$no_resume"; then
    _pi_choose "$profile" || return 1
  fi
  (
    cd "$_PI_PLAN_CWD" || exit 1
    export PI_CODING_AGENT_DIR
    PI_CODING_AGENT_DIR="$(_pi_profile_dir "$profile")"
    _pi_run "${_PI_PLAN_ARGS[@]}"
  )
}
