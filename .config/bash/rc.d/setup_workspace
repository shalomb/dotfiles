#!/bin/bash

function ws {
  cd ~/workspace
  for f in .workspacerc; do
    if [[ -r $f ]]; then
      source "$f"
    fi
  done
}
