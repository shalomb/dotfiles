#!/usr/bin/env bash
# Behaviour tests for .local/bin/gpg-unlock using fake gpg/tmux (no real keys touched).
set -uo pipefail
SUT=$(cd "$(dirname "$0")/.." && pwd)/.local/bin/gpg-unlock
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
fail=0
check() { if [[ $2 == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1 (want '$3' got '$2')"; fail=1; fi; }

# fake gpg: unlocked iff $tmp/unlocked exists; interactive (non --pinentry-mode error) call unlocks.
cat >"$tmp/gpg" <<'G'
#!/usr/bin/env bash
[[ -e $FAKE/unlocked ]] && exit 0
[[ " $* " == *"--pinentry-mode error"* ]] && exit 2
[[ -e $FAKE/typo ]] && exit 2
touch "$FAKE/unlocked"; exit 0
G
# fake tmux: records popup call and simulates the user unlocking in it.
cat >"$tmp/tmux" <<'T'
#!/usr/bin/env bash
echo "$*" >>"$FAKE/tmux.log"
[[ $1 == display-popup ]] && touch "$FAKE/unlocked"
exit 0
T
chmod +x "$tmp/gpg" "$tmp/tmux"
export FAKE=$tmp GPG_UNLOCK_GPG=$tmp/gpg GPG_UNLOCK_TMUX=$tmp/tmux

# 1. already unlocked: succeeds, never opens a popup
touch "$tmp/unlocked"; "$SUT" </dev/null >/dev/null 2>&1; check "unlocked -> exit 0" $? 0
check "unlocked -> no popup" "$(cat "$tmp/tmux.log" 2>/dev/null)" ""

# 2. locked + non-tty + $TMUX_PANE: popup targets that pane and unlock succeeds
rm "$tmp/unlocked"; TMUX_PANE=%7 "$SUT" </dev/null >/dev/null 2>&1; check "locked via popup -> exit 0" $? 0
check "popup targets pane" "$(rg -o -- '-t %7' "$tmp/tmux.log")" "-t %7"
check "popup runs --here" "$(rg -c -- '--here' "$tmp/tmux.log")" 1

# 3. locked + non-tty + no tmux: exit 2 (cannot prompt)
rm "$tmp/unlocked"; GPG_UNLOCK_TMUX=/nonexistent "$SUT" </dev/null >/dev/null 2>&1; check "no tmux -> exit 2" $? 2
exit $fail
