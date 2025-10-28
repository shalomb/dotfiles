#!/bin/bash
# Amazon Q CLI integration with lazy-loading
# AGENT_CONTEXT: Amazon Q AI assistant shell integration
# ARCHITECTURE: Lazy-loading wrapper function
# DESIGN_PATTERN: Conditional loading based on command availability, deferring initialization

# Check if the real 'q' command exists. If not, there's nothing to lazy-load.
if ! command -v q >/dev/null 2>&1; then
    return 0
fi

# Define a flag to track if Amazon Q has been initialized
_amazon_q_initialized=false

# Wrapper function for the 'q' command
q() {
    if ! $_amazon_q_initialized; then
        # Mark as initialized to prevent re-running this block
        _amazon_q_initialized=true

        # Source Amazon Q shell integration
        # Pre-initialization hooks
        [[ -f "${HOME}/.local/share/amazon-q/shell/bashrc.pre.bash" ]] && \
            source "${HOME}/.local/share/amazon-q/shell/bashrc.pre.bash"

        # Post-initialization hooks
        [[ -f "${HOME}/.local/share/amazon-q/shell/bashrc.post.bash" ]] && \
            source "${HOME}/.local/share/amazon-q/shell/bashrc.post.bash"

        # After sourcing, the real 'q' command should be available.
        # Unset this wrapper function and call the real 'q' command.
        unset -f q
        command q "$@"
    else
        # If already initialized, just call the real 'q' command
        command q "$@"
    fi
}
