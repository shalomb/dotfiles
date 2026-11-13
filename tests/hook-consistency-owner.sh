#!/bin/bash
# Characterises .config/git/hooks/pre-commit-consistency-check: when a home file is not
# hardlinked to the repo, it names the checkout that owns the link and prints the restore command.
# Runs against fixture repos under a temporary HOME; never touches the real one.
set -euo pipefail

HOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.config/git/hooks/pre-commit-consistency-check"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT
export HOME="$FIX/home" GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
unset GIT_CONFIG_GLOBAL
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
MAIN=$HOME/.config/dotfiles
WT=$MAIN/.worktrees/feat
RESTORE='cd ~/.config/dotfiles && PYTHONPATH=src uv run python -m dotfile_manager export .config/bash/ .bashrc'

mkdir -p "$MAIN"
git init -q -b main "$MAIN"
echo 'export X=1' > "$MAIN/.bashrc"
git -C "$MAIN" add .bashrc
git -C "$MAIN" -c commit.gpgsign=false -c core.hooksPath=/dev/null commit -q -m init
git -C "$MAIN" worktree add -q -b feat "$WT"

run_hook() { (cd "$MAIN" && bash "$HOOK" 2>&1) || true; }
fail=0
expect() { # expect <description> <output> <needle>
  if [[ "$2" == *"$3"* ]]; then echo "ok   $1"; else echo "FAIL $1 (missing: $3)"; fail=1; fi
}
expect_absent() { # expect_absent <description> <output> <needle>
  if [[ "$2" != *"$3"* ]]; then echo "ok   $1"; else echo "FAIL $1 (unexpected: $3)"; fail=1; fi
}

ln "$MAIN/.bashrc" "$HOME/.bashrc"
out=$(run_hook)
expect 'consistent links pass' "$out" 'consistency validation passed'
expect_absent 'no owner noise when consistent' "$out" 'currently linked to'

rm "$HOME/.bashrc"
ln "$WT/.bashrc" "$HOME/.bashrc"
out=$(run_hook)
expect 'worktree-owned link is detected' "$out" 'Files not hardlinked'
expect 'owner checkout is named' "$out" "$HOME/.bashrc is currently linked to: $WT/.bashrc"
expect 'restore command is printed' "$out" "$RESTORE"

rm "$HOME/.bashrc"
echo 'export X=1' > "$HOME/.bashrc"
out=$(run_hook)
expect 'unowned file says so' "$out" 'is not linked to any checkout'
expect 'restore command printed for unowned file' "$out" "$RESTORE"

exit "$fail"
