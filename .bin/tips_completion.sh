#!/bin/bash

# tips_completion.sh - completion for the `tips' command.

tips_dir="${tips_dir:- ~/Desktop/tips}"

_tips() {

  local cur prev opts
  local compwords=()
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  opts=""

  oldpwd="$PWD"
  cd "$tips_dir"

  while read f; do 
    COMPREPLY+=( "$f" );
  done < <( find * \( -name ".hg" -type d -o -name ".*" \) -prune -o -type f -iname "*$cur*" -printf '%p\n' )
  
  cd "$oldpwd";
  return 0
}

complete -F _tips tips