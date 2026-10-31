#!/bin/bash
# Remove whole git clones under ROOT that provably hold nothing a re-clone would lose.
#
# usage: prune-stale-clones.sh [--apply] [--days N] ROOT...
#   Default is report-only (prints "REMOVE <MB> <idle>d <path>" / "KEEP <reason> <path>").
#   Only direct children of ROOT that are real clones (.git is a directory) are considered.
#   A clone is REMOVEd only when ALL hold:
#     - it has a remote
#     - clean tree: no modified, staged or untracked files
#     - no ignored files (.env, .venv, .terraform... a re-clone would not restore them)
#     - no stashes, no extra worktrees
#     - every local branch is contained in some remote-tracking branch
#     - idle for N days (default 90): newest of last commit, index and HEAD reflog mtimes
#   Recoverable by re-cloning from the remote. Non-git dirs are never touched.
set -uo pipefail

if [[ ${1:-} == --classify ]]; then # internal: --classify <days> <repo>
  days=$2; r=${3%/}; cd "$r" 2>/dev/null || exit 0
  keep() { echo "KEEP $1 $r"; exit 0; }
  [[ -d .git ]] || exit 0
  # Read mtimes FIRST: git status can rewrite .git/index and make every clone look active.
  last=0
  for f in .git/index .git/logs/HEAD; do
    m=$(stat -c %Y "$f" 2>/dev/null || echo 0); ((m > last)) && last=$m
  done
  export GIT_OPTIONAL_LOCKS=0
  [[ -n $(git remote 2>/dev/null) ]] || keep "no-remote"
  [[ -z $(git status --porcelain --ignored 2>/dev/null | head -1) ]] || {
    [[ -n $(git status --porcelain 2>/dev/null | head -1) ]] && keep "dirty"
    keep "ignored-files"; }
  [[ -z $(git stash list 2>/dev/null | head -1) ]] || keep "stash"
  (($(git worktree list --porcelain | rg -c '^worktree') > 1)) && keep "worktrees"
  while read -r b; do
    [[ -n $(git branch -r --contains "$b" 2>/dev/null | head -1) ]] || keep "unpushed:${b#refs/heads/}"
  done < <(git for-each-ref --format='%(refname)' refs/heads)
  c=$(git log -1 --format=%ct --all 2>/dev/null || echo 0); ((c > last)) && last=$c
  idle=$((($(date +%s) - last) / 86400))
  ((idle >= days)) || keep "active(${idle}d)"
  echo "REMOVE $(du -sxm . | cut -f1) ${idle}d $r"
  exit 0
fi

apply=0; days=90
while [[ ${1:-} == --* ]]; do
  case $1 in
    --apply) apply=1; shift ;;
    --days) days=$2; shift 2 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done
(($#)) || { echo "usage: ${0##*/} [--apply] [--days N] ROOT..." >&2; exit 2; }

here=$(pwd -P)
for root in "$@"; do
  fd -H -I -d 1 -t d . "$root" --absolute-path 2>/dev/null | rg -v '/\.[^/]*/?$' || true
done | xargs -r -d '\n' -P8 -n1 "$0" --classify "$days" | sort -k1,1 -k2,2nr | while IFS= read -r line; do
  echo "$line"
  [[ $line == REMOVE* ]] && ((apply)) || continue
  path=${line#REMOVE * * }
  [[ $here == "$path" || $here == "$path"/* ]] && { echo "  skipped: cwd is inside"; continue; }
  rm -rf -- "$path" && echo "  removed"
done
