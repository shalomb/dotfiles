#!/usr/bin/env bash
# changes.sh — what changed in the working tree vs a base (staged + unstaged + untracked,
# honouring .gitignore). The real index is never touched: everything runs on a temp index copy.
#
#   diff   <root> [ref]                 stat + full diff vs ref (default HEAD)
#   files  <root> <mode> <noise>        status<TAB>adds<TAB>dels<TAB>path   (noise: hide|show)
#   hidden <root> <mode>                number of test/generated files hidden by the filter
#   file   <root> <mode> <path>         one file's diff
#   sig    <root> <mode>                checksum of the current diff (change detection)
#   cycle-base <root> <state>           session -> head -> branch (session only if tree known)
#   tree   <root> <mode> <noise> <state>  foldable rows: file rows, plus hunk rows under open files
#   hunk   <root> <mode> <path> <n>     one hunk of a file
#   toggle-open|open-all|close-all      fold state (<state>/open)
#   ui     <root> [mode]                interactive fzf panel (foldable file/hunk tree + diff preview)
#   mode = head | branch (merge-base with default branch) | session ($CHANGES_SESSION_TREE) | any ref
# Env: CHANGES_PLAIN=1 no delta/colour (tests) · CHANGES_PORT fzf --listen port for live refresh
#      CHANGES_SESSION_TREE tree id taken at session start (enables the session base)
#      CHANGES_MARKED file collecting paths marked (ctrl-a) for the next pi prompt
set -u

S=$(readlink -f "$0")   # always re-invoked as `bash "$S"`: no exec bit needed
MARKED=${CHANGES_MARKED:-${XDG_RUNTIME_DIR:-/tmp}/pi-changes-marked}

tmpd=""; bg=""; state=""; port=""
cleanup() { [[ -n $tmpd && -d $tmpd ]] && rm -rf -- "$tmpd"; tmpd=""; }
finish() { cleanup; [[ -n $bg ]] && kill "$bg" 2>/dev/null; [[ $cmd == ui && -n $state && -d $state ]] && rm -rf -- "$state" "${TMPDIR:-/tmp}/changes-refresh-${port:-x}"; }
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

cmd=${1:-}; root=${2:-}
[[ -n $cmd && -n $root ]] || { echo "usage: changes.sh <cmd> <root> ..." >&2; exit 2; }
shift 2
cd "$root" || exit 1

BASE=""
resolve_base() {
  local mode=$1 ref="" d mb
  case "$mode" in
    head) ref=HEAD ;;
    session)
      if [[ -n ${CHANGES_SESSION_TREE:-} ]] && BASE=$(git rev-parse --verify -q "$CHANGES_SESSION_TREE^{tree}"); then return; fi
      ref=HEAD ;;
    branch)
      ref=HEAD
      for d in "$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null)" origin/main origin/master main master; do
        [[ -n $d ]] && git rev-parse --verify -q "$d^{commit}" >/dev/null || continue
        mb=$(git merge-base HEAD "$d" 2>/dev/null) && { ref=$mb; break; }
      done ;;
    *) ref=$mode ;;
  esac
  BASE=$(git rev-parse --verify -q "$ref^{commit}") || BASE=$(git mktree </dev/null)   # unborn HEAD / bad ref
}

stage() {
  local src
  tmpd=$(mktemp -d "${TMPDIR:-/tmp}/changes.XXXXXX") || return 1
  src=$(git rev-parse --git-path index)
  [[ -f $src ]] && cp -- "$src" "$tmpd/index"
  export GIT_INDEX_FILE=$tmpd/index
  git add -A >/dev/null 2>&1
}
unstage() { unset GIT_INDEX_FILE; cleanup; }

is_noise() {
  local p=$1
  [[ $p =~ (^|/)(tests?|__tests__|spec|__snapshots__)/ ||
     $p =~ \.(test|spec)\.[A-Za-z]+$ || $p =~ _test\.(go|py|rs)$ || $p =~ (^|/)test_[^/]*\.py$ ||
     $p =~ (^|/)(node_modules|dist|build|vendor)/ || $p =~ \.min\.(js|css)$ ||
     $p =~ (^|/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|uv\.lock|poetry\.lock|go\.sum)$ ||
     $p =~ \.generated\. || $p =~ _pb2?\.py$ || $p =~ \.pb\.go$ || $p =~ \.snap$ ]]
}

G=(git -c core.quotepath=off)

emit_diff() {   # [paths...]
  local w=${FZF_PREVIEW_COLUMNS:-${COLUMNS:-100}}
  if [[ -n ${CHANGES_PLAIN:-} ]]; then
    "${G[@]}" diff --cached "$BASE" -- "$@"
  else
    "${G[@]}" -c color.ui=always diff --cached "$BASE" -- "$@" |
      delta --paging=never ${SIDE:+--side-by-side} --width "$w"
  fi
}

file_diff() {   # <mode> <path>
  resolve_base "$1"; stage || return 1
  emit_diff "$2"
  unstage
}

list_files() {   # <mode> <noise>
  local mode=$1 noise=$2 s p a d
  declare -A st=()
  resolve_base "$mode"; stage || return 1
  while IFS=$'\t' read -r s p; do st[$p]=$s; done < <("${G[@]}" diff --cached --name-status --no-renames "$BASE")
  while IFS=$'\t' read -r a d p; do
    [[ $noise == hide ]] && is_noise "$p" && continue
    printf '%s\t%s\t%s\t%s\n' "${st[$p]:-M}" "$a" "$d" "$p"
  done < <("${G[@]}" diff --cached --numstat --no-renames "$BASE")
  unstage
}

# ---- cheap signature + result cache -------------------------------------------------
# sig = HEAD + base + `git status` + (mtime,size) of each listed path. Files modified in the last
# few seconds are content-hashed too (racy-git rule: same size + same mtime tick can hide an edit).
# No temp index is built, so polling is cheap; files/file results are cached under that sig.
cheap_sig() {   # <mode>
  local now; now=$(date +%s)
  resolve_base "$1"
  {
    printf 'base=%s head=%s side=%s plain=%s w=%s\n' "$BASE" "$(git rev-parse -q --verify HEAD 2>/dev/null)" \
      "${SIDE:-}" "${CHANGES_PLAIN:-}" "${FZF_PREVIEW_COLUMNS:-${COLUMNS:-}}"
    GIT_OPTIONAL_LOCKS=0 git status --porcelain=v1 -z --untracked-files=all --no-renames 2>/dev/null |
      while IFS= read -r -d '' e; do
        p=${e:3}; printf '%s\n' "$e"
        if [[ -f $p ]]; then
          read -r sz mt < <(stat -c '%s %.9Y' -- "$p" 2>/dev/null || stat -f '%z %m' -- "$p")
          printf '%s %s %s\n' "$p" "$sz" "$mt"
          ((now - ${mt%%.*} < 3)) && cksum <"$p"
        fi
      done
  } | cksum | tr -d ' '
}

CACHE=""
cache_dir() {
  [[ -n $CACHE ]] && return
  CACHE=${CHANGES_CACHE:-${TMPDIR:-/tmp}/changes-cache-$(id -u)}/$(printf '%s' "$root" | cksum | tr -d ' ')
  mkdir -p -- "$CACHE" 2>/dev/null
}
cached() {   # cached <key-extra> <mode> <cmd...>: run <cmd...> unless a result for this sig exists
  local extra=$1 mode=$2; shift 2
  cache_dir
  local f="$CACHE/$(printf '%s|%s|%s' "$extra" "$mode" "$(cheap_sig "$mode")" | cksum | tr -d ' ')"
  if [[ -f $f ]]; then cat -- "$f"; return; fi
  "$@" >"$f.tmp.$$" && mv -f -- "$f.tmp.$$" "$f"; rm -f -- "$f.tmp.$$"
  cat -- "$f" 2>/dev/null
  find "$CACHE" -type f -mmin +30 -delete 2>/dev/null
}

hunk_list() {   # <mode> <path>: one "@@ L<start> <context>" line per hunk
  local line
  resolve_base "$1"; stage || return 1
  "${G[@]}" diff --cached --no-color "$BASE" -- "$2" | while IFS= read -r line; do
    if [[ $line =~ ^@@\ -[0-9,]+\ \+([0-9]+)(,[0-9]+)?\ @@\ ?(.*)$ ]]; then
      printf '@@ L%s %s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[3]}"
    fi
  done
  unstage
}

hunk_diff() {   # <mode> <path> <n>: file header + only the nth hunk, rendered like emit_diff
  local line n=0 out="" w=${FZF_PREVIEW_COLUMNS:-${COLUMNS:-100}}
  resolve_base "$1"; stage || return 1
  while IFS= read -r line; do
    [[ $line == @@* ]] && n=$((n + 1))
    if ((n == 0 || n == $3)); then out+=$line$'\n'; fi
  done < <("${G[@]}" diff --cached --no-color "$BASE" -- "$2")
  unstage
  if [[ -n ${CHANGES_PLAIN:-} ]]; then printf '%s' "$out"
  else printf '%s' "$out" | delta --paging=never ${SIDE:+--side-by-side} --width "$w"; fi
}

tree_rows() {   # <mode> <noise> <state>: display<TAB>path<TAB>hunk-index
  local mode=$1 noise=$2 st=$3 s a d p mark open now mt n h
  now=$(date +%s)
  while IFS=$'\t' read -r s a d p; do
    open=0; grep -qxF -- "$p" "$st/open" 2>/dev/null && open=1
    mark=" "; mt=$(stat -c %Y -- "$p" 2>/dev/null || echo 0); ((now - mt < 30)) && mark="●"
    printf '%s %s %s +%s -%s %s\t%s\t0\n' "$([[ $open == 1 ]] && echo ▾ || echo ▸)" "$mark" "$s" "$a" "$d" "$p" "$p"
    if [[ $open == 1 ]]; then
      n=0
      while IFS= read -r h; do
        n=$((n + 1)); printf '      %s\t%s\t%s\n' "$h" "$p" "$n"
      done < <(cached "hunks|$p" "$mode" hunk_list "$mode" "$p")
    fi
  done < <(cached "files|$noise" "$mode" list_files "$mode" "$noise")
}

state_get() { local v=""; [[ -f $state/$1 ]] && v=$(<"$state/$1"); echo "${v:-$2}"; }

case "$cmd" in
  diff)
    resolve_base "${1:-HEAD}"; stage || exit 1
    if git diff --cached --quiet "$BASE" 2>/dev/null; then
      echo "No changes since ${1:-HEAD}."
    else
      git diff --cached --stat="${COLUMNS:-100}" "$BASE"; echo
      emit_diff
    fi
    unstage ;;

  tree) tree_rows "${1:-head}" "${2:-hide}" "${3:?state}" ;;

  hunk) cached "hunk|${2:?path}|${3:?n}" "${1:-head}" hunk_diff "${1:-head}" "$2" "$3" ;;

  toggle-open)
    state=${1:?state}; p=${2:?path}
    if grep -qxF -- "$p" "$state/open" 2>/dev/null; then
      grep -vxF -- "$p" "$state/open" >"$state/open.tmp"; mv -f "$state/open.tmp" "$state/open"
    else echo "$p" >>"$state/open"; fi ;;

  open-all)  state=${1:?state}; bash "$S" files "$root" "$(state_get base head)" "$(state_get noise hide)" | cut -f4 >"$state/open" ;;
  close-all) state=${1:?state}; : >"$state/open" ;;

  files) cached "files|${2:-hide}" "${1:-head}" list_files "${1:-head}" "${2:-hide}" ;;

  hidden)
    n=0
    while IFS= read -r p; do [[ -n $p ]] && is_noise "$p" && n=$((n + 1)); done < <(list_files "${1:-head}" show | cut -f4)
    echo "$n" ;;

  file) cached "file|${2:?path}" "${1:-head}" file_diff "${1:-head}" "$2" ;;

  sig) cheap_sig "${1:-head}" ;;

  cycle-base)
    state=${1:?state}
    order=(); [[ -n ${CHANGES_SESSION_TREE:-} ]] && order+=(session); order+=(head branch)
    cur=$(state_get base head); next=${order[0]}
    for i in "${!order[@]}"; do [[ ${order[i]} == "$cur" ]] && next=${order[(i + 1) % ${#order[@]}]}; done
    echo "$next" >"$state/base" ;;

  toggle-noise)
    state=${1:?state}
    if [[ $(state_get noise hide) == hide ]]; then echo show >"$state/noise"; else echo hide >"$state/noise"; fi ;;

  toggle-side)
    state=${1:?state}
    if [[ $(state_get side off) == off ]]; then echo on >"$state/side"; else echo off >"$state/side"; fi ;;

  mark)
    p=$root/${2:?path}
    if grep -qxF -- "$p" "$MARKED" 2>/dev/null; then
      grep -vxF -- "$p" "$MARKED" >"$MARKED.tmp"; mv -f "$MARKED.tmp" "$MARKED"
    else
      echo "$p" >>"$MARKED"
    fi ;;

  poke)   # poke <root> <port>: ask a running panel to refresh now
    port=${1:?port}; body=$(<"${TMPDIR:-/tmp}/changes-refresh-$port") || exit 1
    exec 3<>"/dev/tcp/127.0.0.1/$port" || exit 1
    printf 'POST / HTTP/1.1\r\nHost: x\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s' "${#body}" "$body" >&3
    cat <&3 >/dev/null ;;

  ui-list)
    state=${1:?state}
    tree_rows "$(state_get base head)" "$(state_get noise hide)" "$state" | while IFS=$'\t' read -r disp p h; do
      if [[ $h == 0 ]]; then
        printf '%s\t%s\t%s\n' "$disp" "$p" "$h"
      else
        printf '\033[36m%s\033[0m\t%s\t%s\n' "$disp" "$p" "$h"
      fi
    done ;;

  ui-header)
    state=${1:?state}
    mode=$(state_get base head); noise=$(state_get noise hide)
    h=$(bash "$S" hidden "$root" "$mode")
    m=$(grep -c . "$MARKED" 2>/dev/null); m=${m:-0}
    printf 'base: %s · tests/generated: %s (%s hidden) · marked: %s · %s\n' "$mode" "$noise" "$h" "$m" "$(date +%H:%M:%S)"
    printf '⏎/space fold · j/k move · J/K next/prev file · e/c expand/close all · b base · t noise · s side · m mark · p pager · q quit' ;;

  ui-preview)   # <state> <path> <hunk>
    state=${1:?state}
    [[ $(state_get side off) == on ]] && export SIDE=1
    if [[ ${3:-0} == 0 ]]; then bash "$S" file "$root" "$(state_get base head)" "${2:?path}"
    else bash "$S" hunk "$root" "$(state_get base head)" "${2:?path}" "$3"; fi ;;

  ui-sig)
    state=${1:?state}
    bash "$S" sig "$root" "$(state_get base head)" ;;

  ui)
    state=$(mktemp -d "${TMPDIR:-/tmp}/changes-ui.XXXXXX")
    echo "${1:-head}" >"$state/base"; echo hide >"$state/noise"; echo off >"$state/side"; : >"$state/open"
    port=${CHANGES_PORT:-$((20000 + RANDOM % 20000))}
    q() { printf '%q' "$1"; }
    sh_="bash $(q "$S")"; r=$(q "$root"); st=$(q "$state")
    refresh="reload($sh_ ui-list $r $st)+transform-header($sh_ ui-header $r $st)"
    printf '%s' "$refresh" >"${TMPDIR:-/tmp}/changes-refresh-$port"
    post() {   # POST an fzf action to --listen (no curl dependency)
      exec 3<>"/dev/tcp/127.0.0.1/$port" 2>/dev/null || return 0
      printf 'POST / HTTP/1.1\r\nHost: x\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s' "${#1}" "$1" >&3
      cat <&3 >/dev/null; exec 3>&-
    }
    (
      last=""
      while sleep 1; do
        s=$(bash "$S" ui-sig "$root" "$state")
        [[ -n $last && $s != "$last" ]] && post "$refresh"
        last=$s
      done
    ) &
    bg=$!
    cols=$(tput cols 2>/dev/null || echo 100)
    if ((cols >= 140)); then pw="right,60%,border-left"; else pw="down,65%,border-top"; fi
    fold="execute-silent($sh_ toggle-open $r $st {2})+$refresh"
    bash "$S" ui-list "$root" "$state" |
      fzf --ansi --layout=reverse --no-sort --no-input --track --id-nth=2,3 --delimiter=$'\t' --with-nth=1 \
        --listen="127.0.0.1:$port" --header-first --header "$(bash "$S" ui-header "$root" "$state")" \
        --preview "$sh_ ui-preview $r $st {2} {3}" --preview-window "$pw" \
        --bind "enter:$fold" --bind "space:$fold" --bind "l:$fold" --bind "h:$fold" \
        --bind "j:down" --bind "k:up" --bind "g:first" --bind "G:last" \
        --bind "J:down+down+down+down+down+down+down+down+down+down" --bind "K:up+up+up+up+up+up+up+up+up+up" \
        --bind "e:execute-silent($sh_ open-all $r $st)+$refresh" \
        --bind "c:execute-silent($sh_ close-all $r $st)+$refresh" \
        --bind "b:execute-silent($sh_ cycle-base $r $st)+$refresh" \
        --bind "t:execute-silent($sh_ toggle-noise $r $st)+$refresh" \
        --bind "s:execute-silent($sh_ toggle-side $r $st)+refresh-preview" \
        --bind "m:execute-silent($sh_ mark $r $st {2})+transform-header($sh_ ui-header $r $st)" \
        --bind "r:$refresh" \
        --bind "p:execute($sh_ ui-preview $r $st {2} {3} | LESS=-R less)" \
        --bind "q:abort" --bind "ctrl-q:abort" ;;

  *) echo "unknown command: $cmd" >&2; exit 2 ;;
esac
