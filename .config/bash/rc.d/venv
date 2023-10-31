#!/bin/bash

function mkvenv() {
  python3 -m venv "${1:-venv}"
  touch requirements.txt
}

function activate() {
  local venv="${1:-venv}"
  if [[ -d venv ]]; then
    venv="venv"
  elif [[ -d .venv ]]; then
    venv=".venv"
  fi
  if [[ ! -d $venv ]]; then
    echo >&2 "Requested venv ($venv) not present"
  fi
  echo >&2 -n "Activating $venv $(readlink -f $venv) .. "
  if source $venv/bin/activate; then
    echo >&2 "OK"
  else
    echo >&2 "Failed: $?"
  fi
}
