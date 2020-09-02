#!/bin/bash

# tips_completion.sh - completion for the `tips' command.

if [[ -e ~/.config/tips/config ]]; then
  source ~/.config/tips/config
fi

tipsdir="${tipsdir:-$HOME/tips}"

_tips() {

  local current_word previous_word options
  local compwords=()
  COMPREPLY=()
  current_word="${COMP_WORDS[COMP_CWORD]}"
  previous_word="${COMP_WORDS[COMP_CWORD-1]}"
  options=""

  local oldpwd="$PWD"
  if builtin cd "$tipsdir"; then

    while read f; do
      COMPREPLY+=( "$f" );
    done < <( find * \( -name ".hg" -type d -o -name ".*" \) -prune -o -type f -ipath "*$current_word*" -printf '%p\n' )

    builtin cd "$oldpwd";
  fi
  return 0
}

complete -F _tips tips
