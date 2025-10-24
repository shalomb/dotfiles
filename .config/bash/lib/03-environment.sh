#!/bin/bash
# Core environment variables
# PHASE: env
# DEPENDENCIES: XDG_CACHE_HOME

# Set up GPG
export GPG_TTY=$(tty)

# History file setup is handled in main bashrc