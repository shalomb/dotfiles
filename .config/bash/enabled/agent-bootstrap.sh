#!/bin/bash
# AGENT_CONTEXT: Automatic SSH and GPG agent bootstrap with user prompting
# ARCHITECTURE: Bootstrap pattern with discovery and user interaction
# DESIGN_PATTERN: Fail-safe with user guidance for agent unlocking

# CRITICAL: Prevent agent process blocking
# This script contains interactive prompts (read -r) that will cause AI agents
# and non-interactive processes to hang indefinitely waiting for user input.
# We must exit early in non-interactive environments to prevent this.
[[ ${-//[!i]/} ]] || return

# Additional safety check: ensure stdin is a terminal
# This prevents the script from running in environments where stdin is not
# connected to a terminal (pipes, redirects, background processes, etc.)
[[ -t 0 ]] || return

# Colors are already available from rc.d/02-colours (loaded by bashrc)

# Function to prompt user for agent unlocking
prompt_agent_unlock() {
    local agent_type="$1"
    local instructions="$2"
    
    echo -e "${yellow}🔐 $agent_type Agent Unlock Required${reset}"
    echo -e "${blue}Please unlock your $agent_type agent to continue:${reset}"
    echo ""
    echo "$instructions"
    echo ""
    echo -e "${yellow}Press Enter when ready, or Ctrl+C to skip...${reset}"
    read -r
}

# Function to check and prompt for SSH agent
ensure_ssh_agent_unlocked() {
    # Check if SSH agent is working
    if [[ -n "${SSH_AUTH_SOCK:-}" && -S "$SSH_AUTH_SOCK" ]]; then
        if ssh-add -l >/dev/null 2>&1; then
            echo -e "${green}✅ SSH agent is unlocked and working${reset}"
            return 0
        fi
    fi
    
    # SSH agent needs attention
    echo -e "${yellow}🔑 SSH agent needs attention${reset}"
    
    # Try to discover existing agents
    local agents
    agents=$(discover_ssh_agents 2>/dev/null)
    if [[ -n "$agents" ]]; then
        local best_agent
        best_agent=$(echo "$agents" | head -1)
        local pid socket
        pid=$(echo "$best_agent" | cut -d: -f1)
        socket=$(echo "$best_agent" | cut -d: -f2)
        
        export SSH_AUTH_SOCK="$socket"
        export SSH_AGENT_PID="$pid"
        
        if ssh-add -l >/dev/null 2>&1; then
            echo -e "${green}✅ SSH agent discovered and working${reset}"
            return 0
        fi
    fi
    
    # Prompt user to unlock SSH agent
    prompt_agent_unlock "SSH" "Run: ssh-add ~/.ssh/id_ed25519"
    
    # Try to add keys
    if ssh-add -l >/dev/null 2>&1; then
        echo -e "${green}✅ SSH agent unlocked successfully${reset}"
        return 0
    else
        echo -e "${red}❌ SSH agent still not working - you may need to run 'ssh-add' manually${reset}"
        return 1
    fi
}

# Function to check and prompt for GPG agent
ensure_gpg_agent_unlocked() {
    # Check if GPG agent is working
    if gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        echo -e "${green}✅ GPG agent is unlocked and working${reset}"
        return 0
    fi
    
    # GPG agent needs attention
    echo -e "${yellow}🔐 GPG agent needs attention${reset}"
    
    # Try to start GPG agent if not running
    if ! gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        echo -e "${blue}Starting GPG agent...${reset}"
        gpg-agent --daemon --enable-ssh-support >/dev/null 2>&1 || true
        sleep 1
    fi
    
    # Get GPG agent info
    local socket
    socket=$(gpgconf --list-dirs agent-socket 2>/dev/null)
    if [[ -n "$socket" && -S "$socket" ]]; then
        export GPG_AGENT_INFO="$socket:0:1"
        export GPG_TTY=$(tty)
        
        if gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
            echo -e "${green}✅ GPG agent started and working${reset}"
            return 0
        fi
    fi
    
    # Prompt user to unlock GPG agent
    local signing_key
    signing_key=$(git config --get user.signingkey 2>/dev/null)
    if [[ -n "$signing_key" ]]; then
        prompt_agent_unlock "GPG" "Run: gpg --sign --default-key $signing_key < /dev/null"
    else
        prompt_agent_unlock "GPG" "Run: gpg --sign < /dev/null"
    fi
    
    # Test GPG signing
    if echo 'test' | gpg --clearsign --default-key "${signing_key:-}" --batch --yes >/dev/null 2>&1; then
        echo -e "${green}✅ GPG agent unlocked successfully${reset}"
        return 0
    else
        echo -e "${red}❌ GPG agent still not working - you may need to unlock your GPG key manually${reset}"
        return 1
    fi
}

# Function to show agent status
show_agent_status() {
    echo -e "${blue}🔐 Agent Status:${reset}"
    
    # SSH Agent Status
    if [[ -n "${SSH_AUTH_SOCK:-}" && -S "$SSH_AUTH_SOCK" ]]; then
        if ssh-add -l >/dev/null 2>&1; then
            local key_count
            key_count=$(ssh-add -l 2>/dev/null | wc -l)
            echo -e "  ${green}🔑 SSH: $key_count keys loaded${reset}"
        else
            echo -e "  ${yellow}🔑 SSH: Agent running (no keys)${reset}"
        fi
    else
        echo -e "  ${red}❌ SSH: Not available${reset}"
    fi
    
    # GPG Agent Status
    if gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        local gpg_key_count
        gpg_key_count=$(gpg-connect-agent 'keyinfo --list' /bye 2>/dev/null | grep -c '^S' || echo 0)
        echo -e "  ${green}🔐 GPG: $gpg_key_count keys available${reset}"
    else
        echo -e "  ${red}❌ GPG: Not available${reset}"
    fi
}

# Main bootstrap function
bootstrap_agents_with_prompts() {
    echo -e "${blue}🚀 Bootstrapping SSH and GPG agents...${reset}"
    echo ""
    
    # Bootstrap agents using the library functions
    if command -v bootstrap_agents >/dev/null 2>&1; then
        bootstrap_agents
    else
        echo -e "${red}❌ Bootstrap functions not available${reset}"
        return 1
    fi
    
    echo ""
    
    # Ensure agents are unlocked with user prompting
    ensure_ssh_agent_unlocked
    echo ""
    ensure_gpg_agent_unlocked
    echo ""
    
    # Show final status
    show_agent_status
}

# Export functions for use in other scripts
export -f ensure_ssh_agent_unlocked ensure_gpg_agent_unlocked show_agent_status bootstrap_agents_with_prompts

# Run bootstrap if this is the main script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    bootstrap_agents_with_prompts
fi