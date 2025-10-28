#!/bin/bash

if [[ -e $HOME/.cargo/bin ]]; then
  PATH="$PATH:$HOME/.cargo/bin"
fi

if [[ -n "${HOME:-}" && -r "$HOME/.cargo/env" ]]; then
  source "$HOME/.cargo/env"
fi
