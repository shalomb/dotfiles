#!/bin/bash

function gen-rustup-completions() {
  local TMPFILE="$(mktemp)"
  rustup completions bash > "$TMPFILE"
  source "$TMPFILE"
  rm -f "$TMPFILE"
}

gen-rustup-completions
