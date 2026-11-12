#!/bin/bash
# shellcheck disable=SC2164  # we deliberately test cd failure paths
# Characterisation tests for the `cd` function in .config/bash/enabled/cd.sh.
# They pin CURRENT behaviour so the function can be refactored safely.
# Hermetic: temp HOME/dirs, `cdto` (fzf picker) replaced by a stub.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/.config/bash/enabled/cd.sh"

pass=0; fail=0
check() { # name expected actual
  if [[ "$2" == "$3" ]]; then pass=$((pass+1)); else
    fail=$((fail+1)); printf 'FAIL %s\n  want: %s\n  got:  %s\n' "$1" "$2" "$3"; fi
}

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
T="$(builtin cd "$T" && pwd -P)"
export HOME="$T/home" XDG_CONFIG_HOME="$T/xdg"
mkdir -p "$HOME" "$XDG_CONFIG_HOME" "$T/a/b/c" "$T/a/x/y" "$T/var/lib" "$T/var/log" "$T/w"
touch "$T/a/file.txt"

# Stubs for helpers provided elsewhere in the dotfiles
warn() { echo "WARN: $*" >&2; }
die()  { echo "DIE: $*" >&2; }
tildeexpand() { echo "${1/#\~/$HOME}"; }
cdto() { printf '%s\n' "$@" >"$T/cdto.args"; echo "$CDTO_ANSWER"; }  # picker stub; records args
gum()  { case "$1" in dirs) echo "$T/w";; projects) echo "$T/qq";; esac; }
CDTO_ANSWER=""

reset() { builtin cd "$1" || exit 1; dirs -c; unset OLDPWD; }
run()   { cd "$@" >"$T/out" 2>"$T/err"; echo $? >"$T/rc"; }  # runs in this shell
out() { cat "$T/out"; }; err() { cat "$T/err"; }; rc() { cat "$T/rc"; }

# --- plain navigation --------------------------------------------------------
reset "$T/a"; run;            check noarg-goes-home "$HOME" "$PWD"
reset "$T/a"; run '~';        check tilde-goes-home "$HOME" "$PWD"
reset "$T/a"; run b;          check relative-dir "$T/a/b" "$PWD"
check pushes-dirstack 2 "$(dirs -p | wc -l)"
reset "$T/a"; run b; run -;   check dash-returns-to-oldpwd "$T/a" "$PWD"
reset "$T/a"; run "$T/var";   check absolute-dir "$T/var" "$PWD"
reset "$T/a"; run b; before="$(dirs -p | wc -l)"; run b
check same-dir-noop "$T/a/b" "$PWD"
check same-dir-no-push "$before" "$(dirs -p | wc -l)"

# --- files, missing ----------------------------------------------------------
reset "$T"; run a/file.txt;   check file-goes-to-parent "$T/a" "$PWD"
check file-parent-message "cd: a/file.txt: not a directory. using parent directory: a" "$(err)"
reset "$T"; run nope;         check missing-stays "$T" "$PWD"
check missing-message "cd: nope: No such file or directory. Append -c to create." "$(err)"
check missing-status 0 "$(rc)"

# --- qualifiers --------------------------------------------------------------
reset "$T"; run newdir -c;    check create-flag "$T/newdir" "$PWD"
reset "$T/a/b"; run b x;      check substitute-in-pwd "$T/a/x" "$PWD"
reset "$T/a/b"; run zzz q;    check substitute-fail-status 1 "$(rc)"
check substitute-fail-stays "$T/a/b" "$PWD"
reset "$T/a/b/c"; run b -u;   check up-by-regex "$T/a/b" "$PWD"
reset "$T/a/b/c"; run a -u;   check up-by-regex-ancestor "$T/a" "$PWD"
reset "$T/a/b"; run x -a;     check ancestors-child "$T/a/x" "$PWD"
reset "$T/a/b"; run nomatch -a; check ancestors-child-none-stays "$T/a/b" "$PWD"
reset "$T"; run -k a;         check k-builtin-first "$T/a" "$PWD"
check k-no-pushd 1 "$(dirs -p | wc -l)"
reset "$T"; run a/b -k;       check k-builtin-second "$T/a/b" "$PWD"

# --- git toplevel ------------------------------------------------------------
git init -q "$T/repo"; mkdir -p "$T/repo/deep/er"
reset "$T/repo/deep/er"; run -t; check git-toplevel-t "$T/repo" "$PWD"
reset "$T/repo/deep/er"; run -r; check git-toplevel-r "$T/repo" "$PWD"

# --- dirstack ----------------------------------------------------------------
reset "$T/a"; run b; run c; run "$T/var"      # stack: var c b a
run +1;  check stack-plus-n "$T/a/b/c" "$PWD"
# dirs -N counts from the right: -0 is the oldest entry
reset "$T/a"; run b; run -0;  check stack-minus-n "$T/a" "$PWD"

# --- shorthand globs ---------------------------------------------------------
mkdir -p "$T/qq/zz"
reset "$T"; run q/z;    check shorthand-glob-unique "$T/qq/zz" "$PWD"
reset "$T"; CDTO_ANSWER="$T/var/lib" run v/l
check shorthand-glob-ambiguous-uses-picker "$T/var/lib" "$PWD"
reset "$T"; run j/k;    check shorthand-no-match-stays "$T" "$PWD"
check shorthand-no-match-message "WARN: No dirs match: j*/k*" "$(err)"
# quirk: single-char names are treated as shorthand, so CDPATH is never consulted
reset "$T"; CDPATH="$T/a" run b;  check quirk-single-char-shadows-cdpath "$T" "$PWD"

# --- pickers (cdto stubbed) --------------------------------------------------
reset "$T"; mkdir -p "$XDG_CONFIG_HOME"; echo "$T/w" >"$XDG_CONFIG_HOME/dirs"
CDTO_ANSWER="$T/w" run -b;    check picker-bookmarks "$T/w" "$PWD"
reset "$T"; CDTO_ANSWER="" run -b; check picker-cancel-stays "$T" "$PWD"
reset "$T/a"; run b; run c; CDTO_ANSWER="$T/a" run -v
check picker-dirstack-lands "$T/a" "$PWD"


# --- more pickers: which candidates reach cdto -------------------------------
mkdir -p "$HOME/.cache"; echo "$T/var" >"$HOME/.cache/dir-selected"
reset "$T"; CDTO_ANSWER="$T/var" run -s
check picker-selection-lands "$T/var" "$PWD"
check picker-selection-candidates "$T/var" "$(tail -n1 "$T/cdto.args")"
reset "$T"; CDTO_ANSWER="$T/w" run -f;  check picker-frequent-lands "$T/w" "$PWD"
check picker-frequent-candidates "$T/w" "$(tail -n1 "$T/cdto.args")"
reset "$T"; CDTO_ANSWER="$T/qq" run -p; check picker-projects-lands "$T/qq" "$PWD"
reset "$T"; CDTO_ANSWER="$T/w" run -o;  check picker-omni-lands "$T/w" "$PWD"
check picker-omni-has-selection "$T/var" "$(rg -x -F "$T/var" "$T/cdto.args" | head -1)"
check picker-omni-has-projects "$T/qq" "$(rg -x -F "$T/qq" "$T/cdto.args" | head -1)"
reset "$T"; run -b x;                   check picker-query-passed "x" "$(head -n1 "$T/cdto.args")"

# --- bookmarks ---------------------------------------------------------------
rm -f "$XDG_CONFIG_HOME/dirs"
reset "$T/a"; run -B; reset "$T/var"; run -B; run -B
check bookmark-adds-pwd-deduped "$T/var
$T/a" "$(cat "$XDG_CONFIG_HOME/dirs")"

# --- dirstack: bare + and +name ---------------------------------------------
mkdir -p "$T/zebra"
reset "$T"; run zebra; run "$T/a"; run +zebra; check stack-name-match "$T/zebra" "$PWD"
reset "$T/a"; run b; run c; CDTO_ANSWER="$T/a" run +
check plus-opens-dirstack-picker "$T/a" "$PWD"

# --- qualifier -d / -h -------------------------------------------------------
reset "$T"; CDTO_ANSWER="./a/x" run x -d; check descend-flag "$T/a/x" "$PWD"
check descend-candidates "./a/x" "$(rg -x -F ./a/x "$T/cdto.args")"
reset "$T"; run x -h; check qualifier-help-lists-flags 1 "$(out | rg -c -- '-c  - Create and then cd')"
check qualifier-help-no-move "$T" "$PWD"

# --- CDPATH ------------------------------------------------------------------
mkdir -p "$T/a/bbb"
reset "$T"; CDPATH="$T/a" run bbb;  check cdpath-hit "$T/a/bbb" "$PWD"

# --- help --------------------------------------------------------------------
reset "$T"; run -h; check help-lists-flags 1 "$(out | rg -c -- '-B  - add current directory')"
check help-no-move "$T" "$PWD"

# --- wrappers ----------------------------------------------------------------
reset "$T/a/b/c"; cdupto a 2>/dev/null;  check cdupto-regex "$T/a" "$PWD"
reset "$T/a/b"; cdupto 2>/dev/null;      check cdupto-noarg "$T/a" "$PWD"
reset "$T/a"; cd b >/dev/null 2>&1; cd- >/dev/null 2>&1; check cd-dash-fn "$T/a" "$PWD"

echo "cd-behaviour: $pass passed, $fail failed"
(( fail == 0 ))
