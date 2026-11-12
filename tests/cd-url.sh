#!/bin/bash
# Behavioural tests for `cd <github-url>` helpers in .config/bash/enabled/cd.sh
# Hermetic: local bare repo as "origin"; gum/gh replaced by shell functions.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/.config/bash/enabled/cd.sh"

pass=0; fail=0
check() { # name expected actual
  if [[ "$2" == "$3" ]]; then pass=$((pass+1)); else
    fail=$((fail+1)); printf 'FAIL %s\n  want: %s\n  got:  %s\n' "$1" "$2" "$3"; fi
}

# --- _cd_parse_url -----------------------------------------------------------
check parse-pull "o r pull 32" "$(_cd_parse_url https://github.com/o/r/pull/32)"
check parse-pull-files "o r pull 32" "$(_cd_parse_url https://github.com/o/r/pull/32/files)"
check parse-repo "o r repo -" "$(_cd_parse_url https://github.com/o/r)"
check parse-repo-git "o r repo -" "$(_cd_parse_url https://github.com/o/r.git)"
check parse-tree "o r tree feat/x" "$(_cd_parse_url https://github.com/o/r/tree/feat/x)"
check parse-blob "o r blob main/a/b.txt" "$(_cd_parse_url https://github.com/o/r/blob/main/a/b.txt)"
check parse-ssh "o r repo -" "$(_cd_parse_url git@github.com:o/r.git)"
_cd_parse_url https://example.com/o/r >/dev/null 2>&1; check parse-reject 1 $?
_cd_parse_url ./local/dir >/dev/null 2>&1; check parse-reject-path 1 $?

# --- fixtures ----------------------------------------------------------------
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
git init -q --bare "$T/origin.git"
git clone -q "$T/origin.git" "$T/seed" 2>/dev/null
( cd "$T/seed" && git commit -q --allow-empty -m init && git branch -M main && git push -q origin main \
  && git checkout -q -b feat/cool-thing && git commit -q --allow-empty -m pr \
  && git push -q origin HEAD:refs/pull/5/head )
export CD_REPO_ROOT="$T/repos"; mkdir -p "$CD_REPO_ROOT"

_cd_projects() { [[ -d $CD_REPO_ROOT/r ]] && echo "$CD_REPO_ROOT/r (https://github.com/o/r.git)"; }
_cd_clone() { git clone -q "$T/origin.git" "$2" 2>/dev/null; }          # owner/repo dest
_cd_pr_head() { echo "feat/cool-thing"; }                                # repo_dir N

# --- _cd_locate_repo ---------------------------------------------------------
got="$(_cd_locate_repo o r)"
check locate-clones-when-missing "$CD_REPO_ROOT/r" "$got"
[[ -d $CD_REPO_ROOT/r/.git ]] && r=0 || r=1
check locate-clone-exists 0 "$r"
check locate-finds-existing "$CD_REPO_ROOT/r" "$(_cd_locate_repo o r)"

# --- _cd_pr_worktree ---------------------------------------------------------
wt="$(_cd_pr_worktree "$CD_REPO_ROOT/r" 5)"
check wt-path "$CD_REPO_ROOT/r/.worktrees/pr-5-feat-cool-thing" "$wt"
check wt-branch "feat/cool-thing" "$(git -C "$wt" branch --show-current)"
check wt-reused "$wt" "$(_cd_pr_worktree "$CD_REPO_ROOT/r" 5)"

# --- _cd_url_resolve ---------------------------------------------------------
check resolve-pull "$wt" "$(_cd_url_resolve https://github.com/o/r/pull/5)"
check resolve-repo "$CD_REPO_ROOT/r" "$(_cd_url_resolve https://github.com/o/r)"

# --- integration: cd <url> ---------------------------------------------------
cd "$T" || exit 1
cd https://github.com/o/r/pull/5 >/dev/null 2>&1 || true
check cd-url-lands-in-worktree "$wt" "$PWD"

echo "cd-url: $pass passed, $fail failed"
(( fail == 0 ))
