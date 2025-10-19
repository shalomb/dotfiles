#!/usr/bin/env bash
# Agent Bootstrap System
# Consolidated SSH and GPG agent management
# Modern bashisms, parameter expansions, proper error handling
# Quality standards: greycat/greg approved

# Colors using tput (portable, modern)
readonly RED="$(tput setaf 1 2>/dev/null || echo '')"
readonly GREEN="$(tput setaf 2 2>/dev/null || echo '')"
readonly YELLOW="$(tput setaf 3 2>/dev/null || echo '')"
readonly BLUE="$(tput setaf 4 2>/dev/null || echo '')"
readonly BOLD="$(tput bold 2>/dev/null || echo '')"
readonly RESET="$(tput sgr0 2>/dev/null || echo '')"

# Configuration with proper parameter expansions
readonly SSH_AGENT_INFO_FILE="$HOME/.ssh/agent.info"
readonly GPG_AGENT_INFO_FILE="$HOME/.gnupg/gpg-agent.info"

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
    
    printf '%s\n' "$context"
}

# Function to validate SSH agent info
validate_ssh_agent_info() {
    # Check if agent info file exists and is readable
    [[ -r "$SSH_AGENT_INFO_FILE" ]] || return 1
    
    # Source the agent info
    source "$SSH_AGENT_INFO_FILE" 2>/dev/null || return 1
    
    # Check if PID is set and process exists
    [[ -n "${SSH_AGENT_PID:-}" ]] || return 1
    kill -0 "$SSH_AGENT_PID" 2>/dev/null || return 1
    
    # Check if socket exists and is accessible
    [[ -n "${SSH_AUTH_SOCK:-}" ]] || return 1
    [[ -S "$SSH_AUTH_SOCK" ]] || return 1
    
    # Test if agent responds to commands
    SSH_AUTH_SOCK="$SSH_AUTH_SOCK" ssh-add -l >/dev/null 2>&1 || return 1
    
    return 0
}

# Function to validate GPG agent info
validate_gpg_agent_info() {
    # Check if GPG agent socket exists
    local socket
    socket="$(gpgconf --list-dirs agent-socket 2>/dev/null)"
    [[ -n "$socket" ]] || return 1
    [[ -S "$socket" ]] || return 1
    
    # Test if agent responds to commands
    gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1 || return 1
    
    return 0
}

# Function to bootstrap SSH agent
bootstrap_ssh_agent() {
    local -r context="$1"
    
    # Check if GPG agent is providing SSH functionality
    if [[ -n "${GPG_AGENT_INFO:-}" ]]; then
        local gpg_ssh_socket
        gpg_ssh_socket="$(gpgconf --list-dirs agent-ssh-socket 2>/dev/null)"
        if [[ -n "$gpg_ssh_socket" && -S "$gpg_ssh_socket" ]]; then
            # Test if GPG agent's SSH socket works and can actually sign
            if SSH_AUTH_SOCK="$gpg_ssh_socket" ssh-add -l >/dev/null 2>&1; then
                if SSH_AUTH_SOCK="$gpg_ssh_socket" ssh-add -T ~/.ssh/id_ed25519 >/dev/null 2>&1; then
                    # Use GPG agent's SSH functionality
                    export SSH_AUTH_SOCK="$gpg_ssh_socket"
                    unset SSH_AGENT_PID
                    return 0
                else
                    printf 'GPG agent SSH socket exists but can'\''t sign, using regular SSH agent\n' >&2
                fi
            fi
        fi
    fi
    
    # Skip in SSH contexts to avoid clobbering forwarded agent
    if [[ "$context" == "ssh" ]]; then
        validate_ssh_agent_info && return 0 || return 1
    fi
    
    # Validate existing agent info
    if validate_ssh_agent_info; then
        return 0
    fi
    
    # Start new SSH agent
    local agent_output
    agent_output="$(ssh-agent -s 2>/dev/null)" || return 1
    
    # Extract PID and socket from output using parameter expansions
    local pid socket
    pid="$(printf '%s\n' "$agent_output" | grep "SSH_AGENT_PID" | cut -d= -f2 | tr -d ';')"
    socket="$(printf '%s\n' "$agent_output" | grep "SSH_AUTH_SOCK" | cut -d= -f2 | tr -d ';')"
    
    # Save agent info
    {
        printf 'SSH_AGENT_PID=%q; export SSH_AGENT_PID\n' "$pid"
        printf 'SSH_AUTH_SOCK=%q; export SSH_AUTH_SOCK\n' "$socket"
        printf 'SSH_AGENT_INFO_FILE=%q; export SSH_AGENT_INFO_FILE\n' "$SSH_AGENT_INFO_FILE"
    } > "$SSH_AGENT_INFO_FILE"
    
    # Export variables
    export SSH_AGENT_PID="$pid"
    export SSH_AUTH_SOCK="$socket"
    export SSH_AGENT_INFO_FILE
    
    # Try to add keys (only in interactive contexts)
    if [[ "$context" == "interactive" && -t 0 ]]; then
        ssh-add -l >/dev/null 2>&1 || ssh-add 2>/dev/null || true
    fi
    
    return 0
}

# Function to bootstrap GPG agent
bootstrap_gpg_agent() {
    local -r context="$1"
    
    # Set GPG_TTY first
    export GPG_TTY="$(tty)"
    
    # Validate existing agent info
    if validate_gpg_agent_info; then
        # Agent is working, just ensure environment variables are set
        local socket ssh_socket
        socket="$(gpgconf --list-dirs agent-socket 2>/dev/null)"
        ssh_socket="$(gpgconf --list-dirs agent-ssh-socket 2>/dev/null)"
        
        if [[ -n "$socket" ]]; then
            export GPG_AGENT_INFO="$socket:0:1"
            if [[ -n "$ssh_socket" ]]; then
                export SSH_AUTH_SOCK="$ssh_socket"
            fi
        fi
        return 0
    fi
    
    # Start GPG agent if not running
    if ! gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        gpg-agent --daemon --enable-ssh-support >/dev/null 2>&1 || return 1
        sleep 1
    fi
    
    # Get agent info
    local socket ssh_socket
    socket="$(gpgconf --list-dirs agent-socket 2>/dev/null)"
    ssh_socket="$(gpgconf --list-dirs agent-ssh-socket 2>/dev/null)"
    
    if [[ -n "$socket" ]]; then
        # Save agent info
        {
            printf 'GPG_AGENT_INFO=%q; export GPG_AGENT_INFO\n' "$socket:0:1"
            printf 'GPG_TTY=%q; export GPG_TTY\n' "$GPG_TTY"
            if [[ -n "$ssh_socket" ]]; then
                printf 'SSH_AUTH_SOCK=%q; export SSH_AUTH_SOCK\n' "$ssh_socket"
            fi
        } > "$GPG_AGENT_INFO_FILE"
        
        # Export variables
        export GPG_AGENT_INFO="$socket:0:1"
        export GPG_TTY
        if [[ -n "$ssh_socket" ]]; then
            export SSH_AUTH_SOCK="$ssh_socket"
        fi
        
        return 0
    fi
    
    return 1
}

# Function to show agent status
show_agent_status() {
    local ssh_status gpg_status
    
    # Check SSH agent status
    if [[ -n "${SSH_AUTH_SOCK:-}" && -S "$SSH_AUTH_SOCK" ]]; then
        if ssh-add -l >/dev/null 2>&1; then
            local key_count
            key_count="$(ssh-add -l 2>/dev/null | wc -l)"
            ssh_status="🔑 SSH: ${key_count} keys loaded"
        else
            ssh_status="🔑 SSH: Agent running (no keys)"
        fi
    else
        ssh_status="❌ SSH: Not available"
    fi
    
    # Check GPG agent status
    if [[ -n "${GPG_AGENT_INFO:-}" ]] && gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        local gpg_key_count
        gpg_key_count="$(gpg-connect-agent 'keyinfo --list' /bye 2>/dev/null | grep -c '^S' || echo 0)"
        gpg_status="🔐 GPG: ${gpg_key_count} keys available"
    else
        gpg_status="❌ GPG: Not available"
    fi
    
    # Display status
    printf '%s🔐 Agent Status:%s %s | %s\n' "$BLUE" "$RESET" "$ssh_status" "$gpg_status"
}

# Function to show detailed agent information
show_agent_keys() {
    printf '%s🔐 Detailed Agent Information:%s\n' "$BLUE" "$RESET"
    printf '\n'
    
    # SSH Agent Details
    printf '%s🔑 SSH Agent:%s\n' "$GREEN" "$RESET"
    if [[ -n "${SSH_AUTH_SOCK:-}" && -S "$SSH_AUTH_SOCK" ]]; then
        printf '  Socket: %s\n' "$SSH_AUTH_SOCK"
        printf '  Keys loaded:\n'
        ssh-add -l 2>/dev/null | sed 's/^/    /' || printf '    No keys loaded\n'
    else
        printf '  ❌ SSH Agent not available\n'
    fi
    printf '\n'
    
    # GPG Agent Details
    printf '%s🔐 GPG Agent:%s\n' "$GREEN" "$RESET"
    if [[ -n "${GPG_AGENT_INFO:-}" ]] && gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
        printf '  Socket: %s\n' "$(gpgconf --list-dirs agent-socket 2>/dev/null)"
        printf '  GPG_TTY: %s\n' "${GPG_TTY:-not set}"
        printf '  Keys available:\n'
        gpg-connect-agent 'keyinfo --list' /bye 2>/dev/null | grep '^S' | sed 's/^/    /' || printf '    No keys available\n'
    else
        printf '  ❌ GPG Agent not available\n'
    fi
}

# Main bootstrap function
bootstrap_agents() {
    local context
    context="$(detect_shell_context)"
    
    # Bootstrap SSH agent
    if command -v ssh-agent >/dev/null 2>&1; then
        if bootstrap_ssh_agent "$context"; then
            [[ -n "${DOTFILES_DEBUG:-}" ]] && printf 'debug: SSH agent bootstrapped successfully\n' >&2
        else
            printf 'Warning: Failed to bootstrap SSH agent\n' >&2
        fi
    else
        printf 'Warning: ssh-agent not found\n' >&2
    fi
    
    # Bootstrap GPG agent
    if command -v gpg-agent >/dev/null 2>&1; then
        if bootstrap_gpg_agent "$context"; then
            [[ -n "${DOTFILES_DEBUG:-}" ]] && printf 'debug: GPG agent bootstrapped successfully\n' >&2
        else
            printf 'Warning: Failed to bootstrap GPG agent\n' >&2
        fi
    else
        printf 'Warning: gpg-agent not found\n' >&2
    fi
}

# Export functions for use in other scripts
export -f show_agent_status show_agent_keys bootstrap_agents

# Run bootstrap if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    bootstrap_agents
fi