#!/bin/bash
# shellcheck disable=SC2164  # this file wraps cd; failures propagate via $? / _cd_stop

#| - - cd -
function  - () { cd -; }
#| ~ - cd ~
alias ~='cd ~'

#| .. - cd ..
alias     ..='cdupto'
#| ... - cd ...
alias     ...='cd ../..'
#| ... - cd ...
alias     ....='cd ../../..'
#| cd.. - cd ..
alias     cd..='cdupto'
#| cd... - cd ..
alias     cd...='cd ../..'

# --- cd <github-url> ---------------------------------------------------------
# Resolves a GitHub URL to a local directory: locate the repo via `gum projects`
# (clone into $CD_REPO_ROOT if absent); pull URLs get a worktree for the PR head.

# _cd_parse_url URL -> "owner repo kind ref" (ref is "-" when absent)
function _cd_parse_url {
  local url="${1%%[?#]*}"
  local re='^(https?://(www\.)?github\.com/|git@github\.com:)([^/]+)/([^/]+)(/(.*))?$'
  [[ $url =~ $re ]] || return 1
  local owner="${BASH_REMATCH[3]}" repo="${BASH_REMATCH[4]%.git}" rest="${BASH_REMATCH[6]}"
  local kind=repo ref=-
  case "$rest" in
    pull/[0-9]*)   kind=pull;   ref="${rest#pull/}";   ref="${ref%%/*}" ;;
    issues/[0-9]*) kind=issues; ref="${rest#issues/}"; ref="${ref%%/*}" ;;
    tree/?*)       kind=tree;   ref="${rest#tree/}" ;;
    blob/?*)       kind=blob;   ref="${rest#blob/}" ;;
  esac
  echo "$owner $repo $kind $ref"
}

# cd is core: do not depend on helpers defined elsewhere in the dotfiles
function _cd_warn { if declare -F warn >/dev/null; then warn "$@"; else echo "$*" >&2; fi; }
function _cd_die  { if declare -F die  >/dev/null; then die "$@";  else echo "$*" >&2; fi; }
function _cd_tilde {
  if command -v tildeexpand >/dev/null 2>&1 || declare -F tildeexpand >/dev/null; then
    tildeexpand "$1"
  else
    echo "${1/#\~/$HOME}"
  fi
}

function _cd_is_github_url {
  [[ $1 == http*://github.com/* || $1 == http*://www.github.com/* || $1 == git@github.com:* ]]
}

# Overridable seams (tests replace these)
function _cd_projects { gum projects --format default; }
function _cd_clone { gh repo clone "$1" "$2" >&2; }   # owner/repo dest
function _cd_pr_head {                                # repo_dir N
  (cd "$1" && gh pr view "$2" --json headRefName -q .headRefName)
}

# _cd_normalize_remote URL -> lowercase https://github.com/owner/repo
function _cd_normalize_remote {
  local u="$1"
  u="${u/#git@github.com:/https://github.com/}"
  u="${u%/}"; u="${u%.git}"
  echo "${u,,}"
}

# _cd_locate_repo OWNER REPO -> local path (clones when missing)
function _cd_locate_repo {
  local owner="$1" repo="$2" line dir url
  local want; want="$(_cd_normalize_remote "https://github.com/$owner/$repo")"
  while read -r line; do
    dir="${line% (*}"; url="${line##* (}"; url="${url%)}"
    [[ $(_cd_normalize_remote "$url") == "$want" ]] && { echo "$dir"; return 0; }
  done < <(_cd_projects)

  dir="${CD_REPO_ROOT:-$HOME/oneTakeda}/$repo"
  if [[ ! -d $dir/.git ]]; then
    echo "cd: cloning $owner/$repo into $dir" >&2
    _cd_clone "$owner/$repo" "$dir" || return 1
  fi
  echo "$dir"
}

# _cd_worktree_for_branch REPO_DIR BRANCH -> existing worktree path
function _cd_worktree_for_branch {
  local wt="" line
  while read -r line; do
    case "$line" in
      "worktree "*) wt="${line#worktree }" ;;
      "branch refs/heads/$2") echo "$wt"; return 0 ;;
    esac
  done < <(git -C "$1" worktree list --porcelain)
  return 1
}

# _cd_pr_worktree REPO_DIR N -> worktree path for the PR head (created if absent)
function _cd_pr_worktree {
  local repo="$1" n="$2" head dir existing
  head="$(_cd_pr_head "$repo" "$n")" || head=""
  [[ -n $head ]] || head="pr-$n"

  _cd_worktree_for_branch "$repo" "$head" && return 0
  for existing in "$repo"/.worktrees/pr-"$n"-*/; do
    [[ -d $existing ]] && { echo "${existing%/}"; return 0; }
  done

  dir="$repo/.worktrees/pr-$n-${head//[^[:alnum:]]/-}"
  git -C "$repo" fetch -q origin "pull/$n/head" || return 1
  if git -C "$repo" show-ref -q --verify "refs/heads/$head"; then
    git -C "$repo" worktree add -q "$dir" "$head" >&2 || return 1
  else
    git -C "$repo" worktree add -q -b "$head" "$dir" FETCH_HEAD >&2 || return 1
  fi
  echo "$dir"
}

# _cd_url_resolve URL -> directory to cd into
function _cd_url_resolve {
  local owner repo kind ref repo_dir
  read -r owner repo kind ref < <(_cd_parse_url "$1") || {
    echo "cd: not a GitHub URL: $1" >&2; return 1; }
  repo_dir="$(_cd_locate_repo "$owner" "$repo")" || return 1
  case "$kind" in
    pull) _cd_pr_worktree "$repo_dir" "$ref" ;;
    tree) _cd_worktree_for_branch "$repo_dir" "$ref" || echo "$repo_dir" ;;
    blob)
      local f="${ref#*/}"
      if [[ -e $repo_dir/$f ]]; then
        if [[ -d $repo_dir/$f ]]; then echo "$repo_dir/$f"; else dirname "$repo_dir/$f"; fi
      else echo "$repo_dir"; fi ;;
    *) echo "$repo_dir" ;;
  esac
}

# --- cd internals ------------------------------------------------------------
# Resolution helpers share one protocol so `cd` stays a thin dispatcher:
#   - $REPLY holds the candidate path; helpers read and update it
#   - return 0   -> proceed with $REPLY
#   - return 100 -> stop; `cd` returns $_CD_STATUS
function _cd_stop { _CD_STATUS="${1:-0}"; return 100; }

function _cd_bookmarks_file { echo "${XDG_CONFIG_HOME:-$HOME/.config}/dirs"; }

function _cd_help_flags {
  local bookmarks; bookmarks="$(_cd_bookmarks_file)"
  cat <<-EOD
		  -B  - add current directory to bookmarks ($bookmarks)
		  -b  - cd to one of the bookmarked directories
		  -f  - cd to one of the frequently accessed directories
		  -k  - Pass args verbatim to the 'builtin cd'
		  -r  - cd to git toplevel directory
		  -s  - cd to dir held in selection/clipboard
		  -t  - cd to git toplevel directory
		  -o  - cd to item in the omni list (all possible completions)
		  -p  - cd to item in project list
		  -v  - cd to item on dirstack
	EOD
}

function _cd_help_qualifiers {
  cat <<-EOD
		  -c  - Create and then cd into directory
		  -u  - Find and cd into directory matching regex in ancestors
		  -d  - Find and cd into directory matching regex in children
		  -a  - Find and cd into directory that is a child of an ancestor
		  -k  - Use 'builtin cd' to change directory
	EOD
}

# _cd_bookmark_add [DIR] - prepend DIR to the bookmarks file, de-duplicated
function _cd_bookmark_add {
  local bookmarks; bookmarks="$(_cd_bookmarks_file)"
  local dir="${1:-$PWD}"

  { echo "$dir"
    [[ -e $bookmarks ]] && cat "$bookmarks"
  } | awk '!a[$0]++' > "$bookmarks.tmp"
  mv -- "$bookmarks.tmp" "$bookmarks"
}

# _cd_candidates FLAG - print candidate directories for a picker flag
function _cd_candidates {
  local bookmarks; bookmarks="$(_cd_bookmarks_file)"
  case "$1" in
    -s) echo "$(< ~/.cache/dir-selected)" ;;
    -b) cat "$bookmarks" ;;
    -f) gum dirs --format simple ;;
    -p) gum projects --format simple ;;
    -o)
      cat ~/.cache/dir-selected
      dirs -l -p
      gum dirs --format simple
      cat "$bookmarks"
      gum projects --format simple
    ;;
  esac
}

# _cd_dirstack_candidates - de-duplicate the dirstack (rebuilding it), print candidates
function _cd_dirstack_candidates {
  local dir candidates=()
  while read -r dir; do
    candidates+=( "$dir" )
  done < <(
    ( dirs -v; echo "$PWD" ) | awk '!a[$2]++ && $2 { print $2 }' | tac
  )
  dirs -c
  for dir in "${candidates[@]}"; do
    echo "cd $dir" >&2
    builtin cd "$(_cd_tilde "$dir")"
  done
  while read -r _ dir; do
    candidates+=( "$dir" )
  done < <( dirs -v )
  printf '%s\n' "${candidates[@]}"
}

# _cd_pick_flag FLAG QUERY... - interactive pick for -b/-f/-o/-p/-s/-v
function _cd_pick_flag {
  local flag="$1"; shift
  local query="${1:-}" candidates=()

  if [[ $flag == -v ]]; then
    # Output goes through a file: the helper rebuilds the dirstack, so it
    # cannot run in a subshell.
    local tmp; tmp="$(mktemp)"
    _cd_dirstack_candidates > "$tmp"
    mapfile -t candidates < "$tmp"; rm -f "$tmp"
  else
    mapfile -t candidates < <(_cd_candidates "$flag")
  fi

  REPLY=$(cdto "$query" 1 "${candidates[@]}")
  [[ -z $REPLY ]] && { _cd_stop 0; return; }
  if [[ $flag == -v ]]; then
    builtin cd "$REPLY"
    _cd_stop $?
    return
  fi
  return 0
}

# _cd_flag_first ARGS... - handle `cd -X ...`; REPLY is $1
function _cd_flag_first {
  local flag="${1:-}"
  case "$flag" in
    -h) _cd_help_flags; _cd_stop 0 ;;
    -B) shift; _cd_bookmark_add "$@"; _cd_stop 0 ;;
    -b|-f|-o|-p|-s|-v)
      shift
      _cd_pick_flag "$flag" "$@" ;;
    -k) shift; builtin cd "$@"; _cd_stop $? ;;
    -t|-r)
      REPLY=$(git rev-parse --show-toplevel)
      [[ -n $REPLY ]] || _cd_stop 0 ;;
    *) return 0 ;;   # e.g. `-`, `-1`, `-name`: handled by _cd_special
  esac
}

# _cd_ancestor_child REGEX - first child of any ancestor matching REGEX
function _cd_ancestor_child {
  local regex="$1" path="" basename="$PWD" d c
  while [[ $basename == /* ]]; do
    basename="${basename%/*}"
    for d in "$basename"/*/; do
      if [[ $d =~ $regex ]]; then path="$d" && break 2; fi
      c=( "$d"/"$regex"* )
      if [[ ${c[0]} != *\* ]]; then path="${c[0]}" && break 2; fi
    done
  done
  REPLY="$path"
}

# _cd_ancestor_named REGEX - nearest ancestor whose name matches REGEX (REPLY unchanged if none)
function _cd_ancestor_named {
  local regex="$1" basename="$PWD"
  while [[ $basename == /* ]]; do
    basename="${basename%/*}"
    if [[ ${basename##*/} =~ $regex ]]; then
      REPLY="$basename" && break
    fi
  done
}

# _cd_descendant REGEX - pick among descendant directories matching REGEX
function _cd_descendant {
  local regex="$1" candidates=() d
  while read -d $'\0' -r d; do
    candidates+=("$d")
  done < <(
    find . \( -name .git -prune \) -o \
      -type d -iregex ".*$regex.*" -print0 )
  REPLY=$(cdto "$regex" "1" "${candidates[@]}")
}

# _cd_qualified ARGS... - handle `cd PATH QUALIFIER`; REPLY is $1
function _cd_qualified {
  local path="${1:-}" qualifier="${2:-}"

  if [[ $qualifier == -* ]]; then
    case "$qualifier" in
      -h) _cd_help_qualifiers; _cd_stop 0 ;;
      -b) return 0 ;;   # TODO: unimplemented
      -a)
        _cd_ancestor_child "$path"
        if [[ -z $REPLY ]]; then
          _cd_warn "cd: No directories under ancestry match: $path"
          _cd_stop 0
        fi ;;
      -c) mkdir -pv "$path" ;;
      -d)
        _cd_descendant "$path"
        [[ -z $REPLY ]] && _cd_stop 0 ;;
      -u) _cd_ancestor_named "$path" ;;
      -k)
        builtin cd "$path"   # NOTE: only first arg, preserved from the original
        _cd_stop $? ;;
      *) return 0 ;;
    esac
    return
  fi

  if [[ -e $path ]] && [[ -e $qualifier ]]; then
    _cd_die "ERROR: Multiple paths match patterns."
    printf ' - %q\n' "$@"
    _cd_stop 1
    return
  fi

  # Arg 2 replaces arg 1 in $PWD
  local newpath="${PWD//$path/$qualifier}"
  if [[ $newpath == "$PWD" ]]; then
    _cd_warn "ERROR: Substitution of '$qualifier' with '$path' in '$PWD' failed."
    _cd_stop 1
    return
  fi
  REPLY="$newpath"
}

# _cd_shorthand PATH - expand /v/l/a/n to a directory via glob; REPLY is the result
function _cd_shorthand {
  local path="${1%/}"
  # /v/l/a/n becomes /v*/l*/a*/n*
  path="${path//\//*\/}"
  path="${path//[^[:alnum:]\/]/*}"
  path="${path#\*}*"

  local nullglob=0
  shopt -q nullglob && nullglob=1
  [[ $nullglob == 1 ]] || shopt -s nullglob
  local dirs
  # shellcheck disable=SC2206  # intentional glob expansion
  dirs=($path)
  [[ $nullglob == 1 ]] || shopt -u nullglob

  if (( ${#dirs[@]} == 1 )) && [[ "${dirs[0]%/}" != "${path%/}" ]]; then
    REPLY="${dirs[0]}"
  elif (( ${#dirs[@]} >= 1 )); then
    REPLY="$(cdto "" 1 "${dirs[@]}")"
  else
    _cd_warn "No dirs match: $path"
    _cd_stop 0
  fi
}

# _cd_resolves_literally PATH - true if PATH exists as given or under $CDPATH
function _cd_resolves_literally {
  local path="${1%/}" cdpaths p
  [[ -e $path ]] && return 0
  [[ -n ${CDPATH:-} ]] || return 1
  IFS=: read -r -a cdpaths <<<"$CDPATH"
  for p in "${cdpaths[@]}"; do
    [[ -e "$(_cd_tilde "$p/$path")" ]] && return 0
  done
  return 1
}

# _cd_special - `-`, `~`, `+`, dirstack refs and shorthand; REPLY is the arg
function _cd_special {
  local path="$REPLY" alnum='[[:alnum:]]'

  if [[ $path == '-' ]]; then
    if [[ -z ${OLDPWD:-} ]]; then echo "cd: OLDPWD not set" >&2; _cd_stop 1; return; fi
    builtin cd "$OLDPWD"; _cd_stop $?

  elif [[ -z $path ]] || [[ $path =~ ^\~/?$ ]]; then
    builtin cd ~; _cd_stop $?

  elif [[ $path =~ ^\+$ ]]; then
    cd -v && { _cd_stop 0; return; }

  elif [[ $path =~ ^[+\-][[:alpha:]]+ ]]; then
    REPLY=$(dirs -l -v | grep -iP "${path##+}" | awk 'NR==1{print $2}')

  elif [[ $path =~ ^[+\-][0-9]+$ ]]; then
    if builtin dirs "$path" >/dev/null; then
      path="$( _cd_tilde "$( builtin dirs "$path" )" )"
      # Plain cd so already existing stack items are not duplicated
      echo >&2 "+ cd $path"
      builtin cd "$path"
      _cd_stop $?
    else
      _cd_stop 0
    fi

  # TODO Make this regex more robust - for shorter cases
  elif [[ $path =~ ^/?$alnum/?$|^/?$alnum/$alnum/?$|^/?$alnum/$alnum/ ]] \
    && ! _cd_resolves_literally "$path"; then
    _cd_shorthand "$path"
  fi
}

# _cd_finish PATH - normalise files/devices, check existence, then pushd
function _cd_finish {
  local path="${1:-}"

  if [[ -e ${path%/} ]]; then
    path="${path%/}"
    if [[ -b $path ]]; then
      path="$(findmnt -no 'TARGET' -S "$path" | head -n1)"
    elif [[ ! -d $path ]]; then
      local dir="${path%/*}"
      # $path is in $PWD
      [[ ${dir%/} == "${path%/}" ]] && return
      echo "cd: $path: not a directory. using parent directory: $dir" >&2
      path=$dir
    fi

  elif [[ ${PWD%/} == "${path%/}" ]]; then
    return

  elif [[ ! -d $path ]]; then
    # $path may be an item in $CDPATH
    if [[ -n ${CDPATH:-} ]]; then
      local cdpaths p _path
      IFS=: read -r -a cdpaths <<<"$CDPATH"
      for p in "${cdpaths[@]}"; do
        _path="$(_cd_tilde "$p/$path")"
        if [[ -e $_path ]]; then
          # may be a non-directory: re-enter cd for the special handling
          cd "$_path"
          return
        fi
      done
    fi
    echo "cd: $path: No such file or directory. Append -c to create." >&2
    return 1
  fi

  builtin pushd -- "$path" >/dev/null
}

#| cd - smarter cd
# Thin wrapper: running the body on the left of `||` keeps `set -e` from killing
# the caller on the internal "stop" return code used by the helpers.
function cd {
  local rc=0
  _cd_main "$@" || rc=$?
  return "$rc"
}

function _cd_main {
  local path="${1:-}" qualifier="${2:-}" rc
  REPLY="$path"

  # Builtin options: -L -P -e -@ (combinable) go straight to the builtin
  if [[ $path =~ ^-[LPe@]+$ ]]; then
    builtin cd "$@"; return
  # `--` ends option parsing: the next arg is a literal path
  elif [[ $path == -- ]]; then
    shift; _cd_finish "${1:-$HOME}"; return
  fi

  if _cd_is_github_url "$path"; then
    REPLY="$(_cd_url_resolve "$path")" || return 1
    [[ -n $REPLY ]] || return 1
    path="$REPLY"
  elif [[ $path == -* ]]; then
    _cd_flag_first "$@"; rc=$?
    (( rc == 100 )) && return "$_CD_STATUS"
  elif [[ -n $qualifier ]]; then
    _cd_qualified "$@"; rc=$?
    (( rc == 100 )) && return "$_CD_STATUS"
  fi

  _cd_special; rc=$?
  (( rc == 100 )) && return "$_CD_STATUS"

  _cd_finish "$REPLY"
}

#| cd- - cd to -
function cd- {
  cd -
}

#| cdg - cd to repo root
alias cdg='cd $(git rev-parse --show-toplevel)'

#| cdupto - cd upwards to first match
function cdupto() {
  local part="$1"
  local basename="$PWD"

  # No args - cd ..
  if [[ -z $part ]]; then
    cd .. && return
  fi

  # Arg is a shorthand path like /v/l/a/n
  if [[ $part =~ /?[[:alnum:]]/[[:alnum:]]/? ]]; then
    cd "$part" || return
  fi

  # Arg is part
  while [[ $basename == /* ]]; do
    basename="${basename%/*}"
    if [[ ${basename##*/} =~ $part ]]; then
      cd "$basename" && return
    fi
  done
}

function cdto {
  local query="${1:-}"; shift
  local col="${1:-1}"; shift
  local candidates=("$@")
  local dir

  while [[ -z $dir ]]; do
    local block
    block="$(
      printf "%s\n" "${candidates[@]}" |
        fzf --bind='ctrl-s:toggle-sort' \
          --header 'Select a directory' \
          --cycle \
          --sort \
          --expect=ctrl-e \
          --height 50% \
          --no-mouse \
          --print-query \
          --query="$query" \
          --reverse \
          --tiebreak=index | awk -v c="$col" '{ print $c }'
    )"

    [[ -z $block ]] && return

    # Search seed
    query=$( sed -n '1p'   <<<"$block" );
    # Key modifier
    mod=$(   sed -n '2p'   <<<"$block" ); mod="${mod##ctrl-}"
    # Selected items
    items=$( sed -n '3,$p' <<<"$block" );

    items="${items%$'\n'}"
    items="${items##*$'\n'}"

    # _cd_warn "query:[$query] mod:[$mod] items:[$items]"
    # _cd_warn "selected: $selected"

    if [[ -n $items ]]; then
      if [[ -n $mod ]]; then
        case "$mod" in
          c|esc) return
          ;;
          e)
            local tmpfile; tmpfile="$(mktemp)"
            echo "$items" > "$tmpfile"
            "${EDITOR:-$(type -P editor)}" "$tmpfile" > /dev/tty
            dir="$(< "$tmpfile")"
            rm -f "$tmpfile"
          ;;
        esac
      else
        dir="$items"
      fi
    fi
  done

  [[ -z $dir && -z $query ]] && return

  _cd_tilde "$dir"
}

# TODO
# Trigger update hooks
#  tc - cd pan-net/leave fails
# shopt -s cdspell
# complete -d cd  # only suggest directories
# ... to directory adjacent to any ancestor directory
# shopt -s autocd
#
# https://github.com/haya14busa/enhancd

# vim:ts=2
