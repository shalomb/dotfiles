#!/bin/bash

# AGENT_CONTEXT: Terraform environment variables and configuration
# ARCHITECTURE: Environment setup only, no functions (functions are in .local/bin/)
# DESIGN_PATTERN: Minimal environment configuration, executable scripts for functionality

TF_CONFIG_DIR="$HOME/.terraform.d"

export TF_PLUGIN_CACHE_DIR="$HOME/.cache/terraform.d/plugin-cache"

[[ ! -d "$TF_PLUGIN_CACHE_DIR" ]] && mkdir -p "$TF_PLUGIN_CACHE_DIR"

unset TF_CLI_CONFIG_FILE
# export TF_CLI_CONFIG_FILE="$TF_CONFIG_DIR/terraform.rc"
