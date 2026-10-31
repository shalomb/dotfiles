#!/bin/bash
# Characterises .config/apt/profile-packages against fixture profiles (never calls apt).
# shellcheck disable=SC2329  # fns are called via check()
set -uo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.config/apt/profile-packages"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT
P=$FIX/profiles
mkdir -p "$P"
printf '# base\ncurl\ngit   install\n\nvim\n' >"$P/base.list"
printf '# dev\ngcc\ngo\n' >"$P/dev.list"
printf 'kubectl\n' >"$P/cloud.list"
printf 'ffmpeg\n' >"$P/extras.list"
printf 'xterm\n' >"$P/gui.list"
printf 'bash\ncoreutils\n' >"$FIX/baseline"
printf 'curl\ngcc\nkubectl\nffmpeg\nbash\nlibssl3\npython3-attr\nhtop\nlinux-image-arm64\nxterm\n' >"$FIX/manual"
export APT_PROFILE_DIR=$P APT_MANUAL_FILE=$FIX/manual APT_BASELINE_FILE=$FIX/baseline
unset PROFILES GUI

fail=0
check() { if "${@:2}"; then echo "ok   $1"; else
  echo "FAIL $1"
  fail=1
fi; }
out() { "$SCRIPT" "$@" 2>&1; }
has() { out "${@:2}" | rg -qx -- "$1"; }
lacks() { ! out "${@:2}" | rg -qx -- "$1"; }

check "default profiles are base+dev+cloud" bash -c "$(declare -f out has); SCRIPT='$SCRIPT'; has gcc && has curl && has kubectl"
check "extras are not in the default" bash -c "$(declare -f out lacks); SCRIPT='$SCRIPT'; lacks ffmpeg"
check "gui is not in the default" bash -c "$(declare -f out lacks); SCRIPT='$SCRIPT'; lacks xterm"
check "named profiles are honoured" bash -c "$(declare -f out has lacks); SCRIPT='$SCRIPT'; has ffmpeg extras && lacks gcc extras"
check "PROFILES env selects profiles" bash -c "$(declare -f out has lacks); SCRIPT='$SCRIPT'; export PROFILES=extras; has ffmpeg && lacks curl"
check "GUI=1 adds the gui profile" bash -c "$(declare -f out has); SCRIPT='$SCRIPT'; export GUI=1; has xterm"
check "comments and blanks are ignored" bash -c "$(declare -f out lacks); SCRIPT='$SCRIPT'; lacks '#.*' ; lacks ''"
check "trailing words after the name dropped" bash -c "$(declare -f out has); SCRIPT='$SCRIPT'; has git"
check "output is sorted and unique" bash -c "'$SCRIPT' base dev base | sort -c -u"
check "unknown profile fails" bash -c "! '$SCRIPT' nope >/dev/null 2>&1"
check "unknown profile is named in the error" bash -c "'$SCRIPT' nope 2>&1 | rg -q nope"

# --audit: manual packages that no profile mentions, minus baseline/libs/kernel/python libs
check "--audit lists unrecorded manual pkgs" bash -c "$(declare -f out has); SCRIPT='$SCRIPT'; has htop --audit"
check "--audit skips recorded packages" bash -c "$(declare -f out lacks); SCRIPT='$SCRIPT'; lacks curl --audit; lacks xterm --audit"
check "--audit skips baseline, libs, kernel" bash -c "$(declare -f out lacks); SCRIPT='$SCRIPT'; lacks bash --audit; lacks libssl3 --audit; lacks python3-attr --audit; lacks linux-image-arm64 --audit"
# --outside: manual packages outside the SELECTED profiles (candidates to demote)
check "--outside lists manual pkgs not selected" bash -c "$(declare -f out has); SCRIPT='$SCRIPT'; has ffmpeg --outside; has xterm --outside"
check "--outside skips selected profiles" bash -c "$(declare -f out lacks); SCRIPT='$SCRIPT'; lacks curl --outside; lacks gcc --outside"
check "--outside honours a wider selection" bash -c "$(declare -f out lacks); SCRIPT='$SCRIPT'; lacks ffmpeg --outside base dev cloud extras"
exit $fail
