#!/bin/bash
# Characterises .config/apt/apt-prune against fixture profiles and stubbed apt tools:
# nothing real is demoted or removed. Stubs log every call to $CALLS.
# shellcheck disable=SC2329  # fns are called via check()
set -uo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.config/apt/apt-prune"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT
P=$FIX/profiles
mkdir -p "$P" "$FIX/bin"
printf 'git\ncurl\n' >"$P/base.list"
printf '# empty\n' >"$P/dev.list"
printf '# empty\n' >"$P/cloud.list"
printf 'ffmpeg\n' >"$P/extras.list"
printf '# empty\n' >"$P/gui.list"
printf 'bash\n' >"$FIX/baseline"
printf 'git\ncurl\nffmpeg\n' >"$FIX/manual"
printf 'ffmpeg-libs\n' >"$FIX/auto"
printf 'Package: ffmpeg\nAuto-Installed: 0\n' >"$FIX/states"
CALLS=$FIX/calls

stub() { printf '#!/bin/bash\n%s\n' "$2" >"$FIX/bin/$1"; chmod +x "$FIX/bin/$1"; }
stub fake-sudo 'echo "sudo $*" >>"$CALLS"'
stub fake-apt-mark 'echo "apt-mark $*" >>"$CALLS"; [[ $1 == showauto ]] && cat "$FIX_AUTO"; exit 0'
stub fake-apt-get 'echo "apt-get $*" >>"$CALLS"; for p in $FAKE_REMV; do echo "Remv $p [1.0]"; done'
stub fake-apt 'echo "apt $*" >>"$CALLS"'
export CALLS FIX_AUTO=$FIX/auto
export APT_PROFILE_DIR=$P APT_MANUAL_FILE=$FIX/manual APT_BASELINE_FILE=$FIX/baseline APT_STATE_FILE=$FIX/states
export SUDO=$FIX/bin/fake-sudo APT_MARK=$FIX/bin/fake-apt-mark APT_GET=$FIX/bin/fake-apt-get APT=$FIX/bin/fake-apt
unset PROFILES GUI ACK_UNRECORDED
export FAKE_REMV="ffmpeg"

fail=0
check() { if "${@:2}"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
run() { : >"$CALLS"; "$SCRIPT" "$@" >"$FIX/out" 2>&1; echo $? >"$FIX/rc"; }
rc() { [[ $(<"$FIX/rc") == "$1" ]]; }
said() { rg -q -- "$1" "$FIX/out"; }
called() { rg -q -- "$1" "$CALLS"; }

# --- dry run (default): reports, never calls sudo or the real apt-mark
run
check "dry run succeeds"                    rc 0
check "dry run names what it would demote"  said 'ffmpeg'
check "dry run never uses sudo"             bash -c "! rg -q '^sudo' '$CALLS'"
check "dry run uses a sandbox state file"   called 'apt-mark -f .* auto'
check "dry run simulates autoremove"        called 'apt-get -s .*extended_states=.* autoremove'
check "dry run says how to apply"           said 'APPLY=1'

# --- --apply: pin keep set, demote, autoremove -- in that order, via sudo
export FIX_AUTO=$FIX/auto; printf 'git\nffmpeg-libs\n' >"$FIX/auto"
run --apply
check "apply succeeds"                      rc 0
check "apply pins auto-marked keep pkgs"    called '^sudo .*apt-mark manual git'
check "apply demotes the extras"            called '^sudo .*apt-mark auto ffmpeg'
check "apply autoremoves with purge"        called '^sudo .*apt autoremove --purge'
check "apply orders pin, demote, remove"    bash -c "grep -n '^sudo' '$CALLS' | awk -F: '/manual/{a=\$1} /apt-mark auto/{b=\$1} /autoremove/{c=\$1} END{exit !(a<b && b<c)}'"
printf 'ffmpeg-libs\n' >"$FIX/auto"

# --- guard: unrecorded manual packages (in no profile) block until acknowledged
printf 'git\ncurl\nffmpeg\ntlp\n' >"$FIX/manual"
run --apply
check "unrecorded pkg blocks the run"       rc 1
check "unrecorded pkg is named"             said 'tlp'
check "blocked run does nothing"            bash -c "! rg -q '^sudo' '$CALLS'"
ACK_UNRECORDED=1 run --apply
check "ACK_UNRECORDED=1 proceeds"           rc 0
check "acknowledged run demotes it"         called '^sudo .*apt-mark auto .*tlp'
printf 'git\ncurl\nffmpeg\n' >"$FIX/manual"

# --- guard: removal set must not contain keep-set or protected packages
FAKE_REMV="ffmpeg git" run --apply
check "keep-set package in removal aborts"  rc 1
check "names the offending package"         said 'git'
check "aborted run does nothing"            bash -c "! rg -q '^sudo' '$CALLS'"
FAKE_REMV="ffmpeg network-manager" run --apply
check "protected package in removal aborts" rc 1
check "protected abort does nothing"        bash -c "! rg -q '^sudo' '$CALLS'"
FAKE_REMV="ffmpeg openssh-server" run
check "guards also apply to a dry run"      rc 1

# --- profile selection flows through
PROFILES="base extras" run
check "PROFILES widens the keep set"        bash -c "! rg -q 'auto .*ffmpeg' '$FIX/out' || rg -q 'nothing to demote' '$FIX/out'"
exit $fail
