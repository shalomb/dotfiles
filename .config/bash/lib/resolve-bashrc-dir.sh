#!/bin/bash
# AGENT_CONTEXT: Robust bashrc directory resolution with multiple fallbacks
# ARCHITECTURE: Fallback chain for different deployment scenarios
# DESIGN_PATTERN: Robust path resolution with graceful degradation

# Robust directory resolution with multiple fallbacks
# This function determines the correct BASHRC_DIR regardless of deployment method
resolve_bashrc_dir() {
    local bashrc_path
    local bashrc_dir
    local dotfiles_root
    local candidate_dir
    
    # Primary: Use actual location of bashrc file
    if [[ -L ~/.bashrc ]]; then
        # Symlink: follow to actual location
        bashrc_path=$(readlink -f ~/.bashrc 2>/dev/null)
        if [[ -n "$bashrc_path" ]]; then
            bashrc_dir=$(dirname "$bashrc_path")
        else
            # Fallback if readlink fails
            bashrc_dir=$(dirname ~/.bashrc)
        fi
    else
        # Regular file: use its location
        bashrc_dir=$(dirname ~/.bashrc)
    fi
    
    # Debug output if tracing is enabled
    if [[ "${BASHRC_TRACE_SOURCING:-0}" == "1" ]]; then
        echo "[resolve_bashrc_dir] Primary: $bashrc_dir" >&2
    fi
    
    # Fallback 1: Use XDG standard (prioritize home directory)
    candidate_dir="$HOME/.config/bash"
    if [[ -d "$candidate_dir" ]]; then
        if [[ "${BASHRC_TRACE_SOURCING:-0}" == "1" ]]; then
            echo "[resolve_bashrc_dir] Fallback 1: Using XDG standard at $candidate_dir" >&2
        fi
        echo "$candidate_dir"
        return 0
    fi
    
    # Fallback 2: Check if we're in a dotfiles repository
    if [[ -d "$bashrc_dir/.git" ]] && [[ -f "$bashrc_dir/.git/config" ]]; then
        # We're in the repository, use standard structure
        if [[ "${BASHRC_TRACE_SOURCING:-0}" == "1" ]]; then
            echo "[resolve_bashrc_dir] Fallback 2: Repository detected at $bashrc_dir" >&2
        fi
        echo "$bashrc_dir"
        return 0
    fi
    
    # Fallback 3: Check if we're in a dotfiles subdirectory
    # Only do this if we're not already in the home directory
    if [[ "$bashrc_dir" != "$HOME/.config/bash" ]]; then
        dotfiles_root=$(find "$bashrc_dir" -maxdepth 3 -name ".git" -type d 2>/dev/null | head -1)
        if [[ -n "$dotfiles_root" ]]; then
            dotfiles_root=$(dirname "$dotfiles_root")
            candidate_dir="$dotfiles_root/.config/bash"
            if [[ -d "$candidate_dir" ]]; then
                if [[ "${BASHRC_TRACE_SOURCING:-0}" == "1" ]]; then
                    echo "[resolve_bashrc_dir] Fallback 3: Found dotfiles at $candidate_dir" >&2
                fi
                echo "$candidate_dir"
                return 0
            fi
        fi
    fi
    
    # Fallback 4: Use bashrc directory (last resort)
    if [[ "${BASHRC_TRACE_SOURCING:-0}" == "1" ]]; then
        echo "[resolve_bashrc_dir] Fallback 4: Using bashrc directory at $bashrc_dir" >&2
    fi
    echo "$bashrc_dir"
    return 0
}

# Export function for use in bashrc
export -f resolve_bashrc_dir