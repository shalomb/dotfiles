#!/bin/bash
# GPG Pre-flight Check for Cursor Agent Sessions
# Silent function that ensures GPG is properly configured

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

# Strict cursor-agent function - no fallback, GPG must work
_cursor_agent_strict() {
    if ! _cursor_gpg_check; then
        echo "cursor-agent: GPG check failed - fix GPG setup before continuing" >&2
        exit 1
    fi
    # Set memory limits before running cursor-agent
    # -m: max memory size (2GB), -v: virtual memory (4GB), -d: data segment (1GB)
    ulimit -m 2097152 -v 4194304 -d 1048576
    nice -n 15 command cursor-agent "$@"
}

# Create alias to the strict function
alias cursor-agent='_cursor_agent_strict'

# Export the function
export -f _cursor_gpg_check

# GPG Agent Setup Instructions
# ============================
# To enable GPG signing for cursor-agent sessions:
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
# 4. Now cursor-agent will use GPG signing instead of --no-gpg-sign
#
# Note: If GPG check fails, cursor-agent will REFUSE TO START.
# This ensures all commits are properly GPG signed.
# Fix GPG setup before using cursor-agent.