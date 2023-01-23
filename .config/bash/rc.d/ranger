#!/bin/bash

ranger() {
  if [[ -z ${RANGER_LEVEL-} ]]; then
    command ranger "$@"
  else
    exit
  fi
}

alias rng='ranger'
alias rnG='ranger /'
alias rng~='ranger ~'
