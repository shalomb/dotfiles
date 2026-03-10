#!/bin/sh
# PATH setup (POSIX compliant)
# PHASE: env
# DEPENDENCIES: XDG_DATA_HOME (for Go binaries)

# Only set PATH if not already set (allow parent shell to override)
# This check is POSIX compliant
if [ -z "${PATH_SET_BY_PROFILE:-}" ]; then
    # Start with system defaults
    PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"

    # Helper function to add a directory to PATH
    _add_to_path() {
        PATH="$1:$PATH"
    }

    # Add user directories in priority order (last added = highest priority)
    _add_to_path "/usr/share/perl6/site/bin"
    _add_to_path "$HOME/.arkade/bin"
    _add_to_path "$HOME/.rbenv/bin"
    _add_to_path "$HOME/.nvm"
    _add_to_path "$HOME/.venv/bin"
    # XDG_DATA_HOME might not be set yet if 01-xdg.sh is sourced after this
    # So, use default for bob/nvim-bin if XDG_DATA_HOME is not available
    _add_to_path "${XDG_DATA_HOME:-$HOME/.local/share}/bob/nvim-bin"
    _add_to_path "$HOME/.cargo/bin"
    _add_to_path "$HOME/go/bin"
    _add_to_path "${XDG_DATA_HOME:-$HOME/.local/share}/go/bin"
    _add_to_path "$HOME/.local/bin"
    _add_to_path "$HOME/.config/bin"

    export PATH
    export PATH_SET_BY_PROFILE=1

    unset -f _add_to_path
fi