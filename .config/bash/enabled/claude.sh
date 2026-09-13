#!/bin/bash

# Credential profile switching.
#
# `claude --login` writes .credentials.json via rename(), which destroys symlinks.
# Furthermore, background token refreshes also write via rename().
# To allow concurrent instances to safely share ~/.claude without corrupting
# each other's tokens, we isolate credentials using CLAUDE_SECURESTORAGE_CONFIG_DIR.

CLAUDE_CREDS_DIR="$HOME/.claude"
CLAUDE_PROFILE_DIR="$CLAUDE_CREDS_DIR/profiles"

_claude_profile_dir() {
  case "$1" in
    personal|work) printf '%s\n' "$CLAUDE_PROFILE_DIR/$1" ;;
    *) return 1 ;;
  esac
}

# Migrate old *.json file to the new directory structure if needed
_claude_migrate_profile() {
  local profile="$1"
  local dir="$(_claude_profile_dir "$profile")"
  local old_json="$CLAUDE_PROFILE_DIR/$profile.json"
  
  if [[ ! -d "$dir" ]]; then
    mkdir -p "$dir"
    chmod 700 "$dir"
  fi
  
  if [[ -f "$old_json" && ! -L "$old_json" ]]; then
    mv "$old_json" "$dir/.credentials.json"
    chmod 600 "$dir/.credentials.json"
  fi
}

claude() {
  agentctl gpg recover
  local uid="${UID:-$(id -u 2> /dev/null)}";
  
  GPG_TTY=/dev/null \
    systemd-run --scope -p CPUQuota=70% -p MemoryMax=3G --uid="$uid" \
    nice -n 15 \
    ~/.local/bin/claude --dangerously-skip-permissions "$@"
}

# claude-profile <personal|work> [claude args...]
#   Switch to a profile and launch claude under it, restoring the previous
#   profile on exit. With no extra args it just launches interactively.
# claude-profile switch <name>   - switch only, no launch
# claude-profile adopt <name>    - file the current post-login credentials
# claude-profile status          - show active profile and stored slots
claude-profile() {
  local profile rc
  local prev_dir

  case "$1" in
    personal|work)
      profile="$1"; shift
      _claude_migrate_profile "$profile"
      
      prev_dir="$CLAUDE_SECURESTORAGE_CONFIG_DIR"
      export CLAUDE_SECURESTORAGE_CONFIG_DIR="$(_claude_profile_dir "$profile")"
      
      [[ "$prev_dir" != "$CLAUDE_SECURESTORAGE_CONFIG_DIR" ]] && echo "Switched to $profile" >&2
      
      claude "$@"
      rc=$?
      
      if [[ -n "$prev_dir" && "$prev_dir" != "$CLAUDE_SECURESTORAGE_CONFIG_DIR" ]]; then
        export CLAUDE_SECURESTORAGE_CONFIG_DIR="$prev_dir"
        echo "Restored previous profile" >&2
      elif [[ -z "$prev_dir" ]]; then
        unset CLAUDE_SECURESTORAGE_CONFIG_DIR
      fi
      
      return $rc ;;

    switch)
      [[ -n "$2" ]] || { echo "Usage: claude-profile switch <personal|work>" >&2; return 1; }
      profile="$2"
      if ! _claude_profile_dir "$profile" > /dev/null; then
        echo "Usage: claude-profile switch <personal|work>" >&2
        return 1
      fi
      _claude_migrate_profile "$profile"
      export CLAUDE_SECURESTORAGE_CONFIG_DIR="$(_claude_profile_dir "$profile")"
      echo "Switched to $profile" ;;

    adopt)
      if ! dir="$(_claude_profile_dir "$2")"; then
        echo "Usage: claude-profile adopt <personal|work>" >&2
        return 1
      fi
      if [[ ! -f "$CLAUDE_CREDS_DIR/.credentials.json" ]]; then
        echo "claude-profile: No credentials found to adopt in $CLAUDE_CREDS_DIR." >&2
        return 1
      fi
      mkdir -p "$dir" && chmod 700 "$dir"
      cp "$CLAUDE_CREDS_DIR/.credentials.json" "$dir/.credentials.json"
      chmod 600 "$dir/.credentials.json"
      echo "Adopted active credentials into $2 profile" ;;

    status)
      local active_profile="(none)"
      
      if [[ "$CLAUDE_SECURESTORAGE_CONFIG_DIR" == "$CLAUDE_PROFILE_DIR/personal" ]]; then
        active_profile="personal"
      elif [[ "$CLAUDE_SECURESTORAGE_CONFIG_DIR" == "$CLAUDE_PROFILE_DIR/work" ]]; then
        active_profile="work"
      elif [[ -f "$CLAUDE_CREDS_DIR/.credentials.json" ]]; then
        active_profile="default (~/.claude)"
      fi
      
      echo "active:  $active_profile"
      for name in personal work; do
        if [[ -f "$CLAUDE_PROFILE_DIR/$name/.credentials.json" || -f "$CLAUDE_PROFILE_DIR/$name.json" ]]; then
          echo "stored:  $name"
        else
          echo "stored:  $name (empty)"
        fi
      done ;;

    *)
      echo "Usage: claude-profile <personal|work> [claude args...]" >&2
      echo "       claude-profile switch <name> | adopt <name> | status" >&2
      return 1 ;;
  esac
}
