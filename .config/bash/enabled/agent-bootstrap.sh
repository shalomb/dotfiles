#!/bin/bash
# AGENT_CONTEXT: Main agent bootstrap system using unified agentctl
# ARCHITECTURE: Bash function wrapper around Python implementation
# DESIGN_PATTERN: Keychain-inspired unified agent management

# This replaces all the fragmented agent scripts with one unified system
# See AGENTS-refactor.md for the full vision


# Note: agentctl is now a bash function defined in enabled/agentctl-integration.sh
# It will be loaded before this script runs

# Agent status display happens at the end of bashrc