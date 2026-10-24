#!/bin/bash
# Verify pi-profile isolates auth.json but shares other agent-dir entries.
set -u
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/.pi/agent/skills"
echo '{}' >"$T/.pi/agent/auth.json"
echo s >"$T/.pi/agent/settings.json"
export HOME="$T"
pi() { echo "DIR=$PI_CODING_AGENT_DIR ARGS=$*"; }
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$SRC/.config/bash/enabled/pi.sh"
pi-profile work --foo
P="$T/.pi/profiles/work"
[[ ! -e "$P/auth.json" && ! -L "$P/auth.json" ]] || exit 1
[[ -L "$P/settings.json" ]] || exit 1
echo ISOLATED
