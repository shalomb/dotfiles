#!/bin/bash
# History configuration
# PHASE: config
# DEPENDENCIES: XDG_CACHE_HOME

# Enable history appending
shopt -s histappend

# History settings
export HISTCONTROL=ignoredups
export HISTFILESIZE="32768"
export HISTIGNORE="&:ls: ls *:[bf]g:set +o *:set -o *:shopt *:dump_bash_state*"
export HISTSIZE="$HISTFILESIZE"
export HISTTIMEFORMAT='%FT%T'$'\t'