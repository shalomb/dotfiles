#!/bin/bash

# bashrc - Clean bash initialization with universal/interactive split

# Load Kiro CLI integration early (before other enabled scripts)
# This provides the _kiro_cli_bashrc_pre/post functions
[[ -f "$HOME/.config/bash/enabled/kiro-cli.sh" ]] && source "$HOME/.config/bash/enabled/kiro-cli.sh"

# Kiro CLI pre block. Keep at the top of this file.
[[ "$(type -t _kiro_cli_bashrc_pre)" == "function" ]] && _kiro_cli_bashrc_pre

# =============================================================================
# UNIVERSAL SECTION (Always runs - all shell types)
# =============================================================================

# Environment setup (only if not from login shell)
if [[ -z "$BASH_PROFILE_SOURCED" ]]; then
    # XDG Base Directory specification
    export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
    export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
    export XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
    export XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"

    # PATH setup - standard user directories
    PATH="$HOME/.local/bin"           # User scripts/binaries
    PATH="$PATH:$HOME/.config/bin"    # Config-managed binaries
    PATH="$PATH:$HOME/.cargo/bin"     # Rust toolchain
    PATH="$PATH:$HOME/go/bin"         # Go binaries
    PATH="$PATH:$XDG_DATA_HOME/go/bin" # XDG-compliant Go binaries
    PATH="$PATH:/usr/local/bin"       # System-local binaries
    PATH="$PATH:/usr/bin"             # System binaries
    PATH="$PATH:/bin"                 # Essential binaries
    export PATH
fi

# Set fixed paths
BASHRC_DIR="$HOME/.config/bash"
DOTFILES_DIR="$HOME/.config/dotfiles"
export BASHRC_DIR DOTFILES_DIR

# Validate bootstrap succeeded
if [[ ! -d "$BASHRC_DIR" ]]; then
    echo "ERROR: BASHRC_DIR not found: $BASHRC_DIR" >&2
    return 1
fi

# Core functions that work everywhere
has-cmd() {
    command -v "$1" >/dev/null 2>&1
}

# Compatibility alias for old scripts
@has-cmd() {
    has-cmd "$@"
}

# Check if function is defined
defined() {
    declare -F "$1" >/dev/null 2>&1
}

# Check if running in interactive shell
@is-interactive() {
    [[ ${-//[!i]/} ]]
}

# Call function if it's defined
call-if-defined() {
    defined "$1" && "$@"
}

# Load all core functions from lib directory
for script in "$BASHRC_DIR"/lib/*; do
    [[ -f "$script" && "$script" != *.md ]] && source "$script"
done

# =============================================================================
# INTERACTIVE-ONLY SECTION (Everything below here is interactive-only)
# =============================================================================

# Simple, bulletproof check - exit early if not interactive
# Allow SSH contexts to continue (they may become interactive)
[[ $- != *i* ]] && [[ -z "$SSH_CLIENT" ]] && [[ -z "$SSH_TTY" ]] && return

# Everything below runs ONLY in interactive shells
# No more INTERACTIVE_MODE checks needed!

# History configuration (XDG-compliant, multi-session safe)
export HISTFILE="$XDG_STATE_HOME/bash/history"
export HISTSIZE=50000           # In-memory history size
export HISTFILESIZE=50000       # On-disk history size
export HISTCONTROL="ignoreboth:erasedups"  # Ignore duplicates and spaces
export HISTTIMEFORMAT='%F %T '  # ISO-8601 timestamps
export HISTIGNORE="&:[bf]g:exit:set +o *:set -o *:shopt -s *:shopt -u *:dump_bash_state"  # Filter out common noise

# Create history directory if it doesn't exist
mkdir -p "$(dirname "$HISTFILE")"

# Shell options for multi-session history
shopt -s histappend        # Append to history, don't overwrite (CRITICAL for multi-session)
shopt -s checkwinsize      # Update LINES and COLUMNS after each command
shopt -s cmdhist           # Save multi-line commands as one entry
shopt -s globstar          # ** matches all files/directories recursively
shopt -s dotglob           # Include dotfiles in pathname expansion
shopt -s extglob           # Extended pattern matching
shopt -s nocaseglob        # Case-insensitive pathname expansion

# Set options
# Temporarily disable history to prevent 'set -o' commands from being written
HISTFILE_SAVE="$HISTFILE"
unset HISTFILE
set -o ignoreeof           # Prevent Ctrl+D from exiting (need 10 presses)
HISTFILE="$HISTFILE_SAVE"

# Bash completion
# Temporarily disable history to prevent 'set +o' commands from bash_completion
# from being written to history (they're filtered by HISTIGNORE but we want to be extra safe)
if [[ -f /usr/share/bash-completion/bash_completion ]]; then
    set +H  # Disable history expansion temporarily
    HISTFILE_SAVE="$HISTFILE"
    unset HISTFILE  # Temporarily disable history file
    source /usr/share/bash-completion/bash_completion
    HISTFILE="$HISTFILE_SAVE"
    set -H  # Re-enable history expansion
elif [[ -f /etc/bash_completion ]]; then
    set +H
    HISTFILE_SAVE="$HISTFILE"
    unset HISTFILE
    source /etc/bash_completion
    HISTFILE="$HISTFILE_SAVE"
    set -H
fi

# Enable programmable completion features
if ! shopt -oq posix; then
    shopt -s progcomp
fi

# Load aliases
[[ -f "$BASHRC_DIR/aliases" ]] && source "$BASHRC_DIR/aliases"
[[ -f ~/.bash_aliases ]] && source ~/.bash_aliases

# Load enabled tools from enabled directory
for script in "$BASHRC_DIR"/enabled/*.sh; do
    [[ -f "$script" && "$script" != *.md ]] && source "$script"
done

# Define interactive functions
reload() {
    echo "🔄 Reloading bashrc..."
    source ~/.bashrc
}

# =============================================================================
# Silent startup - no verbose output
# =============================================================================

# Kiro CLI post block. Keep at the bottom of this file.
[[ "$(type -t _kiro_cli_bashrc_post)" == "function" ]] && _kiro_cli_bashrc_post
