#!/bin/bash
# Shell options configuration
# PHASE: config
# DEPENDENCIES: none
# NOTE: sourced by every shell via bashrc; interactive-only settings are guarded.

# Remove duplicates and non-existent directories from the colon-separated
# variable whose NAME is passed in (e.g. `clean_path PATH`).
clean_path() {
    local -n _cp_ref="$1"
    local -A _cp_seen=()
    local _cp_out="" _cp_dir
    local IFS=:
    for _cp_dir in $_cp_ref; do
        _cp_dir="${_cp_dir%/}"
        [[ -n $_cp_dir && -d $_cp_dir && -z ${_cp_seen[$_cp_dir]:-} ]] || continue
        _cp_seen[$_cp_dir]=1
        _cp_out+="${_cp_out:+:}$_cp_dir"
    done
    _cp_ref="$_cp_out"
}

# Check window size after each command
shopt -s checkwinsize

# Enable color support for ls
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
fi

# Everything below is interactive-only
[[ $- == *i* ]] || return 0

shopt -s cdable_vars cdspell checkhash mailwarn
shopt -s histreedit histverify
shopt -s no_empty_cmd_completion sourcepath
shopt -u huponexit

# Prevent Ctrl+D exiting the shell until pressed IGNOREEOF+1 times
set -o ignoreeof   # (also resets IGNOREEOF to 10, so set it after)
export IGNOREEOF=5
set -o vi
set -o notify
