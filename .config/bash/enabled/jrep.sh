#!/bin/bash

function jrep() {
  local query=""
  if (( $# == 2 )); then
    local query="$1"
    local file="$2"
  else
    local file="$1"
  fi
  gron "$file" | fzf -q "$query" | while read -r k _; do
    q="$k"
    if [[ $k == @(json.|json)* ]]; then
      q=".${k#@(json.|json)}"
    fi
    ( set -xv;
      jq -Ser "$q" "$file"
    )
  done
}
