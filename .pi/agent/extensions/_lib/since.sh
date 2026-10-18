#!/usr/bin/env bash
# since.sh snap <root>                  print a tree id of the working tree (tracked + untracked,
#                                       honouring .gitignore) without touching the real index
# since.sh diff <root> <base> [args]    diff <base> tree against the tree as of now (git diff args ok)
set -u

tmpd=""
cleanup() { [[ -n $tmpd && -d $tmpd ]] && rm -rf -- "$tmpd"; tmpd=""; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

SNAP_TREE=""
# Sets SNAP_TREE (not run in a subshell, so the traps above own the temp dir).
snap() {
  local src
  tmpd=$(mktemp -d "${TMPDIR:-/tmp}/since.XXXXXX") || return 1
  src=$(git rev-parse --git-path index) || return 1
  [[ -f $src ]] && cp -- "$src" "$tmpd/index"    # empty repo: no index yet, git creates one
  GIT_INDEX_FILE=$tmpd/index git add -A >/dev/null || return 1
  SNAP_TREE=$(GIT_INDEX_FILE=$tmpd/index git write-tree) || return 1
  cleanup
}

wait_key() { { read -rsn1 -p "$1" </dev/tty; } 2>/dev/null || true; }

cmd=${1:-}; root=${2:-}
[[ -n $cmd && -n $root ]] || { echo "usage: since.sh snap|diff <root> ..." >&2; exit 2; }
shift 2
cd "$root" || exit 1

case "$cmd" in
  snap)
    snap || exit 1
    echo "$SNAP_TREE" ;;
  diff)
    base=${1:-}; [[ -n $base ]] || { echo "missing baseline" >&2; exit 2; }; shift
    for a in "$@"; do   # --output[=FILE] would make git write files
      case "$a" in --output|--output=*) echo "since: --output is not allowed"; wait_key 'press any key'; exit 2 ;; esac
    done
    snap || { echo "snapshot failed"; wait_key 'press any key'; exit 1; }
    now=$SNAP_TREE
    git diff --quiet "$base" "$now" "$@" 2>/dev/null; rc=$?
    if   [ $rc -eq 0 ]; then echo "No changes since baseline."; wait_key 'press any key'
    elif [ $rc -eq 1 ]; then git diff "$base" "$now" "$@" | LESS=-R ${SINCE_PAGER:-delta --side-by-side --paging=always}
    else git diff "$base" "$now" "$@"; wait_key 'git diff failed (baseline gc-ed? try /since reset) - press any key'
    fi
    exit 0 ;;
  *) echo "usage: since.sh snap|diff" >&2; exit 2 ;;
esac
