#!/bin/bash
# AGENT_CONTEXT: Automatic SSH and GPG agent bootstrap with user prompting
# ARCHITECTURE: Bootstrap pattern with discovery and user interaction
# DESIGN_PATTERN: Fail-safe with user guidance for agent unlocking

# If not interactive, return
[[ ${-//[!i]/} ]] || return

# Colors for output
readonly RED="$(tput setaf 1 2>/dev/null || echo '')"
readonly GREEN="$(tput setaf 2 2>/dev/null || echo '')"
readonly YELLOW="$(tput setaf 3 2>/dev/null || echo '')"
readonly BLUE="$(tput setaf 4 2>/dev/null || echo '')"
readonly BOLD="$(tput bold 2>/dev/null || echo '')"
readonly RESET="$(tput sgr0 2>/dev/null || echo '')"

# Function to prompt user for agent unlocking
prompt_agent_unlock() {
    local agent_type="$1"
    local instructions="$2"
    
    echo -e "${YELLOW}🔐 $agent_type Agent Unlock Required${RESET}"
    echo -e "${BLUE}Please unlock your $agent_type agent to continue:${RESET}"
    echo ""
    echo "$instructions"
    echo ""
    echo -e "${YELLOW}Press Enter when ready, or Ctrl+C to skip...${RESET}"
    read -r
}

# Function to check and prompt for SSH agent
ensure_ssh_agent_unlocked() {
    # Check if SSH agent is working
    if [[ -n "${SSH_AUTH_SOCK:-}" && -S "$SSH_AUTH_SOCK" ]]; then
        if ssh-add -l >/dev/null 2>&1; then
            echo -e "${GREEN}✅ SSH agent is unlocked and working${RESET}"
            return 0
        fi
    fi
    
    # SSH agent needs attention
    echo -e "${YELLOW}🔑 SSH agent needs attention${RESET}"
    
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
            echo -e "${GREEN}✅ SSH agent discovered and working${RESET}"
            return 0
        fi
    fi
    
    # Prompt user to unlock SSH agent
    prompt_agent_unlock "SSH" "Run: ssh-add ~/.ssh/id_ed25519"
    
    # Try to add keys
    if ssh-add -l >/dev/null 2>&1; then
        echo -e "${GREEN}✅ SSH agent unlocked successfully${RESET}"
        return 0
    else
        echo -e "${RED}❌ SSH agent still not working - you may need to run 'ssh-add' manually${RESET}"
        return 1
    fi
}

# Function to check and prompt for GPG agent
ensure_gpg_agent_unlocked() {
    # Check if GPG agent is working
    if gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        echo -e "${GREEN}✅ GPG agent is unlocked and working${RESET}"
        return 0
    fi
    
    # GPG agent needs attention
    echo -e "${YELLOW}🔐 GPG agent needs attention${RESET}"
    
    # Try to start GPG agent if not running
    if ! gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        echo -e "${BLUE}Starting GPG agent...${RESET}"
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
            echo -e "${GREEN}✅ GPG agent started and working${RESET}"
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
        echo -e "${GREEN}✅ GPG agent unlocked successfully${RESET}"
        return 0
    else
        echo -e "${RED}❌ GPG agent still not working - you may need to unlock your GPG key manually${RESET}"
        return 1
    fi
}

# Function to show agent status
show_agent_status() {
    echo -e "${BLUE}🔐 Agent Status:${RESET}"
    
    # SSH Agent Status
    if [[ -n "${SSH_AUTH_SOCK:-}" && -S "$SSH_AUTH_SOCK" ]]; then
        if ssh-add -l >/dev/null 2>&1; then
            local key_count
            key_count=$(ssh-add -l 2>/dev/null | wc -l)
            echo -e "  ${GREEN}🔑 SSH: $key_count keys loaded${RESET}"
        else
            echo -e "  ${YELLOW}🔑 SSH: Agent running (no keys)${RESET}"
        fi
    else
        echo -e "  ${RED}❌ SSH: Not available${RESET}"
    fi
    
    # GPG Agent Status
    if gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        local gpg_key_count
        gpg_key_count=$(gpg-connect-agent 'keyinfo --list' /bye 2>/dev/null | grep -c '^S' || echo 0)
        echo -e "  ${GREEN}🔐 GPG: $gpg_key_count keys available${RESET}"
    else
        echo -e "  ${RED}❌ GPG: Not available${RESET}"
    fi
}

# Main bootstrap function
bootstrap_agents_with_prompts() {
    echo -e "${BLUE}🚀 Bootstrapping SSH and GPG agents...${RESET}"
    echo ""
    
    # Bootstrap agents using the library functions
    if command -v bootstrap_agents >/dev/null 2>&1; then
        bootstrap_agents
    else
        echo -e "${RED}❌ Bootstrap functions not available${RESET}"
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