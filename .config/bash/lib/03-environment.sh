#!/bin/bash
# Core environment variables
# PHASE: env
# DEPENDENCIES: XDG_CACHE_HOME

# Set up GPG
export GPG_TTY=$(tty)

# Set up history file location
export HISTFILE="$XDG_CACHE_HOME/bash/history"

# Create history file if it doesn't exist
if [[ ! -e $HISTFILE ]]; then
    mkdir -p "${HISTFILE%/*}"
    ln -svf "$HISTFILE" ~/.bash_history
fi