#!/bin/bash
# Colour definitions and terminal capabilities
# PHASE: functions
# DEPENDENCIES: none

# Only set up colours if we have a terminal
if [[ -t 1 ]]; then
    # Export basic colors
    standout=$(tput smso)
    reset=$(tput sgr0)
    bold=$(tput bold)
    reverse=$(tput rev)
    dim=$(tput dim)
    underline=$(tput sgr 0 1)

    function setaf {
        local colors
        colors=$(tput colors 2>/dev/null || echo "8")
        if (( colors > 8 )); then
            tput setaf "$1" 2>/dev/null || echo -ne "\e[38;5;$1m"
        else
            echo -ne "\e[38;5;$1m"
        fi
    }

    # Base colors
    base00=$(setaf 241)
    base01=$(setaf 240)
    base02=$(setaf 235)
    base03=$(setaf 234)
    base04=$(setaf 244)
    base0=$(setaf 244)
    base1=$(setaf 245)
    base2=$(setaf 254)
    base3=$(setaf 230)

    # Named colors
    blue=$(setaf 33)
    cyan=$(setaf 37)
    green=$(setaf 190)
    magenta=$(setaf 125)
    orange=$(setaf 172)
    purple=$(setaf 141)
    red=$(setaf 160)
    violet=$(setaf 61)
    white=$(setaf 256)
    yellow=$(setaf 136)

    # Specific color variants
    blue_24=$(setaf 24)
    blue_30=$(setaf 30)
    blue_32=$(setaf 32)
    green_36=$(setaf 36)
    green_72=$(setaf 72)
    purple_96=$(setaf 96)
    red_124=$(setaf 124)
    red_162=$(setaf 162)
    orange_166=$(setaf 166)
    red_196=$(setaf 196)
    yellow_222=$(setaf 222)
    grey_236=$(setaf 236)
    grey_238=$(setaf 238)
    grey_240=$(setaf 240)
fi