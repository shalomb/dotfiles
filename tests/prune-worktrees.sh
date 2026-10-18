#!/bin/bash
# Characterises scripts/prune-worktrees.sh against fixture repos (never touches real worktrees).
# shellcheck disable=SC2016,SC2329  # fns are called via check(); $0 must expand in the child shell
set -euo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/prune-worktrees.sh"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT
export HOME="$FIX/home" XDG_CONFIG_HOME="$FIX/home/.config" GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
unset GIT_CONFIG_GLOBAL
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
mkdir -p "$HOME"

ROOT=$FIX/root
git init -q --bare "$FIX/origin.git"
git clone -q "$FIX/origin.git" "$ROOT/repo" 2>/dev/null
R=$ROOT/repo
git -C "$R" commit -q --allow-empty -m init
git -C "$R" branch -M main
git -C "$R" push -q origin main

wt() { git -C "$R" worktree add -q -b "$1" "$R/.worktrees/$1" main; }
for b in clean dirty unpushed locked gone; do wt $b; done
git -C "$R" worktree add -q -b outside "$ROOT/outside" main
# clean: published branch, nothing to lose
git -C "$R/.worktrees/clean" push -q origin clean
# dirty: uncommitted work
echo x > "$R/.worktrees/dirty/new.txt"
# unpushed: commit that exists nowhere else
git -C "$R/.worktrees/unpushed" commit -q --allow-empty -m wip
# locked: explicitly protected by the user
git -C "$R" worktree lock "$R/.worktrees/locked"
# gone: directory deleted behind git's back
rm -rf "$R/.worktrees/gone"
# outside: clean + published, but not under <repo>/.worktrees
git -C "$ROOT/outside" push -q origin outside

fail=0
check() { # check <description> <test-cmd...>
  local d=$1; shift
  if "$@"; then echo "ok   $d"; else echo "FAIL $d"; fail=1; fi
}
present() { [[ -d $R/.worktrees/$1 ]]; }
absent()  { [[ ! -d $R/.worktrees/$1 ]]; }

# --- report mode (default) changes nothing and classifies each worktree
out=$("$SCRIPT" "$ROOT")
[[ -z ${DEBUG:-} ]] || echo "$out"
check "report lists clean as REMOVE"   rg -q '^REMOVE .*\.worktrees/clean' <<<"$out"
check "report keeps dirty"             rg -q '^KEEP .*\.worktrees/dirty.*uncommitted' <<<"$out"
check "report keeps unpushed"          rg -q '^KEEP .*\.worktrees/unpushed.*unpushed' <<<"$out"
check "report keeps locked"            rg -q '^KEEP .*\.worktrees/locked.*locked' <<<"$out"
check "report ignores outside"         bash -c '! rg -q outside <<<"$0"' "$out"
for b in clean dirty unpushed locked; do check "report leaves $b on disk" present $b; done
check "report leaves gone registered"  bash -c 'git -C "$0" worktree list | rg -q "\.worktrees/gone"' "$R"

# --- apply mode removes only the provably-safe ones
"$SCRIPT" --apply "$ROOT" >/dev/null
check "apply removes clean"            absent clean
check "apply keeps dirty"              present dirty
check "apply keeps unpushed"           present unpushed
check "apply keeps locked"             present locked
check "apply keeps outside"            test -d "$ROOT/outside"
check "apply keeps main checkout"      test -d "$R/.git"
check "apply prunes gone registration" bash -c '! git -C "$0" worktree list | rg -q "\.worktrees/gone"' "$R"
check "apply keeps branch of removed"  git -C "$R" rev-parse -q --verify refs/heads/clean
exit $fail
