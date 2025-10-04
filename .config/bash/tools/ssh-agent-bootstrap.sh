#!/bin/bash
# SSH Agent Bootstrap System
# Robust SSH agent management for all shell contexts
# Handles interactive, non-interactive, tmux, and SSH contexts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSH_AGENT_INFO_FILE="$HOME/.ssh/agent.info"
SSH_AGENT_TIMEOUT=300  # 5 minutes

# Function to detect shell context
detect_shell_context() {
    local context="unknown"
    
    if [[ -n "${SSH_CLIENT:-}" || -n "${SSH_TTY:-}" ]]; then
        context="ssh"
    elif [[ -n "${TMUX:-}" ]]; then
        context="tmux"
    elif [[ -t 0 ]]; then
        context="interactive"
    else
        context="non-interactive"
    fi
    
    echo "$context"
}

# Function to validate SSH agent info
validate_ssh_agent_info() {
    local exit_code=0
    
    # Check if agent info file exists and is readable
    if [[ ! -r "$SSH_AGENT_INFO_FILE" ]]; then
        return 1
    fi
    
    # Source the agent info
    source "$SSH_AGENT_INFO_FILE" 2>/dev/null || return 1
    
    # Check if PID is set and process exists
    if [[ -z "${SSH_AGENT_PID:-}" ]] || ! kill -0 "$SSH_AGENT_PID" 2>/dev/null; then
        return 1
    fi
    
    # Check if socket exists and is accessible
    if [[ -z "${SSH_AUTH_SOCK:-}" ]] || [[ ! -S "$SSH_AUTH_SOCK" ]]; then
        return 1
    fi
    
    # Test if agent responds to commands
    if ! SSH_AUTH_SOCK="$SSH_AUTH_SOCK" ssh-add -l >/dev/null 2>&1; then
        return 1
    fi
    
    return 0
}

# Function to discover existing SSH agents
discover_ssh_agents() {
    local agents=()
    
    # Find all running ssh-agent processes
    while read -r pid; do
        # Look for socket files in common locations
        for socket_dir in /tmp/ssh-* ~/.ssh/agent-*; do
            if [[ -d "$socket_dir" ]]; then
                for socket_file in "$socket_dir"/agent.*; do
                    if [[ -S "$socket_file" ]] && kill -0 "$pid" 2>/dev/null; then
                        # Test if this socket works with this PID
                        if SSH_AUTH_SOCK="$socket_file" ssh-add -l >/dev/null 2>&1; then
                            agents+=("$pid:$socket_file")
                        fi
                    fi
                done
            fi
        done
    done < <(pgrep ssh-agent 2>/dev/null)
    
    printf '%s\n' "${agents[@]}"
}

# Function to start new SSH agent
start_ssh_agent() {
    local context="$1"
    local agent_output
    
    # Start ssh-agent
    agent_output=$(ssh-agent -s 2>/dev/null) || return 1
    
    # Extract PID and socket from output
    local pid socket
    pid=$(echo "$agent_output" | grep "SSH_AGENT_PID" | cut -d= -f2 | tr -d ';')
    socket=$(echo "$agent_output" | grep "SSH_AUTH_SOCK" | cut -d= -f2 | tr -d ';')
    
    # Save agent info
    {
        echo "SSH_AGENT_PID='$pid'; export SSH_AGENT_PID"
        echo "SSH_AUTH_SOCK='$socket'; export SSH_AUTH_SOCK"
        echo "SSH_AGENT_INFO_FILE='$SSH_AGENT_INFO_FILE'; export SSH_AGENT_INFO_FILE"
    } > "$SSH_AGENT_INFO_FILE"
    
    # Export variables
    export SSH_AGENT_PID="$pid"
    export SSH_AUTH_SOCK="$socket"
    export SSH_AGENT_INFO_FILE
    
    # Try to add keys (only in interactive contexts)
    if [[ "$context" == "interactive" ]] && [[ -t 0 ]]; then
        ssh-add -l >/dev/null 2>&1 || ssh-add 2>/dev/null || true
    fi
    
    return 0
}

# Function to bootstrap SSH agent
bootstrap_ssh_agent() {
    local context
    context=$(detect_shell_context)
    
    # Skip in SSH contexts to avoid clobbering forwarded agent
    if [[ "$context" == "ssh" ]]; then
        # Just validate existing agent info
        if validate_ssh_agent_info; then
            return 0
        else
            # Try to discover existing agents
            local agents
            agents=$(discover_ssh_agents)
            if [[ -n "$agents" ]]; then
                local best_agent
                best_agent=$(echo "$agents" | head -1)
                local pid socket
                pid=$(echo "$best_agent" | cut -d: -f1)
                socket=$(echo "$best_agent" | cut -d: -f2)
                
                # Update agent info
                {
                    echo "SSH_AGENT_PID='$pid'; export SSH_AGENT_PID"
                    echo "SSH_AUTH_SOCK='$socket'; export SSH_AUTH_SOCK"
                    echo "SSH_AGENT_INFO_FILE='$SSH_AGENT_INFO_FILE'; export SSH_AGENT_INFO_FILE"
                } > "$SSH_AGENT_INFO_FILE"
                
                export SSH_AGENT_PID="$pid"
                export SSH_AUTH_SOCK="$socket"
                export SSH_AGENT_INFO_FILE
                return 0
            fi
        fi
        return 1
    fi
    
    # Validate existing agent info
    if validate_ssh_agent_info; then
        return 0
    fi
    
    # Try to discover existing agents
    local agents
    agents=$(discover_ssh_agents)
    if [[ -n "$agents" ]]; then
        local best_agent
        best_agent=$(echo "$agents" | head -1)
        local pid socket
        pid=$(echo "$best_agent" | cut -d: -f1)
        socket=$(echo "$best_agent" | cut -d: -f2)
        
        # Update agent info
        {
            echo "SSH_AGENT_PID='$pid'; export SSH_AGENT_PID"
            echo "SSH_AUTH_SOCK='$socket'; export SSH_AUTH_SOCK"
            echo "SSH_AGENT_INFO_FILE='$SSH_AGENT_INFO_FILE'; export SSH_AGENT_INFO_FILE"
        } > "$SSH_AGENT_INFO_FILE"
        
        export SSH_AGENT_PID="$pid"
        export SSH_AUTH_SOCK="$socket"
        export SSH_AGENT_INFO_FILE
        return 0
    fi
    
    # Start new agent
    start_ssh_agent "$context"
}

# Function to show SSH agent status
show_ssh_agent_status() {
    local context
    context=$(detect_shell_context)
    
    echo -e "${BLUE}SSH Agent Status (Context: $context)${NC}"
    
    if validate_ssh_agent_info; then
        echo -e "${GREEN}✅ SSH Agent is working${NC}"
        echo "  PID: $SSH_AGENT_PID"
        echo "  Socket: $SSH_AUTH_SOCK"
        echo "  Keys loaded:"
        SSH_AUTH_SOCK="$SSH_AUTH_SOCK" ssh-add -l 2>/dev/null | sed 's/^/    /'
    else
        echo -e "${RED}❌ SSH Agent is not working${NC}"
        echo "  Agent info file: $SSH_AGENT_INFO_FILE"
        if [[ -r "$SSH_AGENT_INFO_FILE" ]]; then
            echo "  Contents:"
            cat "$SSH_AGENT_INFO_FILE" | sed 's/^/    /'
        fi
    fi
}

# Main bootstrap function
main() {
    case "${1:-bootstrap}" in
        "bootstrap")
            bootstrap_ssh_agent
            ;;
        "status")
            show_ssh_agent_status
            ;;
        "discover")
            discover_ssh_agents
            ;;
        "validate")
            validate_ssh_agent_info && echo "Valid" || echo "Invalid"
            ;;
        *)
            echo "Usage: ssh-agent-bootstrap [bootstrap|status|discover|validate]"
            ;;
    esac
}

# Export functions for use in other scripts
export -f detect_shell_context validate_ssh_agent_info discover_ssh_agents start_ssh_agent bootstrap_ssh_agent show_ssh_agent_status

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi