#!/bin/bash
# Remove git worktrees under <repo>/.worktrees that provably hold no unique work.
#
# usage: prune-worktrees.sh [--apply] ROOT...
#   Default is report-only. A worktree is REMOVEd only when ALL hold:
#     - it lives under <main-checkout>/.worktrees/ (never the main checkout
#       or worktrees placed elsewhere)
#     - it is not locked
#     - `git status` is clean (no modified, staged or untracked files)
#     - HEAD is contained in some remote-tracking branch (nothing unpushed)
#   Branches are never deleted, so removal is recoverable with
#   `git worktree add <path> <branch>`. Registrations whose directory is
#   already gone are pruned with `git worktree prune`.
set -uo pipefail

apply=0
[[ ${1:-} == --apply ]] && { apply=1; shift; }
(($#)) || { echo "usage: ${0##*/} [--apply] ROOT..." >&2; exit 2; }

is_locked() { # is_locked <main> <worktree>: true if that worktree's own stanza has a "locked" line
  git -C "$1" worktree list --porcelain | awk -v wt="$2" '
    /^worktree /{cur=substr($0,10)}
    /^locked/{if(cur==wt) found=1}
    END{exit !found}'
}

classify() { # classify <main> <worktree> -> prints "REMOVE" or "KEEP <reason>"
  local main=$1 wt=$2 head
  is_locked "$main" "$wt" && { echo "KEEP locked"; return; }
  [[ -n $(git -C "$wt" status --porcelain 2>/dev/null) ]] && { echo "KEEP uncommitted changes"; return; }
  head=$(git -C "$wt" rev-parse HEAD 2>/dev/null) || { echo "KEEP unreadable HEAD"; return; }
  [[ -n $(git -C "$main" branch -r --contains "$head" 2>/dev/null) ]] || { echo "KEEP unpushed commits"; return; }
  echo REMOVE
}

for root in "$@"; do
  while IFS= read -r gitdir; do
    main=$(dirname "$gitdir")
    [[ -d $main/.worktrees ]] || continue
    ((apply)) && git -C "$main" worktree prune
    while IFS= read -r wt; do
      [[ $wt == "$main"/.worktrees/* ]] || continue
      [[ -d $wt ]] || continue
      verdict=$(classify "$main" "$wt")
      size=$(du -sh "$wt" 2>/dev/null | cut -f1)
      echo "${verdict%% *} $wt (${size}) ${verdict#* }" | sed 's/ REMOVE$//; s/ KEEP$//'
      if ((apply)) && [[ $verdict == REMOVE ]]; then
        git -C "$main" worktree remove "$wt" || echo "  failed to remove $wt" >&2
      fi
    done < <(git -C "$main" worktree list --porcelain | awk '/^worktree /{print substr($0,10)}')
  done < <(fd -H -I -t d -d 3 -E node_modules -E .worktrees '^\.git$' "$root")
done
