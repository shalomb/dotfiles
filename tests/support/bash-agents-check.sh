#!/bin/bash
# Legacy agent bootstrap is gone; agentctl is the single agent manager.
# Usage: $0 {no-legacy-bins|no-legacy-refs|keychain-real|agentctl-status}
set -u
legacy=(gpg-agent-bootstrap gpg-agent-recover gpg-recover gpg-unlock-permanent
  ssh-agent-bootstrap update_ssh_agent_info)
repo=~/.config/dotfiles
case "${1:-}" in
no-legacy-bins)
  for b in "${legacy[@]}"; do
    [[ ! -e ~/.local/bin/$b && ! -L ~/.local/bin/$b ]] || {
      echo "present: $b" >&2
      exit 1
    }
  done
  [[ ! -e $repo/.local/bin/agent.backup && ! -e $repo/src/agent_management/agentctl.py.backup ]] &&
    [[ ! -e $repo/.config/bash/enabled/agent-bootstrap.sh ]]
  ;;
no-legacy-refs)
  # shell config and bin scripts must not call the legacy tools
  ! rg -n "$(
    IFS='|'
    echo "${legacy[*]}"
  )" "$repo/.local/bin" "$repo/.config/bash/enabled" "$repo/.config/bash/lib" \
    "$repo/.config/bash/bashrc" "$repo/.config/bash/profile"
  ;;
keychain-real) [[ $(command -v keychain) == /usr/bin/keychain ]] ;;
agentctl-status) setsid bash -i -c 'agentctl status' </dev/null 2>&1 ;;
*)
  echo "usage: $0 {no-legacy-bins|no-legacy-refs|keychain-real|agentctl-status}" >&2
  exit 2
  ;;
esac
