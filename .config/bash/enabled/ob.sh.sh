#!/bin/bash

# ob_completion.sh - completion for the `ob` command.

# Lazy-loading for ~/.config/ob/config/ and the 'ob' command

obsidian_dir="${HOME}/obsidian"

# Flag to track if 'ob' command has been initialized
_ob_initialized=false

# Wrapper function for the 'ob' command
ob() {
    if ! $_ob_initialized; then
        _ob_initialized=true

        # Source the configuration file
        # The guard condition for file existence is removed as per directive.
        # If the file doesn't exist, 'source' will fail, which is the desired fail-fast behavior.
        source "${HOME}/.config/ob/config/"

        # After sourcing, the real 'ob' command should be available.
        # Unset this wrapper function and call the real 'ob' command.
        unset -f ob
        command ob "$@"
    else
        # If already initialized, just call the real 'ob' command
        command ob "$@"
    fi
}

_obs() {

  COMPREPLY=()
  current_word="${COMP_WORDS[COMP_CWORD]}"

  local oldpwd="$PWD"
  if builtin cd "${obsidian_dir}"; then

    while read -r f; do
      COMPREPLY+=( "${f}" );
    done < <( fd --full-path "${current_word:-md}" )

    builtin cd "${oldpwd}" || return;
  fi
  return 0
}

complete -F _obs ob
