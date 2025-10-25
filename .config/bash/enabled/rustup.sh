#!/bin/bash

# Exit if rustup command does not exist.
# This will cause a failure, which is the desired behavior
# if the environment is not set up correctly.
command -v rustup >/dev/null || return 1

_cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions"
_completion_file="${_cache_dir}/rustup"

# Create the cache directory if it doesn't exist.
mkdir -p "$_cache_dir"

# If the completion file doesn't exist, or if the rustup binary is
# newer than the completion file, regenerate it.
if [[ ! -f "$_completion_file" || "$(command -v rustup)" -nt "$_completion_file" ]]; then
  rustup completions bash > "$_completion_file"
fi

# Source the completion file.
source "$_completion_file"