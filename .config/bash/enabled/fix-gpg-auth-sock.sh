fix-gpg-auth-sock() {
    # Interactive check
    [[ ${-//[!i]/} ]] || return

    local gpg_agent_info
    local gpg_socket
    local gpg_pid
    local gpg_version

    # DECISION: Support both tmux and non-tmux modes
    # - If in tmux: prefer tmux's GPG_AGENT_INFO value, fall back to current env
    # - If not in tmux: use current environment's GPG_AGENT_INFO
    # - If no valid socket found: discover working GPG agents automatically

    # If we're in tmux, try to get the value from tmux first
    if [[ -n "${TMUX:-}" ]]; then
        # Try to get GPG_AGENT_INFO from tmux environment
        gpg_agent_info=$(tmux showenv GPG_AGENT_INFO 2>/dev/null | sed 's/^-*GPG_AGENT_INFO=//')

        # If tmux doesn't have a valid value, fall back to current environment
        if [[ -z "$gpg_agent_info" || "$gpg_agent_info" == "GPG_AGENT_INFO" ]]; then
            gpg_agent_info="${GPG_AGENT_INFO:-}"
        fi
    else
        # Not in tmux, use current environment
        gpg_agent_info="${GPG_AGENT_INFO:-}"
    fi

    # If still no value, try to discover a working GPG agent
    if [[ -z "$gpg_agent_info" ]]; then
        # Try to get the socket from gpgconf
        gpg_socket=$(gpgconf --list-dirs agent-socket 2>/dev/null)
        
        if [[ -n "$gpg_socket" && -S "$gpg_socket" ]]; then
            # Test if the socket is responsive
            if gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
                # Get the PID from the socket directory
                gpg_pid=$(pgrep -f "gpg-agent" | head -1)
                gpg_version="1"
                gpg_agent_info="${gpg_socket}:${gpg_pid:-0}:${gpg_version}"
            fi
        fi
    else
        # Parse existing GPG_AGENT_INFO to extract socket
        gpg_socket=$(echo "$gpg_agent_info" | cut -d: -f1)
    fi

    # Validate the socket
    if [[ -n "$gpg_agent_info" && -n "$gpg_socket" && -S "$gpg_socket" ]]; then
        # Test if the socket is responsive
        if gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
            export GPG_AGENT_INFO="$gpg_agent_info"

            # If we're in tmux and tmux doesn't have this socket, set it for other processes
            if [[ -n "${TMUX:-}" ]]; then
                local tmux_gpg
                tmux_gpg=$(tmux showenv GPG_AGENT_INFO 2>/dev/null | sed 's/^-*GPG_AGENT_INFO=//')
                if [[ -z "$tmux_gpg" || "$tmux_gpg" == "GPG_AGENT_INFO" ]]; then
                    tmux setenv GPG_AGENT_INFO "$gpg_agent_info"
                    echo "GPG_AGENT_INFO set to: $gpg_agent_info (also set in tmux)"
                else
                    echo "GPG_AGENT_INFO set to: $gpg_agent_info"
                fi
            else
                echo "GPG_AGENT_INFO set to: $gpg_agent_info"
            fi

            # Also ensure GPG_TTY is set correctly
            if [[ -z "${GPG_TTY:-}" ]]; then
                if [[ -t 0 ]]; then
                    export GPG_TTY=$(tty)
                    echo "GPG_TTY set to: $GPG_TTY"
                else
                    export GPG_TTY="/dev/null"
                    echo "GPG_TTY set to: /dev/null (non-TTY context)"
                fi
            fi

            return 0
        else
            echo "GPG agent socket exists but is not responsive"
            return 1
        fi
    else
        echo "No valid GPG_AGENT_INFO found"
        echo "Try running: gpg-connect-agent /bye"
        return 1
    fi
}

# Export the function
export -f fix-gpg-auth-sock