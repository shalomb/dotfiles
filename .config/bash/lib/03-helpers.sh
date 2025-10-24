#!/bin/bash
# Helper functions for shell interaction
# PHASE: functions
# DEPENDENCIES: colours

# Warning and error functions
warn() {
    echo >&2 "${bold}${red}$@${reset}"
}

die() {
    warn "$@"
    return 1  # NOTE: not exit to allow for proper use
              #       in interactive shells where this
              #       would otherwise exit the shell
}

# Title setting function
function set-title() {
    local text="$1"
    [[ -z $text ]] &&
        text='\033]0;${debian_chroot}${USER}@${screen_session:-$HOSTNAME}:$$: ${PWD/$HOME/~}\007'
    echo -ne "$text"
}

# Directory change hook
function chpwd() {
    # called everytime working directory is changed
    CDPATH="$PWD:$OLDPWD:..:~:/media:/mnt:$HOME/projects"
}

# Bell alert function
function bell-alert() {
    printf '\a'

    if [[ $# && $TMUX ]]; then
        tmux list-clients -F "#{client_name}" |
            xargs -I{} tmux display-message -c {} "$@"
    fi
}