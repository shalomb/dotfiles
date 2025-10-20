#!/bin/bash
# Cursor Agent GPG Integration
# ===========================
# This script provides a cursor-agent wrapper that ensures GPG signing works
# properly in AI agent environments. It performs pre-flight validation and
# sets up the correct environment to prevent interactive prompts.
#
# The cursor-agent function runs in FOREGROUND (not background) to maintain
# proper job control and allow AI agents to interact correctly.

_cursor_gpg_check() {
    local exit_code=0
    local signing_key

    # Check if GPG signing is enabled
    if ! git config --get commit.gpgsign >/dev/null 2>&1; then
        echo "GPG signing is not properly configured"
        exit_code=1
    elif [[ "$(git config --get commit.gpgsign)" != "true" ]]; then
        echo "GPG signing is not properly configured"
        exit_code=1
    fi

    # Check if signing key is configured
    signing_key=$(git config --get user.signingkey 2>/dev/null)
    if [[ -z "$signing_key" ]]; then
        echo "No GPG signing key configured"
        exit_code=1
    fi

    # Test GPG signing without prompts
    if [[ $exit_code -eq 0 ]]; then
        if ! echo 'test' | gpg --clearsign --default-key "$signing_key" --batch --yes >/dev/null 2>&1; then
            echo "GPG signing requires interaction - cursor-agent will hang"
            exit_code=1
        fi
    fi

    # Check GPG agent status
    if [[ $exit_code -eq 0 ]]; then
        if ! gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
            echo "GPG agent not responsive - run: gpg-connect-agent /bye"
            exit_code=1
        fi
    fi

    return $exit_code
}

# Cursor Agent with GPG Validation
# ================================
# This function ensures cursor-agent runs with proper GPG signing capability.
# It performs pre-flight checks and sets up the environment correctly.
#
# Key Features:
# - Validates GPG configuration before starting cursor-agent
# - Prevents terminal interaction issues by unsetting GPG_TTY
# - Runs in foreground (not background) for proper job control
# - Uses nice priority to prevent system impact
#
# Why not background (&): 
# - Background processes lose terminal control
# - AI agents need interactive capabilities
# - Job control issues with disown cause problems
# - Foreground execution allows proper error handling
_cursor_agent_strict() {
    if ! _cursor_gpg_check; then
        echo "cursor-agent: GPG check failed - fix GPG setup before continuing" >&2
        return 1
    fi
    
    # Environment setup for cursor-agent
    # - Unset GPG_TTY to prevent terminal interaction prompts
    # - Use nice to reduce system priority
    # - Run in foreground for proper job control and error handling
    GPG_TTY=/dev/null nice -n 15 /usr/bin/env cursor-agent "$@"
}

# Create alias to the strict function
alias cursor-agent='_cursor_agent_strict'

# Export the function
export -f _cursor_gpg_check

# GPG Setup Instructions
# ======================
# Before using cursor-agent, ensure GPG is properly configured:
#
# 1. Start GPG agent:
#    gpg-connect-agent /bye
#
# 2. Unlock your GPG key (if needed):
#    gpg --sign --default-key YOUR_KEY_ID < /dev/null
#
# 3. Verify GPG check passes:
#    _cursor_gpg_check
#
# 4. Test cursor-agent:
#    cursor-agent --help
#
# IMPORTANT: This function runs cursor-agent in FOREGROUND, not background.
# This ensures proper job control and allows AI agents to interact correctly.
# Background execution (&) causes terminal control issues and should be avoided.
#
# If GPG check fails, cursor-agent will REFUSE TO START.
# This ensures all commits are properly GPG signed.