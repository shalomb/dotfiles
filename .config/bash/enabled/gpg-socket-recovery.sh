#!/bin/bash
# AGENT_CONTEXT: GPG socket recovery functions for edge cases
# ARCHITECTURE: Manual recovery functions when agent command fails
# DESIGN_PATTERN: Fallback functions for socket recovery

# Function for manual GPG socket recovery when agent command fails
gpg_manual_recovery() {
    echo "📋 Manual GPG socket recovery steps:"
    echo "1. gpg-connect-agent /bye"
    echo "2. gpg-agent --daemon"
    echo "3. export GPG_AGENT_INFO=\$(gpgconf --list-dirs agent-socket):0:1"
    echo "4. Try: agent gpg status"
}

# Function to show GPG socket troubleshooting info
gpg_socket_troubleshoot() {
    echo "🔍 GPG Socket Troubleshooting Info:"
    echo "GPG Agent Info: ${GPG_AGENT_INFO:-Not set}"
    echo "GPG TTY: ${GPG_TTY:-Not set}"
    echo "GPG Socket: $(gpgconf --list-dirs agent-socket 2>/dev/null || echo 'Not found')"
    echo ""
    echo "Use 'agent gpg status' for current status"
    echo "Use 'agent gpg recover' to recover agent"
}

# Main function for direct execution
main() {
    case "${1:-troubleshoot}" in
        "manual")
            gpg_manual_recovery
            ;;
        "troubleshoot")
            gpg_socket_troubleshoot
            ;;
        *)
            echo "Usage: gpg-socket-recovery [manual|troubleshoot]"
            ;;
    esac
}

# Export functions for use in other scripts
export -f gpg_manual_recovery gpg_socket_troubleshoot

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi