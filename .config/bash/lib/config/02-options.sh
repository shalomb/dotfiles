#!/bin/bash
# Shell options configuration
# PHASE: config
# DEPENDENCIES: none

# Shell options
set -o ignoreeof

# Check window size after each command
shopt -s checkwinsize

# Enable color support for ls
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
fi