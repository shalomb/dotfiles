#!/bin/bash

set -a

TODO_BASE=~/.config/todo
TODO_BASE_CFG="$TODO_BASE/todo.cfg"
TODO_BASE_CACHE="${TMP}/.todo.base.cache.$USER"
TODO_DIR=~/TODO
TODOTXT_DEFAULT_ACTION=ls
TODOTXT_SORT_COMMAND='env LC_COLLATE=C sort -k 2,2 -k 1,1n'

PATH="$PATH:$TODO_BASE"

touch "$TODO_BASE_CACHE"

function find_todo_base() {
  local dir="${1:-$PWD}"
  local todo_base_file="$dir/.todo.cfg"

  if [[ -e "$todo_base_file" ]]; then
    echo "$todo_base_file" && return
  fi

  if [[ $dir = / ]]; then
    if [[ -e $TODO_BASE_BASE ]]; then
      echo "$TODO_BASE_BASE" && return
    fi
    return
  fi

  find_todo_base $(readlink -f "$dir/..")
}

function t() {
  local cmd="$1"

  local local_todo_base=$(find_todo_base)

  if [[ -e $local_todo_base ]]; then
    source "$local_todo_base"
  fi

  local WHITE=$(tput setaf 256)
  local WHITE=$(tput setaf 7)
  local BOLD=$(tput bold)
  local RESET=$(tput sgr0)

  [[ ${DEBUG-} ]] && set -xv

  if [[ $cmd ]];then
    case "$cmd" in
      edit|e)
        shift
        "$EDITOR" "$TODO_DIR" "${@:-+/\vtodo.txt|txt}"
        return
      ;;
      help|h)
        shift
        "$TODO_BASE/todo.sh" -d "${local_todo_base}" "help" | less -SL +/"${@:-Usage}"
        return
      ;;
      list_projects|lsp)
        shift
        if [[ -e $TODO_BASE/projects.txt ]]; then
          cat "$TODO_BASE/projects.txt"
        else
          echo "Projects file '$TODO_BASE/projects.txt' missing or empty"
        fi
        return
      ;;
    esac
  fi

  if [[ -e $local_todo_base ]]; then
    echo "${RESET}${WHITE}${BOLD}Project : ${local_todo_base%/*}${RESET}"
    echo ""
  fi

  "$TODO_BASE/todo.sh" -d "${local_todo_base:-$TODO_BASE/todo.cfg}" -t "$@"
  [[ ${DEBUG-} ]] && set +xv
}

alias ta='t add '
alias tl='t ls '
alias te='"$EDITOR" "$TODO_DIR" '

source "$TODO_BASE/todo_completion"
complete -F _todo t

set +a
