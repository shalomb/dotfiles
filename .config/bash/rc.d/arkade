#!/bin/bash

# https://github.com/alexellis/arkade

install-arkade() {
( TMPDIR=$(mktemp -d);
  cd "$TMPDIR";
  curl -sLS https://dl.get-arkade.dev | sh
  install -m775 arkade ~/.local/bin/arkade
  ln -sf ~/.local/bin/arkade ~/.local/bin/ark
  rm -f arkade
  ark --help
  )
}

PATH="$PATH:$HOME/.arkade/bin"
