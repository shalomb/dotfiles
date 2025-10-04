#!/bin/sh

# Do not use gnome-keyring to prompt to unlock keys
# Handle both TTY and non-TTY contexts (like cursor-agent)
if [[ -t 0 ]]; then
    # We're in a TTY context - use actual TTY
    GPG_TTY=$(tty); export GPG_TTY;
else
    # We're in a non-TTY context (like cursor-agent)
    # Use existing GPG_TTY or set to /dev/null
    export GPG_TTY="${GPG_TTY:-/dev/null}"
fi
