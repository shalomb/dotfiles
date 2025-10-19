fix-ssh-auth-sock() {
    # Interactive check
    [[ ${-//[!i]/} ]] || return

    local sock_value

    # DECISION: Support both tmux and non-tmux modes
    # - If in tmux: prefer tmux's SSH_AUTH_SOCK value, fall back to current env
    # - If not in tmux: use current environment's SSH_AUTH_SOCK
    # - If no valid socket found: discover working SSH agents automatically

    # If we're in tmux, try to get the value from tmux first
    if [[ -n "${TMUX:-}" ]]; then
        # Try to get SSH_AUTH_SOCK from tmux environment
        sock_value=$(tmux showenv SSH_AUTH_SOCK 2>/dev/null | sed 's/^-*SSH_AUTH_SOCK=//')

        # If tmux doesn't have a valid value, fall back to current environment
        if [[ -z "$sock_value" || "$sock_value" == "SSH_AUTH_SOCK" ]]; then
            sock_value="${SSH_AUTH_SOCK:-}"
        fi
    else
        # Not in tmux, use current environment
        sock_value="${SSH_AUTH_SOCK:-}"
    fi

    # If still no value, try to discover a working SSH agent
    if [[ -z "$sock_value" ]]; then
        for socket in /tmp/ssh-*/agent.*; do
            if [[ -S "$socket" ]] && SSH_AUTH_SOCK="$socket" ssh-add -l >/dev/null 2>&1; then
                sock_value="$socket"
                break
            fi
        done
    fi

    if [[ -n "$sock_value" && -S "$sock_value" ]]; then
        export SSH_AUTH_SOCK="$sock_value"

        # If we're in tmux and tmux doesn't have this socket, set it for other processes
        if [[ -n "${TMUX:-}" ]]; then
            local tmux_sock
            tmux_sock=$(tmux showenv SSH_AUTH_SOCK 2>/dev/null | sed 's/^-*SSH_AUTH_SOCK=//')
            if [[ -z "$tmux_sock" || "$tmux_sock" == "SSH_AUTH_SOCK" ]]; then
                tmux setenv SSH_AUTH_SOCK "$sock_value"
                echo "SSH_AUTH_SOCK set to: $sock_value (also set in tmux)"
            else
                echo "SSH_AUTH_SOCK set to: $sock_value"
            fi
        else
            echo "SSH_AUTH_SOCK set to: $sock_value"
        fi
    else
        echo "No valid SSH_AUTH_SOCK found"
        return 1
    fi
}

# Export the function
export -f fix-ssh-auth-sock