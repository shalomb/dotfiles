#!/bin/bash
# Legacy agent bootstrap is gone; agentctl is the single agent manager.
# Usage: $0 {no-legacy-bins|no-legacy-refs|keychain-real|agentctl-status|ssh-ensure-wired|ssh-ensure-before-ssh|startup-fast-path}
set -u
legacy=(gpg-agent-bootstrap gpg-agent-recover gpg-recover gpg-unlock-permanent
  ssh-agent-bootstrap update_ssh_agent_info)
repo="$(cd "$(dirname "$0")/../.." && pwd -P)"
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
ssh-ensure-wired)
  # ssh/scp/sftp wrappers must call ensure before connecting
  f=$repo/.config/bash/enabled/agentctl-integration.sh
  rg -q 'agentctl ssh ensure' "$f"
  rg -q '^ssh\(\)' "$f" || rg -q '^function ssh ' "$f"
  ;;
startup-fast-path)
  # Interactive startup must NOT invoke `agentctl init` (or uv/python) when
  # the gpg-agent ssh socket already exists; it must bind SSH_AUTH_SOCK directly.
  sock="${XDG_RUNTIME_DIR:-/run/user/$UID}/gnupg/S.gpg-agent.ssh"
  if [[ -S "$sock" ]]; then
    log=$(mktemp)
    setsid bash -i -c "
      bindir=\$(mktemp -d)
      printf '#!/bin/sh\necho UV-CALLED >> $log\nexit 99\n' > "\$bindir/uv"
      chmod +x "\$bindir/uv"
      PATH="\$bindir:\$PATH"
      source '"$repo"'/.config/bash/enabled/agentctl-integration.sh
    " </dev/null >/dev/null 2>&1 || true
    if [[ -s "$log" ]]; then
      echo "startup-fast-path failed: uv was called during startup: $(<"$log")" >&2
      rm -f "$log"
      exit 1
    fi
    rm -f "$log"
  fi
  ;;
ssh-ensure-before-ssh)
  # ssh must invoke ensure (when GPG_TTY is set), then the real ssh binary.
  setsid bash -i -c '
    set -e
    log=$(mktemp)
    bindir=$(mktemp -d)
    printf "%s\n" "#!/bin/sh" "echo REAL-SSH \"\$@\"" >"$bindir/ssh"
    chmod +x "$bindir/ssh"
    PATH="$bindir:$PATH"
    export GPG_TTY=/dev/pts/99
    agentctl() { printf "%s\n" "$*" >>"$log"; }
    out=$(ssh example.test 2>&1) || true
    rg -qx "ssh ensure" "$log"
    printf "%s\n" "$out" | rg -q "REAL-SSH example.test"
    # Fail closed: if ensure fails, do not reach the real ssh.
    : >"$log"
    agentctl() { printf "%s\n" "$*" >>"$log"; return 1; }
    out=$(ssh example.test 2>&1) && exit 1
    rg -qx "ssh ensure" "$log"
    ! printf "%s\n" "$out" | rg -q "REAL-SSH"
  ' </dev/null 2>&1
  ;;
*)
  echo "usage: $0 {no-legacy-bins|no-legacy-refs|keychain-real|agentctl-status|ssh-ensure-wired|ssh-ensure-before-ssh|startup-fast-path}" >&2
  exit 2
  ;;
esac
