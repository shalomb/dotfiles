#!/bin/bash

claude() {
  agentctl gpg recover
  local uid="${UID:-$(id -u 2> /dev/null)}";
  GPG_TTY=/dev/null \
    systemd-run --scope -p CPUQuota=70% -p MemoryMax=3G --uid="$uid" \
    nice -n 15 \
    ~/.local/bin/claude --dangerously-skip-permissions "$@"
}

claude-profile() {
  local creds_dir="$HOME/.claude"
  case "$1" in
    personal) ln -sf "$creds_dir/.credentials.json-s.bhooshi@gmail.com" "$creds_dir/.credentials.json" ;;
    work)     ln -sf "$creds_dir/.credentials.json-shalom.bhooshi@takeda.com" "$creds_dir/.credentials.json" ;;
    status)
      if [[ -L "$creds_dir/.credentials.json" ]]; then
        echo "active: $(readlink "$creds_dir/.credentials.json")"
      else
        echo "active: (not a symlink)"
      fi
      return ;;
    *) echo "Usage: claude-profile [personal|work|status]"; return 1 ;;
  esac
  echo "Switched to $1"
}
