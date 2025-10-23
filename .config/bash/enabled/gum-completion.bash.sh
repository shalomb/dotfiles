#!/bin/bash
# AGENT_CONTEXT: gum bash completion script
# ARCHITECTURE: enabled/ -> symlinks -> lib/ or tools/
# DESIGN_PATTERN: Completion script for gum CLI tool

# Enable gum bash completion
if command -v gum >/dev/null 2>&1; then
    # Source gum completion if available
    if gum completion bash >/dev/null 2>&1; then
        source <(gum completion bash)
    else
        echo "Warning: gum completion not available" >&2
    fi
else
    echo "Warning: gum command not found" >&2
fi