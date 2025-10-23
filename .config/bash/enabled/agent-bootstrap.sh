#!/bin/bash
# AGENT_CONTEXT: Main agent bootstrap system using unified agentctl
# ARCHITECTURE: Bash function wrapper around Python implementation
# DESIGN_PATTERN: Keychain-inspired unified agent management

# This replaces all the fragmented agent scripts with one unified system
# See AGENTS-refactor.md for the full vision

# Only run in interactive shells
[[ ${-//[!i]/} ]] || return

# Note: agentctl is now a bash function defined in enabled/agentctl-integration.sh
# It will be loaded before this rc.d script runs

# Show status if in interactive mode
if [[ -t 0 ]] && type agentctl &>/dev/null; then
    echo "🔐 Agent Status:"
    agentctl status 2>/dev/null || true
fi