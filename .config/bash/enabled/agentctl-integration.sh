#!/bin/bash
# AGENT_CONTEXT: Unified agent management integration
# ARCHITECTURE: Bash wrapper around Python agentctl implementation
# DESIGN_PATTERN: Function wrapper with automatic state restoration

# Only run in interactive shells
[[ ${-//[!i]/} ]] || return

# Bash wrapper function for agentctl
# Automatically restores shell state when Python outputs export statements
agentctl() {
    local output
    local exit_code
    local temp_file

    # Use temp file to capture both stdout and exit code reliably
    temp_file=$(mktemp)
    trap "rm -f '$temp_file'" RETURN

    # Call the Python implementation with --shell flag for automatic state restoration
    # Use absolute path to dotfiles directory to ensure module can be found
    local dotfiles_dir
    dotfiles_dir="${DOTFILES_DIR:-$HOME/.config/dotfiles}"
    
    # Validate dotfiles directory exists and contains the required module
    if [[ ! -d "$dotfiles_dir" ]]; then
        echo "Error: DOTFILES_DIR '$dotfiles_dir' does not exist" >&2
        return 1
    fi
    
    if [[ ! -f "$dotfiles_dir/src/agent_management/agentctl.py" ]]; then
        echo "Error: agentctl.py not found in '$dotfiles_dir/src/agent_management/'" >&2
        return 1
    fi
    
    # Change to dotfiles directory and run agentctl
    if (cd "$dotfiles_dir" && uv run python -m agent_management.agentctl --shell "$@") > "$temp_file" 2>&1; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Read output
    output=$(cat "$temp_file")

    # Check if output contains export statements (state restoration)
    if echo "$output" | grep -q '^export '; then
        # Eval exports to update current shell environment
        eval "$output"
    else
        # Just print regular output
        echo "$output"
    fi

    return $exit_code
}

# Export function for use in subshells
export -f agentctl

# Initialize agents on shell startup (suppress output)
if command -v uv >/dev/null 2>&1; then
    agentctl init >/dev/null 2>&1 || true
fi
