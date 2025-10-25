#!/bin/bash

# https://github.com/ankitpokhrel/jira-cli

# Jira function with hierarchical config resolution
jira() {
  local current_dir="$PWD"
  local project_config=""
  local base_config="$HOME/.config/.jira/.config.yml"
  local config_file=""
  
  # Walk up directory tree looking for .jira/config.yaml
  while [[ "$current_dir" != "/" ]]; do
    if [[ -f "$current_dir/.jira/config.yaml" ]]; then
      project_config="$current_dir/.jira/config.yaml"
      break
    fi
    current_dir="$(dirname "$current_dir")"
  done
  
  # Use project config if found, otherwise base config
  config_file="${project_config:-$base_config}"
  
  # Show debug output
  if [[ -n "$project_config" ]]; then
    echo "jira: Using project config: $project_config"
  else
    echo "jira: Using base config: $base_config"
  fi
  echo "jira: Full command: JIRA_CONFIG_FILE='$config_file' command jira $*"
  
  # Run jira with the resolved config
  JIRA_CONFIG_FILE="$config_file" command jira "$@"
}

# Bash completion setup
_cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions"
_completion_file="${_cache_dir}/jira"

# Create the cache directory if it doesn't exist.
mkdir -p "$_cache_dir"

# If the completion file doesn't exist, or if the jira binary is
# newer than the completion file, regenerate it.
if [[ ! -f "$_completion_file" || "$(command -v jira)" -nt "$_completion_file" ]]; then
  jira completion bash > "$_completion_file"
fi

# Source the completion file.
source "$_completion_file"
