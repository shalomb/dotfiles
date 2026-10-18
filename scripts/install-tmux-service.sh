#!/bin/bash
# Install/enable the tmux systemd user units. Idempotent and user-level (no sudo);
# never restarts or kills a running tmux server.
set -u
unit_dir="$HOME/.config/systemd/user"

[[ -f $unit_dir/tmux.service && -f $unit_dir/tmux-watch.service ]] || {
  echo "tmux units not present in $unit_dir (run 'make refresh' first); skipping" >&2
  exit 0
}
command -v systemctl >/dev/null || { echo "no systemctl; skipping" >&2; exit 0; }

# Keep the user manager (and tmux.service) alive after the last login ends.
loginctl enable-linger "${USER:-$(id -un)}" ||
  echo "WARN: could not enable lingering (try: sudo loginctl enable-linger $USER)" >&2

systemctl --user daemon-reload
systemctl --user enable tmux.service tmux-watch.service

systemctl --user is-active --quiet tmux-watch.service || systemctl --user start tmux-watch.service

# Only start the unit when no server exists; a running server is left untouched.
if ! tmux list-sessions &>/dev/null; then
  systemctl --user start tmux.service
else
  echo "tmux server already running; tmux.service enabled but not (re)started" >&2
fi
