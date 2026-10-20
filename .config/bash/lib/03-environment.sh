#!/bin/bash
# Core environment variables
# PHASE: env
# DEPENDENCIES: XDG_CACHE_HOME

# Set up GPG
GPG_TTY=$(tty)
export GPG_TTY

# Point gpg-agent (and its ssh interface) at this terminal so pinentry-tty
# prompts here, not on whichever tty the agent last saw (e.g. another tmux pane).
# Only with a real tty: outside one, `tty` prints "not a tty" and there is
# nothing to point at.
if [[ -t 0 ]] && command -v gpg-connect-agent >/dev/null 2>&1; then
  gpg-connect-agent updatestartuptty /bye >/dev/null 2>&1 || true
fi

# History file setup is handled in main bashrc