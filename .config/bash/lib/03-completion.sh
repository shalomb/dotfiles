#!/bin/bash
# Bash completion setup
# PHASE: config
# DEPENDENCIES: none

# Load bash completion if available
if ! shopt -oq posix; then
    if [ -f /usr/share/bash-completion/bash_completion ]; then
        . /usr/share/bash-completion/bash_completion
    elif [ -f /etc/bash_completion ]; then
        . /etc/bash_completion
    fi
fi

# Load additional aliases
if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi