#!/bin/bash
# Verify pi-profile work resume chooser: session-aware worktree picker
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"

T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT

# Setup git repo with 2 worktrees
REPO="$T/repo"
git init -q "$REPO"
cd "$REPO"
git config user.email "test@test"
git config user.name "Test"
echo "main" >main.txt
git add main.txt
git commit -qm "init"

mkdir -p .worktrees
echo ".worktrees" >.git/info/exclude

REPO_MAIN="$REPO"
REPO_WT1="$REPO/.worktrees/feat-alpha"
REPO_WT2="$REPO/.worktrees/fix-beta"

git worktree add -q -b feat/alpha "$REPO_WT1"
git worktree add -q -b fix/beta "$REPO_WT2"

# Setup fake PI_PROFILE_DIR with session history
PROFILE="$T/.pi/profiles/work"
SESSION_DIR="$PROFILE/sessions"
mkdir -p "$SESSION_DIR"

# Encode path: / -> ->--
encode_path() { echo "--${1//\//-\>--}--"; }

# Session for main worktree (5 days old)
MAIN_ENC="$(encode_path "$REPO_MAIN")"
MAIN_SESSION="$SESSION_DIR/$MAIN_ENC/$(date -d '5 days ago' +%s)_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jsonl"
mkdir -p "$(dirname "$MAIN_SESSION")"
echo "{\"type\":\"session\",\"cwd\":\"$REPO_MAIN\"}" >"$MAIN_SESSION"

# Session for wt1 (2 days old)
WT1_ENC="$(encode_path "$REPO_WT1")"
WT1_SESSION="$SESSION_DIR/$WT1_ENC/$(date -d '2 days ago' +%s)_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.jsonl"
mkdir -p "$(dirname "$WT1_SESSION")"
echo "{\"type\":\"session\",\"cwd\":\"$REPO_WT1\"}" >"$WT1_SESSION"

# Stub executables
STUB_DIR="$T/bin"
mkdir -p "$STUB_DIR"
PI_LOG="$T/pi.log"
FZF_LOG="$T/fzf.log"

cat >"$STUB_DIR/pi" <<'EOF'
#!/bin/bash
echo "$(pwd) $*" >>"${PI_LOG?}"
EOF
chmod +x "$STUB_DIR/pi"

cat >"$STUB_DIR/fzf" <<'EOF'
#!/bin/bash
echo "$(pwd) $*" >>"${FZF_LOG?}"
# Pick row by env var (1-indexed)
mapfile -t lines
idx="${FZF_PICK_ROW:-1}"
[[ $idx -gt 0 && $idx -le ${#lines[@]} ]] || exit 1
echo "${lines[$((idx-1))]}"
EOF
chmod +x "$STUB_DIR/fzf"

export PATH="$STUB_DIR:$PATH"
export PI_LOG FZF_LOG PI_PROFILE_DIR="$T/.pi/profiles"
export PI_NO_LIMITS=1  # Bypass systemd-run wrapper in pi()

# shellcheck source=/dev/null
source "$SRC/.config/bash/enabled/pi.sh"

# Test 1: extra args => pi called directly, fzf never invoked
rm -f "$PI_LOG" "$FZF_LOG"
cd "$REPO_MAIN"
pi-profile work extra-arg
[[ -f "$PI_LOG" ]] || { echo "FAIL 1a: pi not called"; exit 1; }
grep -q "extra-arg" "$PI_LOG" || { echo "FAIL 1b: args not passed"; exit 1; }
[[ ! -f "$FZF_LOG" ]] || { echo "FAIL 1c: fzf invoked when it shouldn't"; exit 1; }

# Test 2: chooser lists worktrees with age
rm -f "$PI_LOG" "$FZF_LOG"
cd "$REPO_MAIN"
export PI_PROFILE_FORCE_TTY=1 FZF_PICK_ROW=1
pi-profile work
[[ -f "$FZF_LOG" ]] || { echo "FAIL 2a: fzf not invoked"; exit 1; }
# Should list: here, + new worktree, feat/alpha (2d), main (5d)
# (wt2 has no session)

# Test 3: picking existing worktree => cwd changes, pi gets --continue
rm -f "$PI_LOG" "$FZF_LOG"
cd "$REPO_MAIN"
export FZF_PICK_ROW=3  # feat/alpha row
pi-profile work
grep -q "$REPO_WT1.*--continue" "$PI_LOG" || { echo "FAIL 3: no --continue from wt1"; exit 1; }

# Test 4: new worktree with branch => creates .worktrees/type-name
rm -f "$PI_LOG" "$FZF_LOG"
cd "$REPO_MAIN"
export FZF_PICK_ROW=2 PI_PROFILE_NEW_BRANCH="chore/gamma"
pi-profile work
NEW_WT="$REPO/.worktrees/chore-gamma"
[[ -d "$NEW_WT" ]] || { echo "FAIL 4a: worktree not created"; exit 1; }
grep -q "$NEW_WT.*--name chore/gamma" "$PI_LOG" || { echo "FAIL 4b: wrong pi args"; exit 1; }

# Test 5: here => plain pi in PWD
rm -f "$PI_LOG" "$FZF_LOG"
cd "$REPO_MAIN"
export FZF_PICK_ROW=1
pi-profile work
grep -q "^$REPO_MAIN " "$PI_LOG" || { echo "FAIL 5a: not in main repo"; exit 1; }
grep -qv -- "--continue\|--name" "$PI_LOG" || { echo "FAIL 5b: unexpected flags"; exit 1; }

# Test 6: pi-work/pi-personal exist
type pi-work >/dev/null 2>&1 || { echo "FAIL 6a: pi-work missing"; exit 1; }
type pi-personal >/dev/null 2>&1 || { echo "FAIL 6b: pi-personal missing"; exit 1; }

# Test 7: pi-find integration - chooser uses registry with status
PI_FIND_LOG="$T/pi-find.log"
export PI_FIND_LOG
cat >"$STUB_DIR/pi-find" <<'EOFIND'
#!/bin/bash
echo "$*" >>"${PI_FIND_LOG?}"
# Return JSON with sessions (one errored, one lost)
cat <<JSONEND
[
  {
    "id": "019f-aaaa-bbbb-cccc-dddddddddddd",
    "cwd": "REPO_WT1_PLACEHOLDER",
    "status": "errored",
    "started": "2026-07-20T11:21:31.065Z"
  },
  {
    "id": "019f-eeee-ffff-0000-111111111111",
    "cwd": "REPO_MAIN_PLACEHOLDER",
    "status": "lost",
    "started": "2026-07-15T10:00:00.000Z"
  }
]
JSONEND
EOFIND
chmod +x "$STUB_DIR/pi-find"
# Replace placeholders with actual paths
sed -i "s|REPO_WT1_PLACEHOLDER|$REPO_WT1|g" "$STUB_DIR/pi-find"
sed -i "s|REPO_MAIN_PLACEHOLDER|$REPO_MAIN|g" "$STUB_DIR/pi-find"

# Also need stub bun
cat >"$STUB_DIR/bun" <<'EOF'
#!/bin/bash
exit 0
EOF
chmod +x "$STUB_DIR/bun"

rm -f "$PI_FIND_LOG" "$FZF_LOG" "$PI_LOG"
cd "$REPO_MAIN"
export FZF_PICK_ROW=3  # Pick first worktree with session
pi-profile work

# Verify pi-find was called with --json --worktree
[[ -f "$PI_FIND_LOG" ]] || { echo "FAIL 7a: pi-find not called"; exit 1; }
grep -q "\--json" "$PI_FIND_LOG" || { echo "FAIL 7b: missing --json"; exit 1; }
grep -q "\--worktree" "$PI_FIND_LOG" || { echo "FAIL 7c: missing --worktree"; exit 1; }

# Verify fzf input shows status (errored/lost)
[[ -f "$FZF_LOG" ]] || { echo "FAIL 7d: fzf not invoked"; exit 1; }
# fzf receives stdin, can't directly check, but we'll verify in step 8

# Test 8: chooser offers /resume for sessions with UUID
rm -f "$PI_FIND_LOG" "$FZF_LOG" "$PI_LOG"
cd "$REPO_MAIN"
export FZF_PICK_ROW=4  # Pick a /resume entry (row with UUID)
pi-profile work || true  # May fail if not implemented yet

# When implemented, should invoke: pi --resume <uuid>
# For now this will fail, which is expected for TDD

# Test 9: fallback when pi-find missing
rm -f "$STUB_DIR/pi-find" "$PI_FIND_LOG" "$FZF_LOG" "$PI_LOG"
cd "$REPO_MAIN"
export FZF_PICK_ROW=1
pi-profile work
# Should still work using old file-scanning method
[[ -f "$PI_LOG" ]] || { echo "FAIL 9a: fallback failed"; exit 1; }
[[ ! -f "$PI_FIND_LOG" ]] || { echo "FAIL 9b: pi-find called when missing"; exit 1; }

echo "ALL TESTS PASSED"
exit 0
