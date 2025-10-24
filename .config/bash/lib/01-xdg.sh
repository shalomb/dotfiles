#!/bin/bash
# XDG Base Directory setup
# PHASE: env
# DEPENDENCIES: none

# Ensure HOME is set before proceeding
if [[ -z "${HOME:-}" ]]; then
    echo "Warning: HOME not set, skipping XDG directory setup" >&2
    return 0
fi

# Set XDG directories (only once, with proper defaults)
: "${XDG_CONFIG_HOME:=$HOME/.config}"
: "${XDG_CACHE_HOME:=$HOME/.cache}"
: "${XDG_DATA_HOME:=$HOME/.local/share}"
: "${XDG_STATE_HOME:=$HOME/.local/state}"

export XDG_CONFIG_HOME XDG_CACHE_HOME XDG_DATA_HOME XDG_STATE_HOME

# Create directories if they don't exist (only if HOME is valid)
if [[ -n "$HOME" && "$HOME" != "/" ]]; then
    mkdir -p "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$XDG_STATE_HOME" 2>/dev/null || true
fi