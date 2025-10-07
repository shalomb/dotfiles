#!/bin/bash

# ob_completion.sh - completion for the `ob' command.

if [[ -e ~/.config/ob/config ]]; then
  source ~/.config/ob/config/
fi

obsidian_dir="$HOME/obsidian"

_obs() {

  COMPREPLY=()
  current_word="${COMP_WORDS[COMP_CWORD]}"

  local oldpwd="$PWD"
  if builtin cd "$obsidian_dir"; then

    while read -r f; do
      COMPREPLY+=( "$f" );
    done < <( fd --full-path "${current_word:-md}" )

    builtin cd "$oldpwd" || return;
  fi
  return 0
}

complete -F _obs ob
