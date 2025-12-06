#!/bin/bash

_cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions"
_completion_file="${_cache_dir}/glow"

# Create the cache directory if it doesn't exist.
mkdir -p "$_cache_dir"

# If the completion file doesn't exist, or if the glow binary is
# newer than the completion file, regenerate it.
if [[ ! -f "$_completion_file" || "$(command -v glow)" -nt "$_completion_file" ]]; then
  glow completion bash > "$_completion_file"
fi

# Source the completion file.
source "$_completion_file"
