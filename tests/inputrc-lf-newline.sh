#!/bin/bash
# Behavioural check for .config/inputrc: a literal LF (C-j) typed into a bash
# prompt must still act as a line break. Agents and scripts drive panes with
# `tmux send-keys -l` and multi-line text; a `"\C-j": ""` binding swallows every
# LF and glues lines together (`echo a` + `echo b` -> `echo aecho b`).
# Uses a private tmux server; the real tmux is never touched.
set -u
RC="${1:-$HOME/.config/inputrc}"
work=$(mktemp -d)
sock="$work/sock"
trap 'tmux -S "$sock" kill-server 2>/dev/null; rm -rf "$work"' EXIT

tmux -S "$sock" -f /dev/null new-session -d -s t -x 100 -y 20 \
  "env INPUTRC='$RC' bash --norc --noprofile -i"
sleep 1.5
# The rc runs `set -o vi`, and readline re-reads the inputrc on reload (C-x C-r)
# - with vi already active the bindings land in the vi-insert keymap.
tmux -S "$sock" send-keys -t t -l -- "set -o vi; bind -f '$RC'; clear"
tmux -S "$sock" send-keys -t t C-m
sleep 0.7
tmux -S "$sock" send-keys -t t -l -- $'echo first\necho second'
tmux -S "$sock" send-keys -t t C-m
sleep 1
out=$(tmux -S "$sock" capture-pane -p -t t)

if printf '%s\n' "$out" | rg -qx 'first' && printf '%s\n' "$out" | rg -qx 'second'; then
  echo "PASS: LF acts as a line break"
else
  echo "FAIL: LF swallowed (lines glued together)"
  printf '%s\n' "$out" | rg -v '^\s*$'
  exit 1
fi
