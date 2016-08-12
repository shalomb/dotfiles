#!/bin/bash

if type -P rbenv &>/dev/null; then
  for dir in /usr/src/rbenv ~/.rbenv; do
    if [[ -e $dir ]]; then
      export PATH="$dir:$PATH"
      eval "$(rbenv init -)"
      export RBENV_ROOT="$dir"
    fi
  done
fi
