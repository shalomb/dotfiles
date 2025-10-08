#!/bin/bash

# SOURCING: ~/.bashrc (symlink), interactive bash shells
# SOURCES: rc.d/*, aliases, enabled/*.sh
# DOES NOT SOURCE: profile (prevents infinite loops)

# XDG Base Directory specification (set before interactive check)
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
export XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"

# Ensure XDG variables are properly set (handle case where they're set to empty)
[[ -z "$XDG_CACHE_HOME" ]] && export XDG_CACHE_HOME="$HOME/.cache"
[[ -z "$XDG_CONFIG_HOME" ]] && export XDG_CONFIG_HOME="$HOME/.config"
[[ -z "$XDG_DATA_HOME" ]] && export XDG_DATA_HOME="$HOME/.local/share"
[[ -z "$XDG_STATE_HOME" ]] && export XDG_STATE_HOME="$HOME/.local/state"

# Set default editor if not already set
export EDITOR="${EDITOR:-$(command -v vim 2>/dev/null || command -v nano 2>/dev/null || command -v vi 2>/dev/null || echo 'vi')}"
export FCEDIT="$EDITOR"

# SSH Agent Management is now handled via enabled/ directory loading

# If not running interactively, don't do anything
# Exception: Allow sourcing from bash_profile for login shells
case $- in
    *i*) ;;
      *) 
        # Check if we're being sourced from bash_profile (login shell context)
        if [ -n "${BASH_PROFILE_SOURCED:-}" ]; then
            # Allow sourcing even in non-interactive mode for login shells
            :
        else
            exit 0
        fi
        ;;
esac

# Shell options
set -o ignoreeof  # Prevent Ctrl+D from exiting bash (use 'exit' instead)

# History configuration
shopt -s histappend
export HISTCONTROL=ignoredups
export HISTFILE="$XDG_CACHE_HOME/bash/history"
export HISTFILESIZE="32768"
export HISTIGNORE='&:ls: ls *:[bf]g'
export HISTSIZE="$HISTFILESIZE"
export HISTTIMEFORMAT='%FT%T'$'\t'

# Create history file and symlink if it doesn't exist
if [[ ! -e $HISTFILE ]]; then
  mkdir -p "${HISTFILE%/*}"
  ln -svf "$HISTFILE" ~/.bash_history
fi

# Load core functions and colors
if [[ -f ~/.config/bash/rc.d/01-functions ]]; then
    source ~/.config/bash/rc.d/01-functions
else
    [[ -n "$DOTFILES_DEBUG" ]] && echo "debug: Functions file missing" >&2
fi

if [[ -f ~/.config/bash/rc.d/02-colours ]]; then
    source ~/.config/bash/rc.d/02-colours
else
    [[ -n "$DOTFILES_DEBUG" ]] && echo "debug: Colors file missing" >&2
fi

# Load enabled tools from enabled directory
# This happens AFTER rc.d functions are loaded so @has-cmd is available
if [[ -d ~/.config/bash/enabled ]]; then
    for script in ~/.config/bash/enabled/*.sh; do
        if [[ -r "$script" ]]; then
            source "$script"
        fi
    done
else
    [[ -n "$DOTFILES_DEBUG" ]] && echo "debug: Enabled tools directory missing" >&2
fi

# Load aliases
if [[ -f ~/.config/bash/aliases ]]; then
    source ~/.config/bash/aliases
fi

# Enable programmable completion
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

# Set up ghostship prompt
if command -v ghostship >/dev/null 2>&1; then
    # Define the missing 'defined' function that ghostship init depends on
    defined() {
        type "$1" &>/dev/null
    }
    
    # Ensure COLUMNS is set to prevent ghostship hang
    export COLUMNS="${COLUMNS:-80}"
    
    # Try to initialize ghostship, but handle errors gracefully
    if source <(ghostship init bash) 2>/dev/null; then
        # Ghostship initialized successfully
        [[ -n "$DOTFILES_DEBUG" ]] && echo "debug: ghostship init succeeded" >&2
    else
        [[ -n "$DOTFILES_DEBUG" ]] && echo "debug: ghostship init failed, using fallback prompt" >&2
        # Simple fallback prompt
        PS1='\u@\h:\w\$ '
    fi
else
    [[ -n "$DOTFILES_DEBUG" ]] && echo "debug: ghostship not available, using fallback prompt" >&2
    # Simple fallback prompt
    PS1='\u@\h:\w\$ '
fi

# Simple reload function
reload() {
    # Source the repository version directly to avoid circular reference
    source ~/.config/dotfiles/.config/bash/bashrc
}

# Check window size after each command
shopt -s checkwinsize

# Set debian chroot if available
if [ -z "${debian_chroot:-}" ] && [ -r /etc/debian_chroot ]; then
    debian_chroot=$(cat /etc/debian_chroot)
fi

# Simple prompt
PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w\$ '

# Enable color support of ls
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
fi

# Load bash aliases if they exist
if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi

# Enable programmable completion (consolidated)
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

export GPG_TTY=$(tty)
