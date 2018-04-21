#!/bin/bash

shopt -s histappend

# append history entries to ~/.config/bash/bash_history
HISTCONTROL=ignoredups
HISTFILE="$XDG_CACHE_HOME/bash/history"
HISTFILESIZE="32768"
HISTIGNORE='&:ls: ls *:[bf]g'
HISTSIZE="$HISTFILESIZE"
HISTTIMEFORMAT='%FT%T'$'\t'
HISTCONTROL=ignoredups

if [[ ! -e $HISTFILE ]]; then
  mkdir -p "${HISTFILE%/*}"
  ln -svf "$HISTFILE" ~/.bash_history
fi

