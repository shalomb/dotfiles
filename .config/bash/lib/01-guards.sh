#!/bin/bash
# Guard and check functions
# PHASE: functions
# DEPENDENCIES: none

# Check if command exists
has-cmd() {
    command -v "$1" >/dev/null 2>&1
}

# Compatibility alias
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