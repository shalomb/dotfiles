#!/bin/bash
# Amazon Q CLI integration
# AGENT_CONTEXT: Amazon Q AI assistant shell integration
# ARCHITECTURE: Source Amazon Q provided integration hooks
# DESIGN_PATTERN: Conditional loading based on command availability

# Only run in interactive shells
[[ ${-//[!i]/} ]] || return

# Source Amazon Q shell integration if available
if command -v q >/dev/null 2>&1; then
    # Pre-initialization hooks
    [[ -f "${HOME}/.local/share/amazon-q/shell/bashrc.pre.bash" ]] &&
        source "${HOME}/.local/share/amazon-q/shell/bashrc.pre.bash"

    # Post-initialization hooks
    [[ -f "${HOME}/.local/share/amazon-q/shell/bashrc.post.bash" ]] &&
        source "${HOME}/.local/share/amazon-q/shell/bashrc.post.bash"
fi
