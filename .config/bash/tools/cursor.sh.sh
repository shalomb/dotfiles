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

# Enhanced cursor-agent alias with silent GPG check
alias cursor-agent='_cursor_gpg_check >/dev/null 2>&1 || (_cursor_gpg_check && [[ -n "$PS1" ]] && echo "cursor-agent: GPG check failed, but continuing in interactive shell"); command cursor-agent'

# Export the function
export -f _cursor_gpg_check
