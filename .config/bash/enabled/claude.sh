#!/bin/bash

claude() {
  agentctl gpg recover
  local uid="${UID:-$(id -u 2> /dev/null)}";
  GPG_TTY=/dev/null \
    systemd-run --scope -p CPUQuota=70% -p MemoryMax=3G --uid="$uid" \
    nice -n 15 \
    ~/.local/bin/claude --dangerously-skip-permissions "$@"
}
