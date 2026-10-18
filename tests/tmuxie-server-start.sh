#!/bin/bash
# tmuxie must (re)start the tmux server via tmux.service (outside the login
# scope) and log loudly when the server was missing. Uses stubbed binaries.
set -u
TMUXIE="${TMUXIE:-$HOME/.local/bin/tmuxie}"
fail=0
check() { if eval "$2"; then echo "ok   - $1"; else echo "FAIL - $1"; fail=1; fi; }

setup() {
  T=$(mktemp -d); mkdir -p "$T/bin"; : > "$T/calls"
  cat > "$T/bin/tmux" <<S
#!/bin/bash
echo "tmux \$*" >> "$T/calls"
case "\$1" in
  list-sessions|has-session) [[ -e "$T/server" ]] ;;
  *) exit 0 ;;
esac
S
  cat > "$T/bin/systemctl" <<S
#!/bin/bash
echo "systemctl \$*" >> "$T/calls"
case "\$2" in start) touch "$T/server" ;; esac
exit 0
S
  printf '#!/bin/bash\necho "logger $*" >> "%s/calls"\n' "$T" > "$T/bin/logger"
  printf '#!/bin/bash\nexit 0\n' > "$T/bin/gum"
  chmod +x "$T/bin/"*
}
run() { env -u TMUX PATH="$T/bin:/usr/bin:/bin" TMUXIE_LOG="$T/log" bash "$TMUXIE" "$@" >/dev/null 2>&1; }

setup  # no server running
run code
check "no server: starts tmux.service" "rg -q 'systemctl --user start tmux.service' $T/calls"
check "no server: logs loudly"         "rg -q 'logger .*tmuxie.*server was missing' $T/calls"
check "no server: does not new-session itself" "! rg -q 'tmux new-session' $T/calls"
check "no server: attaches"            "rg -q 'tmux attach-session -t code' $T/calls"

setup; touch "$T/server"  # server already running
run code
check "server up: does not start unit" "! rg -q 'systemctl --user start' $T/calls"
check "server up: attaches"            "rg -q 'tmux attach-session -t code' $T/calls"
exit $fail
