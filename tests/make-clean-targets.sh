#!/bin/bash
# Characterises the cleanup targets in the Makefile against a fixture HOME
# containing stub tools, so nothing real is ever cleaned.
# shellcheck disable=SC2329  # fns are called via check()
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT
export HOME="$FIX/home" XDG_CONFIG_HOME="$FIX/home/.config" npm_config_cache="$FIX/npm-cache"
mkdir -p "$HOME/.local/bin" "$HOME/.cache"
CALLS="$FIX/calls"; : >"$CALLS"

stub() { # stub <name>: records "<name> <args>" in $CALLS and succeeds
  printf '#!/bin/bash\necho "%s $*" >>"%s"\n' "$1" "$CALLS" >"$HOME/.local/bin/$1"
  chmod +x "$HOME/.local/bin/$1"
}
fail=0
check() { if "${@:2}"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
called() { rg -q -- "$1" "$CALLS"; }
run() { (cd "${CWD:-$REPO}" && make -f "$REPO/Makefile" "$@" >"$FIX/make.out" 2>&1); }

# --- python-cleanup must run `uv cache clean` when uv IS installed
stub uv
run python-cleanup
check "python-cleanup runs uv cache clean when uv exists" called '^uv cache clean'

# --- npm-cleanup must not delete a project's files when run from another directory
stub npm
export PATH="$HOME/.local/bin:$PATH"
PROJ="$FIX/proj"; mkdir -p "$PROJ/node_modules"; echo '{}' >"$PROJ/package.json"; echo '{}' >"$PROJ/package-lock.json"
CWD=$PROJ run npm-cleanup
check "npm-cleanup keeps package.json outside dotfiles"      test -f "$PROJ/package.json"
check "npm-cleanup keeps package-lock.json outside dotfiles" test -f "$PROJ/package-lock.json"
check "npm-cleanup keeps node_modules outside dotfiles"      test -d "$PROJ/node_modules"
check "npm-cleanup still cleans the npm cache"               called '^npm cache clean'
check "npm-cleanup explains the skip"                        rg -q 'skipping' "$FIX/make.out"

# --- worktree-cleanup removes only provably-safe worktrees, and `clean` runs it
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t GIT_CONFIG_NOSYSTEM=1
git init -q --bare "$FIX/origin.git"
git clone -q "$FIX/origin.git" "$HOME/oneTakeda/repo" 2>/dev/null
WR=$HOME/oneTakeda/repo
git -C "$WR" commit -q --allow-empty -m "chore: init"; git -C "$WR" branch -M main; git -C "$WR" push -q origin main
for b in safe dirty; do git -C "$WR" worktree add -q -b $b "$WR/.worktrees/$b" main; done
git -C "$WR/.worktrees/safe" push -q origin safe
echo x >"$WR/.worktrees/dirty/new.txt"
run worktree-cleanup
check "worktree-cleanup removes clean pushed worktree" test ! -d "$WR/.worktrees/safe"
check "worktree-cleanup keeps dirty worktree"          test -d "$WR/.worktrees/dirty"
check "clean depends on worktree-cleanup"              bash -c "make -n -f '$REPO/Makefile' clean 2>&1 | rg -q 'prune-worktrees.sh --apply'"

exit $fail
