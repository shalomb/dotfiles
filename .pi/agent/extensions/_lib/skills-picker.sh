#!/usr/bin/env bash
# usage: skills-picker.sh ROWS.tsv OUT.txt   rows: name \t display(nm\trest) \t path
# Writes selected skill names (one per line) to OUT.txt; empty on cancel. Always exits 0.
rows=$1 out=$2
fzf --ansi --multi --delimiter=$'\t' --with-nth=2,3 --nth=1 --no-hscroll --tabstop=4 --layout=reverse --info=inline-right \
    --header $'name                              state tokens  description' \
    --footer $'LIST    ↑/↓ move · tab select · enter load · esc cancel\nSEARCH  name only (default) · ctrl-s name+description · ctrl-n name only\nPREVIEW shift-↑/↓ or alt-j/k line · ctrl-f/b page · alt-g/G top/end · ctrl-o enlarge · ctrl-/ hide\n(T2 frequent · T3 rare · dimmed = already in the prompt: ● loaded, T1 always on)' \
    --preview 'bat -pl md --color=always {4} 2>/dev/null || head -80 {4}' \
    --preview-window 'down,60%,wrap,border-top' \
    --bind 'ctrl-/:toggle-preview' \
    --bind 'ctrl-s:change-nth(1,2)+change-prompt(name+desc> )' \
    --bind 'ctrl-n:change-nth(1)+change-prompt(name> )' \
    --prompt 'name> ' \
    --bind 'shift-up:preview-up,shift-down:preview-down' \
    --bind 'alt-k:preview-up,alt-j:preview-down' \
    --bind 'ctrl-b:preview-half-page-up,ctrl-f:preview-half-page-down' \
    --bind 'alt-g:preview-top,alt-G:preview-bottom' \
    --bind 'ctrl-o:change-preview-window(up,90%|down,60%)' \
    <"$rows" | cut -f1 >"$out"
exit 0
