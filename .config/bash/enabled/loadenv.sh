#!/bin/bash

# AGENT_CONTEXT: loadenv function for loading environment variables from .env files or pass vaults
# ARCHITECTURE: Function that manipulates caller's environment, must be sourced
# DESIGN_PATTERN: Recursive function that loads .env files and pass secrets

loadenv() {
  target="${1:-.}"

  if [[ $target == "." && -f .env ]]; then
    c1=0
    while IFS= read -r -d '' line; do ((c1++)); done < <(env -0)
    set -a
    echo >&2 "Loading variables from .env"
    source .env
    set +a
    if [[ -n $passref ]]; then
      echo "Loading pass ref: $passref"
      echo ''
      loadenv "$passref"
    fi
    set +a
    c2=0
    while IFS= read -r -d '' line; do ((c2++)); done < <(env -0)
    echo "$((c2 - c1)) new variables loaded"

  else
    target="${target%.gpg}.gpg"
    if pass git cat-file -e HEAD:"$target" 2>&1 | grep -q 'does not exist'; then
      echo "No pass secret found"
      return
    else
      pass git log -1 "$target" | cat -
      target="${target%.gpg}"
      echo ''
      source <(pass show "$target")
      echo ''
      echo "OK: Loaded pass ref: $target"
      return
    fi
  fi

  dir_location=$(command pwd -P)

  git_root=$(git rev-parse --show-toplevel 2>/dev/null || true)

  for d in $git_root $dir_location; do
    d=${d#$HOME/}
    echo >&2 -n "Trying to load pass ref: $d ... "
    loadenv "$d"
  done
}

# vim: syntax=sh cc=80 tw=79 ts=2 sw=2 sts=2 et sr
