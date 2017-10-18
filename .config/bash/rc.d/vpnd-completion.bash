#!/bin/bash

# SYNOPSIS
#   vpnd(1) VPN completion

_vpnd_completion() {
  local current_word previous_word options

  COMPREPLY=()
  current_word="${COMP_WORDS[COMP_CWORD]}"
  previous_word="${COMP_WORDS[COMP_CWORD-1]}"
  options=""

	local vpns=( $(
			cd ~/.config/vpnd/ &&
			find * -type f -iname "*$current_word*" -printf '%p\n'
	) )

  COMPREPLY=( $(compgen -W "${vpns[*]}" ) );
}

complete -F _vpnd_completion vpnd

