#!/bin/sh

# SOURCING: ~/.profile, ~/.bash_profile (symlinks)

# Set flag to suppress bell during profile sourcing
_SOURCING_BASHRC=true

# Load Kiro CLI integration early
# This provides the _kiro_cli_profile_pre/post functions
if [ -f "$HOME/.config/bash/enabled/kiro-cli.sh" ]; then
  . "$HOME/.config/bash/enabled/kiro-cli.sh"
  # Kiro CLI pre block. Keep at the top of this file.
  _kiro_cli_profile_pre 2>/dev/null || true
fi
# SOURCES: profile.d/*.sh, lib/00-path
# DOES NOT SOURCE: bashrc (prevents infinite loops)

# ADR-001: Environment Variables in Login Shells
# ================================================
# DECISION: Move environment variables (PATH, MANPATH, etc.) from bashrc to bash_profile
# RATIONALE: 
#   - Login shells should source bash_profile for environment setup
#   - Non-terminal shells source bashrc, which should source bash_profile
#   - This ensures all shell types get proper environment variables
#   - Follows bash manpage best practices for startup file organization
# CONSEQUENCES:
#   - PATH and other env vars are available in all shell contexts
#   - Single source of truth for environment configuration
#   - Fixes tmux new window PATH issues
# ================================================

# Source profile.d files (POSIX compliant, portable)
# This ensures environment variables are available across all shells (bash, sh, zsh, ksh, etc.)
if [[ -d ~/.config/profile.d ]]; then
  for i in ~/.config/profile.d/*.sh; do
    if [[ -r "$i" ]]; then
      . "$i"
    fi
  done
  unset i
fi

# Load XDG Base Directory variables
. ~/.config/posix/01-xdg.sh

# Load environment variables (PATH, MANPATH, etc.) for all shell types
# This ensures login shells, non-terminal shells, and interactive shells all get proper environment
. ~/.config/posix/00-path.sh

# Note: Removed BASH_RC_SOURCED check as it was causing circular dependency
# The bashrc has its own interactive check to prevent issues

# For SSH logins, we need to source bashrc even if not interactive initially
# Only skip if we're definitely non-interactive (like running scripts)
if [ -z "${PS1:-}" ] && [ -z "${SSH_CLIENT:-}" ] && [ -z "${SSH_TTY:-}" ]; then
  return 0
fi

# the default umask is set in /etc/login.defs
umask 022

if [ "$TERM" = 'linux' ]; then
  setterm -blength 0
fi

# Fix TERM for clickable links support
if [ "$TERM" = 'dumb' ]; then
  export TERM=tmux-256color
fi

# Set editor variables for all shells (login and non-login)
export EDITOR="vi"
export FCEDIT="$EDITOR"
export VISUAL="$EDITOR"

# Source bashrc for interactive shells (standard bash convention)
# This ensures tmux new windows and login shells get full bash configuration
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi

if [ "${TTY:-$(tty)}" = '/dev/tty1' ]; then
  unset TMOUT
  tmout 5 "exec startx > $TMP/startx.log 2>&1"
  TMOUT=120
  clear
fi

# Kiro CLI post block. Keep at the bottom of this file.
_kiro_cli_profile_post 2>/dev/null || true

# Clear sourcing flag after profile loads
unset _SOURCING_BASHRC
