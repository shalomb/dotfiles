#!/bin/bash
# Cursor Agent GPG Integration
# ===========================
# MANDATORY: GPG signing is REQUIRED for all commits - NO EXCEPTIONS
# This script provides a cursor-agent wrapper that ENFORCES GPG signing
# and BLOCKS cursor-agent if GPG is not properly configured.
#
# Agents MUST fix GPG issues before using cursor-agent - circumventing is NOT ALLOWED
# The cursor-agent function runs in FOREGROUND (not background) to maintain
# proper job control and allow AI agents to interact correctly.

_cursor_gpg_check() {
    local exit_code=0
    local signing_key
    local error_msg=""

    # DEBUG: Log GPG check
    {
        echo ">>> _cursor_gpg_check called at $(date '+%H:%M:%S')"
        echo "    Parent: $(ps -p $PPID -o comm= 2>/dev/null || echo 'unknown')"
    } >> /tmp/cursor-agent-calls.log 2>&1

    # Check if GPG signing is enabled
    if ! git config --get commit.gpgsign >/dev/null 2>&1; then
        error_msg="GPG signing is not configured - MANDATORY for all commits"
        exit_code=1
    elif [[ "$(git config --get commit.gpgsign)" != "true" ]]; then
        error_msg="GPG signing is disabled - MANDATORY for all commits"
        exit_code=1
    fi

    # Check if signing key is configured
    if [[ $exit_code -eq 0 ]]; then
        signing_key=$(git config --get user.signingkey 2>/dev/null)
        if [[ -z "$signing_key" ]]; then
            error_msg="No GPG signing key configured - MANDATORY for all commits"
            exit_code=1
        fi
    fi

    # Test GPG signing without prompts
    if [[ $exit_code -eq 0 ]]; then
        if ! echo 'test' | gpg --clearsign --default-key "$signing_key" --batch --yes >/dev/null 2>&1; then
            error_msg="GPG signing test failed - key may be locked or expired"
            exit_code=1
        fi
    fi

    # Check GPG agent status using unified agent command
    if [[ $exit_code -eq 0 ]]; then
        if ! agent gpg status >/dev/null 2>&1; then
            error_msg="GPG agent not responsive - run: agent gpg recover"
            exit_code=1
        fi
    fi

    if [[ $exit_code -ne 0 ]]; then
        echo "❌ $error_msg"
        echo "🚨 MANDATORY: GPG signing is REQUIRED - agents must fix this issue"
        echo "   No workarounds or circumventions allowed"
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
cursor-agent() {
    # DEBUG: Log all invocations with context
    {
        echo "=== cursor-agent invoked at $(date '+%Y-%m-%d %H:%M:%S.%N' | cut -c1-23) ==="
        echo "PPID: $PPID ($(ps -p $PPID -o comm= 2>/dev/null || echo 'unknown'))"
        echo "PWD: $PWD"
        echo "Args: $@"
        echo "Parent process: $(ps -p $PPID -o cmd= 2>/dev/null || echo 'unknown')"
        echo "Grandparent: $(ps -p $(ps -p $PPID -o ppid= 2>/dev/null) -o cmd= 2>/dev/null || echo 'unknown')"
        echo "Environment markers:"
        env | grep -i "cursor\|marker\|state" || echo "  (none found)"
        echo ""
    } >> /tmp/cursor-agent-calls.log 2>&1

    echo "🔐 Validating GPG signing capability (MANDATORY)..."

    if ! _cursor_gpg_check; then
        echo ""
        echo "❌ cursor-agent: GPG validation FAILED" >&2
        echo "🚨 MANDATORY REQUIREMENT: GPG signing is REQUIRED for all commits" >&2
        echo "   Agents MUST fix GPG issues before using cursor-agent" >&2
        echo "   No workarounds, circumventions, or bypasses allowed" >&2
        echo ""
        echo "Required steps to fix GPG:"
        echo "  1. gpg-connect-agent /bye"
        echo "  2. gpg --sign --default-key YOUR_KEY_ID < /dev/null"
        echo "  3. export GPG_TTY=\$(tty)"
        echo "  4. Try cursor-agent again"
        echo ""
        echo "❌ cursor-agent BLOCKED until GPG signing is properly configured"
        return 1
    fi

    echo "✅ GPG signing validated - starting cursor-agent"

    # Environment setup for cursor-agent
    # - Unset GPG_TTY to prevent terminal interaction prompts
    # - Use nice to reduce system priority
    # - Run in foreground for proper job control and error handling
    # - Use absolute path to prevent any possibility of alias recursion/fork-bomb
    GPG_TTY=/dev/null nice -n 15 "$HOME/.local/bin/cursor-agent" "$@"
}

# Export functions for subshells
export -f cursor-agent
export -f _cursor_gpg_check

# GPG Setup Instructions (MANDATORY)
# ==================================
# 🚨 CRITICAL: GPG signing is MANDATORY for all commits - NO EXCEPTIONS
# Agents MUST ensure GPG is properly configured before using cursor-agent
#
# Required setup steps (agents must complete these):
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
# 🚨 MANDATORY: If GPG check fails, cursor-agent will REFUSE TO START.
# This ENFORCES that all commits are properly GPG signed.
# Agents MUST fix GPG issues - circumventing is NOT ALLOWED.