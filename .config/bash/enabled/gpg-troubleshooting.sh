#!/bin/bash
# AGENT_CONTEXT: GPG troubleshooting and manual recovery functions
# ARCHITECTURE: Manual recovery functions for when agent command fails
# DESIGN_PATTERN: Fallback functions for edge cases

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function for manual GPG recovery when agent command fails
gpg_manual_recovery() {
    echo -e "${YELLOW}📋 Manual GPG recovery steps:${NC}"
    echo "1. gpg-connect-agent /bye"
    echo "2. gpg --pinentry-mode loopback --sign < /dev/null"
    echo "3. export GPG_TTY=\$(tty)"
    echo "4. Try: agent gpg status"
}

# Function to show GPG troubleshooting info
gpg_troubleshoot() {
    echo -e "${BLUE}🔍 GPG Troubleshooting Info:${NC}"
    echo "GPG Agent Info: ${GPG_AGENT_INFO:-Not set}"
    echo "GPG TTY: ${GPG_TTY:-Not set}"
    echo "GPG Config: ~/.gnupg/gpg-agent.conf"
    echo ""
    echo "Use 'agent gpg status' for current status"
    echo "Use 'agent gpg unlock' to unlock keys"
    echo "Use 'agent gpg recover' to recover agent"
}

# Main function for direct execution
main() {
    case "${1:-troubleshoot}" in
        "manual")
            gpg_manual_recovery
            ;;
        "troubleshoot")
            gpg_troubleshoot
            ;;
        *)
            echo "Usage: gpg-troubleshooting [manual|troubleshoot]"
            ;;
    esac
}

# Export functions for use in other scripts
export -f gpg_manual_recovery gpg_troubleshoot

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi