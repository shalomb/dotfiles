#!/bin/bash
set -e

# Handle apply argument from existing patch system
if [ "$1" = "apply" ]; then
    shift
fi

# Cursor Agent Bash Initialization Patch
# Adds `G8n+` prefix to bash command execution to ensure proper bash initialization

echo "Patching cursor-agent installations..."

# Find and patch all cursor-agent installations
if [ -d "$HOME/.local/share/cursor-agent/versions" ]; then
    for version_dir in "$HOME/.local/share/cursor-agent/versions"/*/; do
        if [ -f "$version_dir/index.js" ]; then
            echo "Patching $version_dir"
            "$(dirname "$0")/cursor-agent-helper.sh" "$version_dir"
        fi
    done
else
    echo "Cursor-agent not found in expected location"
    exit 1
fi

echo "All cursor-agent installations patched!"
