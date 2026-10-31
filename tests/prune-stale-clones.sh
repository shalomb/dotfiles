#!/bin/bash
# Characterises scripts/prune-stale-clones.sh against fixture repos (never touches real clones).
# shellcheck disable=SC2329  # fns are called via check()
set -uo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/prune-stale-clones.sh"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT
export HOME="$FIX/home" XDG_CONFIG_HOME="$FIX/home/.config" GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
unset GIT_CONFIG_GLOBAL
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
mkdir -p "$HOME"
ROOT=$FIX/root
mkdir -p "$ROOT"
OLD="200 days ago"
OLDG="$(date -d "$OLD" +%s) +0000"

mk() { # mk <name>: clone with one old, pushed commit, all file mtimes aged
  git init -q --bare "$FIX/$1.git"
  git clone -q "$FIX/$1.git" "$ROOT/$1" 2>/dev/null
  GIT_AUTHOR_DATE="$OLDG" GIT_COMMITTER_DATE="$OLDG" git -C "$ROOT/$1" commit -q --allow-empty -m init
  git -C "$ROOT/$1" branch -M main
  git -C "$ROOT/$1" push -q origin main 2>/dev/null
}
age() { find "$ROOT/$1/.git" -exec touch -d "$OLD" {} +; }
for n in stale fresh dirty unpushed stash ignored noremote; do mk $n; done
echo f >"$ROOT/stale/tracked"
git -C "$ROOT/stale" add tracked
GIT_AUTHOR_DATE="$OLDG" GIT_COMMITTER_DATE="$OLDG" git -C "$ROOT/stale" commit -q -m t
git -C "$ROOT/stale" push -q origin main
echo x >"$ROOT/dirty/new.txt"
git -C "$ROOT/unpushed" checkout -q -b wip
GIT_AUTHOR_DATE="$OLDG" GIT_COMMITTER_DATE="$OLDG" git -C "$ROOT/unpushed" commit -q --allow-empty -m wip
echo s >"$ROOT/stash/f"
git -C "$ROOT/stash" add f
git -C "$ROOT/stash" stash -q
printf '.env\n' >"$ROOT/ignored/.gitignore"
git -C "$ROOT/ignored" add .gitignore
GIT_AUTHOR_DATE="$OLDG" GIT_COMMITTER_DATE="$OLDG" git -C "$ROOT/ignored" commit -q -m ig
git -C "$ROOT/ignored" push -q origin main
echo secret >"$ROOT/ignored/.env"
git -C "$ROOT/noremote" remote remove origin
mkdir -p "$ROOT/plain-data"
echo d >"$ROOT/plain-data/x"
for n in stale dirty unpushed stash ignored noremote; do age $n; done # fresh stays recent: new commit now
git -C "$ROOT/fresh" commit -q --allow-empty -m now
git -C "$ROOT/fresh" push -q origin main 2>/dev/null

fail=0
check() { if "${@:2}"; then echo "ok   $1"; else
  echo "FAIL $1"
  fail=1
fi; }
out() { "$SCRIPT" "$@" 2>&1; }
verdict() { out --days 90 "$ROOT" | rg "/$1\$"; }

check "stale clean pushed clone is REMOVE" bash -c "$(declare -f verdict out); SCRIPT='$SCRIPT' ROOT='$ROOT'; verdict stale | rg -q '^REMOVE'"
check "recently active clone is kept" bash -c "$(declare -f verdict out); SCRIPT='$SCRIPT' ROOT='$ROOT'; verdict fresh | rg -q '^KEEP.*active'"
check "dirty clone is kept" bash -c "$(declare -f verdict out); SCRIPT='$SCRIPT' ROOT='$ROOT'; verdict dirty | rg -q '^KEEP.*dirty'"
check "unpushed branch is kept" bash -c "$(declare -f verdict out); SCRIPT='$SCRIPT' ROOT='$ROOT'; verdict unpushed | rg -q '^KEEP.*unpushed'"
check "stash is kept" bash -c "$(declare -f verdict out); SCRIPT='$SCRIPT' ROOT='$ROOT'; verdict stash | rg -q '^KEEP.*stash'"
check "ignored files (e.g. .env) are kept" bash -c "$(declare -f verdict out); SCRIPT='$SCRIPT' ROOT='$ROOT'; verdict ignored | rg -q '^KEEP.*ignored'"
check "clone without remote is kept" bash -c "$(declare -f verdict out); SCRIPT='$SCRIPT' ROOT='$ROOT'; verdict noremote | rg -q '^KEEP.*remote'"
check "non-git dirs are not listed" bash -c "! '$SCRIPT' --days 90 '$ROOT' 2>&1 | rg -q plain-data"
check "--keep protects matching names"       bash -c "'$SCRIPT' --days 90 --keep 'sta.e|nothing' '$ROOT' 2>&1 | rg -q '^KEEP protected .*/stale\$'"
check "--keep still removes non-matching"    bash -c "'$SCRIPT' --days 90 --keep 'zzz' '$ROOT' 2>&1 | rg -q '^REMOVE .*/stale\$'"
out --days 90 "$ROOT" >/dev/null
check "dry-run removes nothing" test -d "$ROOT/stale" -a -d "$ROOT/dirty"
out --apply --days 90 "$ROOT" >/dev/null
check "--apply removes the stale clone" test ! -d "$ROOT/stale"
check "--apply keeps every other clone" test -d "$ROOT/fresh" -a -d "$ROOT/dirty" -a -d "$ROOT/unpushed" -a -d "$ROOT/stash" -a -d "$ROOT/ignored" -a -d "$ROOT/noremote" -a -d "$ROOT/plain-data"
exit $fail
