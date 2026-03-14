#!/bin/bash

# https://github.com/ankitpokhrel/jira-cli

# Jira function with hierarchical config resolution and overlay merging
jira() {
  local current_dir="$PWD"
  local base_config="$HOME/.config/.jira/.config.yml"
  local config_files=()
  local merged_config=""
  local temp_config=""
  
  # Start with base config if it exists
  if [[ -f "$base_config" ]]; then
    config_files+=("$base_config")
  fi
  
  # Walk up directory tree collecting all .jira/config files
  # (most specific first, so they override parent configs)
  local collected_configs=()
  while [[ "$current_dir" != "/" ]]; do
    # Look for both .config.yml and config.yaml
    if [[ -f "$current_dir/.jira/.config.yml" ]]; then
      collected_configs+=("$current_dir/.jira/.config.yml")
    elif [[ -f "$current_dir/.jira/config.yaml" ]]; then
      collected_configs+=("$current_dir/.jira/config.yaml")
    fi
    current_dir="$(dirname "$current_dir")"
  done
  
  # Reverse the collected configs so base comes first, most specific last
  for ((i=${#collected_configs[@]}-1; i>=0; i--)); do
    config_files+=("${collected_configs[i]}")
  done
  
  # If we have multiple configs, merge them using Python
  if [[ ${#config_files[@]} -gt 1 ]]; then
    # Create temporary merged config
    temp_config="$(mktemp --suffix=.yaml)"
    
    # Use uvx to run Python script with PyYAML dependency
    uvx --with pyyaml python "$HOME/.config/dotfiles/.config/bash/tools/merge_jira_configs.py" "${config_files[@]}" > "$temp_config"
    merged_config="$temp_config"
  elif [[ ${#config_files[@]} -eq 1 ]]; then
    merged_config="${config_files[0]}"
  else
    echo "jira: Error: No configuration files found" >&2
    return 1
  fi
  
  # Set JIRA_API_TOKEN from token file and run jira with the resolved config
  local jira_token=""
  if [[ -f "$HOME/.config/.jira/.token.env" ]]; then
    # Read the last JIRA_API_TOKEN from the file
    jira_token=$(grep "^JIRA_API_TOKEN=" "$HOME/.config/.jira/.token.env" | tail -1 | cut -d'=' -f2- | tr -d "'\"")
  fi
  
  # Run jira with environment variables set only for this command
  JIRA_API_TOKEN="$jira_token" JIRA_CONFIG_FILE="$merged_config" command jira "$@"
  
  # Clean up temporary file
  [[ -n "$temp_config" && -f "$temp_config" ]] && rm -f "$temp_config"
}

# Bash completion setup
_cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions"
_completion_file="${_cache_dir}/jira"

# Create the cache directory if it doesn't exist.
mkdir -p "$_cache_dir"

# If the completion file doesn't exist, or if the jira binary is
# newer than the completion file, regenerate it.
if [[ ! -f "$_completion_file" || "$(command -v jira)" -nt "$_completion_file" ]]; then
  command jira completion bash > "$_completion_file"
fi

# Source the completion file.
source "$_completion_file"
