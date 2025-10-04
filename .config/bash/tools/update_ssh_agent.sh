#!/bin/bash
# SSH Agent Management - Modern Bootstrap System
# Replaces the legacy update_ssh_agent_info script with robust bootstrap

# Source the new bootstrap system
source "$(dirname "${BASH_SOURCE[0]}")/ssh-agent-bootstrap.sh"

# Bootstrap SSH agent for this shell
bootstrap_ssh_agent

# Legacy compatibility: provide ssh_init alias
alias ssh_init='source "$(dirname "${BASH_SOURCE[0]}")/ssh-agent-bootstrap.sh" && bootstrap_ssh_agent'
