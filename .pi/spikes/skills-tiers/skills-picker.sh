#!/usr/bin/env bash
# usage: skills-picker.sh ROWS.tsv OUT.txt   rows: name \t state \t tokens \t description \t path
# Writes selected skill names (one per line) to OUT.txt; empty on cancel. Always exits 0.
rows=$1 out=$2
fzf --multi --delimiter=$'\t' --with-nth=2.. --tabstop=4 \
  --header $'tab: multi-select · enter: load · esc: cancel\nT1=always on  ●=loaded' \
  --preview 'bat -pl md --color=always {5} 2>/dev/null || head -60 {5}' --preview-window 'right,55%,wrap' \
  <"$rows" | cut -f1 >"$out"
exit 0
