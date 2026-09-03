#!/bin/bash

# Credential profile switching.
#
# `claude --login` writes .credentials.json via rename(), which replaces the
# directory entry and so destroys any symlink or hardlink pointing at a slot.
# Rather than trying to make the link survive that, the link is repaired after
# the run: a regular file where the symlink should be means a re-login
# happened, so the fresh credentials are copied into the active slot and the
# symlink re-established.
#
# Note: the credentials JSON carries no account identifier, so the slot is
# chosen from the recorded profile (intent), not from the token itself. If you
# switch to one profile and then log in as the other account, the credentials
# are filed under the wrong name; recover with `claude-profile adopt <name>`.

CLAUDE_CREDS_DIR="$HOME/.claude"
CLAUDE_CREDS_ACTIVE="$CLAUDE_CREDS_DIR/.credentials.json"
CLAUDE_CREDS_MARKER="$CLAUDE_CREDS_DIR/.credentials.profile"
CLAUDE_PROFILE_DIR="$CLAUDE_CREDS_DIR/profiles"

_claude_profile_slot() {
  case "$1" in
    personal|work) printf '%s\n' "$CLAUDE_PROFILE_DIR/$1.json" ;;
    *) return 1 ;;
  esac
}

# Bare readlink, not -f: for a regular file this is empty, which is exactly
# the signal that a login replaced the symlink.
_claude_active_profile() {
  local target
  target="$(readlink "$CLAUDE_CREDS_ACTIVE" 2> /dev/null)"
  if [[ -n "$target" ]]; then
    basename "$target" .json
  else
    cat "$CLAUDE_CREDS_MARKER" 2> /dev/null
  fi
}

# If .credentials.json is a regular file, a login replaced the symlink.
# Copy it into the recorded profile's slot and restore the link.
_claude_creds_save_back() {
  [[ -f "$CLAUDE_CREDS_ACTIVE" && ! -L "$CLAUDE_CREDS_ACTIVE" ]] || return 0

  local profile slot
  # note: $(< f) cannot take a redirection - use cat so a missing marker is quiet
  profile="$(cat "$CLAUDE_CREDS_MARKER" 2> /dev/null)"
  if [[ -z "$profile" ]] || ! slot="$(_claude_profile_slot "$profile")"; then
    echo "claude: new credentials at $CLAUDE_CREDS_ACTIVE but no profile recorded;" >&2
    echo "        run 'claude-profile adopt <personal|work>' to file them." >&2
    return 0
  fi

  mkdir -p "$CLAUDE_PROFILE_DIR" && chmod 700 "$CLAUDE_PROFILE_DIR"
  # copy-then-mv so a concurrent session never sees a half-written slot
  local tmp="$slot.tmp.$$"
  if command cp "$CLAUDE_CREDS_ACTIVE" "$tmp" 2> /dev/null &&
     command mv "$tmp" "$slot" 2> /dev/null; then
    chmod 600 "$slot"
    ln -sf "$slot" "$CLAUDE_CREDS_ACTIVE"
    echo "claude: saved refreshed credentials to '$profile' profile" >&2
  else
    command rm -f "$tmp" 2> /dev/null
    echo "claude: failed to save credentials to '$profile' slot" >&2
  fi
}

_claude_creds_activate() {
  local profile="$1" slot
  slot="$(_claude_profile_slot "$profile")" || return 1
  if [[ ! -e "$slot" ]]; then
    echo "claude-profile: no stored credentials for '$profile';" >&2
    echo "                run 'claude' and log in, then 'claude-profile adopt $profile'." >&2
    return 1
  fi
  ln -sf "$slot" "$CLAUDE_CREDS_ACTIVE"
  printf '%s\n' "$profile" > "$CLAUDE_CREDS_MARKER"
  chmod 600 "$CLAUDE_CREDS_MARKER"
}

claude() {
  agentctl gpg recover
  local uid="${UID:-$(id -u 2> /dev/null)}";
  # Save back on Ctrl-C/SIGTERM too, not just a clean exit. A SIGKILL or power
  # loss still skips it; the next run (or 'claude-profile status') will show
  # the unfiled credentials and recover them.
  trap '_claude_creds_save_back' INT TERM
  GPG_TTY=/dev/null \
    systemd-run --scope -p CPUQuota=70% -p MemoryMax=3G --uid="$uid" \
    nice -n 15 \
    ~/.local/bin/claude --dangerously-skip-permissions "$@"
  local rc=$?
  trap - INT TERM
  _claude_creds_save_back
  return $rc
}

# claude-profile <personal|work> [claude args...]
#   Switch to a profile and launch claude under it, restoring the previous
#   profile on exit. With no extra args it just launches interactively.
# claude-profile switch <name>   - switch only, no launch
# claude-profile adopt <name>    - file the current post-login credentials
# claude-profile status          - show active profile and stored slots
claude-profile() {
  local profile previous rc

  case "$1" in
    personal|work)
      profile="$1"; shift
      previous="$(_claude_active_profile)"
      _claude_creds_save_back
      _claude_creds_activate "$profile" || return 1
      [[ "$previous" != "$profile" ]] && echo "Switched to $profile" >&2

      claude "$@"
      rc=$?

      # Restore whatever was active before, so the profile is scoped to this
      # invocation. save_back already ran inside claude(), so the symlink is
      # intact and any refreshed token is filed under $profile.
      if [[ -n "$previous" && "$previous" != "$profile" ]]; then
        if _claude_creds_activate "$previous" 2> /dev/null; then
          echo "Restored profile: $previous" >&2
        else
          echo "claude-profile: could not restore '$previous'; still on '$profile'" >&2
        fi
      fi
      return $rc ;;

    switch)
      [[ -n "$2" ]] || { echo "Usage: claude-profile switch <personal|work>" >&2; return 1; }
      _claude_creds_save_back
      _claude_creds_activate "$2" || return 1
      echo "Switched to $2" ;;

    adopt)
      if ! _claude_profile_slot "$2" > /dev/null; then
        echo "Usage: claude-profile adopt <personal|work>" >&2
        return 1
      fi
      if [[ ! -f "$CLAUDE_CREDS_ACTIVE" || -L "$CLAUDE_CREDS_ACTIVE" ]]; then
        echo "claude-profile: $CLAUDE_CREDS_ACTIVE is already filed (or missing); nothing to adopt." >&2
        return 1
      fi
      printf '%s\n' "$2" > "$CLAUDE_CREDS_MARKER"
      chmod 600 "$CLAUDE_CREDS_MARKER"
      _claude_creds_save_back ;;

    status)
      profile="$(_claude_active_profile)"
      if [[ -L "$CLAUDE_CREDS_ACTIVE" ]]; then
        echo "active:  ${profile:-unknown} -> $(readlink "$CLAUDE_CREDS_ACTIVE")"
      elif [[ -f "$CLAUDE_CREDS_ACTIVE" ]]; then
        echo "active:  ${profile:-unknown} (re-login not yet filed; saves on next exit)"
      else
        echo "active:  (none - no credentials present)"
      fi
      local name s
      for name in personal work; do
        s="$(_claude_profile_slot "$name")"
        [[ -f "$s" ]] && echo "stored:  $name" || echo "stored:  $name (empty)"
      done ;;

    *)
      echo "Usage: claude-profile <personal|work> [claude args...]" >&2
      echo "       claude-profile switch <name> | adopt <name> | status" >&2
      return 1 ;;
  esac
}
