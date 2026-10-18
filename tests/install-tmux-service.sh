#!/bin/bash
# scripts/install-tmux-service.sh: idempotent, user-level, never disturbs a running server.
set -u
SCRIPT="${SCRIPT:-$(cd "$(dirname "$0")/.." && pwd)/scripts/install-tmux-service.sh}"
fail=0
check() { if eval "$2"; then echo "ok   - $1"; else echo "FAIL - $1"; fail=1; fi; }

setup() {
  T=$(mktemp -d); mkdir -p "$T/bin" "$T/home/.config/systemd/user"; : > "$T/calls"
  touch "$T/home/.config/systemd/user/tmux.service" "$T/home/.config/systemd/user/tmux-watch.service"
  # shellcheck disable=SC2016  # $* must expand in the generated stub, not here
  for c in systemctl loginctl; do
    printf '#!/bin/bash\necho "%s $*" >> "%s/calls"\ncase "$*" in *is-active*) exit ${ACTIVE_RC:-3};; esac\nexit 0\n' "$c" "$T" > "$T/bin/$c"
  done
  cat > "$T/bin/tmux" <<S
#!/bin/bash
echo "tmux \$*" >> "$T/calls"
[[ -e "$T/server" ]]
S
  chmod +x "$T/bin/"*
}
run() { env HOME="$T/home" USER=tester PATH="$T/bin:/usr/bin:/bin" bash "$SCRIPT" >"$T/out" 2>&1; RC=$?; }

setup; run
check "enables lingering"            "rg -q 'loginctl enable-linger tester' $T/calls"
check "reloads user units"           "rg -q 'systemctl --user daemon-reload' $T/calls"
check "enables both units"           "rg -q 'systemctl --user enable .*tmux.service' $T/calls && rg -q 'systemctl --user enable .*tmux-watch.service' $T/calls"
check "no server: starts tmux.service" "rg -q 'systemctl --user start tmux.service' $T/calls"

setup; touch "$T/server"; run
check "server up: never starts/restarts tmux.service" "! rg -q 'systemctl --user (re)?start tmux.service' $T/calls"
check "server up: no kill-server"    "! rg -q 'kill-server' $T/calls"

setup; rm "$T/home/.config/systemd/user/tmux.service"; run
check "missing unit: exits cleanly without enabling" "[[ $RC -eq 0 ]] && ! rg -q enable $T/calls"

setup; touch "$T/server"; run; run
check "idempotent: repeat run exits 0" "[[ $RC -eq 0 ]]"
exit $fail
