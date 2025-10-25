#!/bin/bash

# Name: delta.sh
# Description: Configures delta (a Git diff viewer) and provides bash completion.
# Usage: Sourced by .bashrc. Defines test-delta function.



export DELTA_FEATURES='+side-by-side +line-numbers'
export DELTA_PAGER='less --tabs=2 -Rn'
export GIT_PAGER='delta'
export GIT_CONFIG_NOSYSTEM=1

_cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions"
_completion_file="${_cache_dir}/delta"

# Create the cache directory if it doesn't exist.
mkdir -p "$_cache_dir"

# If the completion file doesn't exist, or if the delta binary is
# newer than the completion file, regenerate it.
if [[ ! -f "$_completion_file" || "$(command -v delta)" -nt "$_completion_file" ]]; then
  delta --generate-completion bash > "$_completion_file"
fi

# Source the completion file.
source "$_completion_file"

function test-delta {
  git show
  git diff
  git add -p
  git reflog -p
}
