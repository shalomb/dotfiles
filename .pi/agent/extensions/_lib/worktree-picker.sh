#!/usr/bin/env bash
# usage: worktree-picker.sh ROWS.tsv OUT.txt   rows: dir \t display. Writes the chosen dir to OUT.txt; empty on cancel. Always exits 0.
rows=$1 out=$2
fzf --delimiter=$'\t' --with-nth=2 --layout=reverse --info=inline-right --prompt 'worktree> ' \
    --header $'enter = hop into worktree · esc = cancel' \
    --preview 'git -C {1} log --oneline --decorate -15 --color=always 2>/dev/null; echo; git -C {1} status -sb 2>/dev/null' \
    --preview-window 'down,50%,wrap,border-top' \
    <"$rows" | cut -f1 >"$out"
exit 0
