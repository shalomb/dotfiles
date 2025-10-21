#!/bin/bash
# AGENT_CONTEXT: Main agent bootstrap system using unified agent command
# ARCHITECTURE: Single command interface replacing fragmented scripts
# DESIGN_PATTERN: Keychain-inspired unified agent management

# This replaces all the fragmented agent scripts with one unified system
# See AGENTS-refactor.md for the full vision

# Only run in interactive shells
[[ ${-//[!i]/} ]] || return

# Use the unified agent command
if command -v agent >/dev/null 2>&1; then
    # Initialize agents using unified system
    agent init >/dev/null 2>&1 || true
    
    # Show status if in interactive mode
    if [[ -t 0 ]]; then
        echo "🔐 Agent Status:"
        agent status 2>/dev/null || true
    fi
else
    echo "⚠️  Unified agent command not found - falling back to legacy scripts"
fi