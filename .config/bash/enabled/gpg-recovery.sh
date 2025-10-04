#!/bin/bash
# GPG Recovery Tool for Cursor Agent Sessions
# Provides comprehensive GPG agent recovery and validation for TUI environments
#
# Usage:
#   gpg-recovery [status|recover|manual|full] [--debug]
#
# Commands:
#   status  - Check current GPG status (terse output)
#   recover - Attempt automatic GPG recovery
#   manual  - Show manual recovery instructions
#   full    - Comprehensive recovery with package installation
#
# Options:
#   --debug - Enable verbose output and debugging information

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Debug mode flag
DEBUG_MODE=false

# Function to show debug output
debug() {
    if [[ "$DEBUG_MODE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $*" >&2
    fi
}

# Function to show verbose output
verbose() {
    if [[ "$DEBUG_MODE" == "true" ]]; then
        echo -e "${YELLOW}[VERBOSE]${NC} $*"
    fi
}

# Function to check GPG status
gpg_status() {
    local exit_code=0
    local signing_key
    
    verbose "Checking GPG status..."
    
    # Check if GPG signing is enabled
    if ! git config --get commit.gpgsign >/dev/null 2>&1; then
        echo -e "${RED}❌ GPG signing not configured${NC}"
        exit_code=1
    elif [[ "$(git config --get commit.gpgsign)" != "true" ]]; then
        echo -e "${RED}❌ GPG signing disabled${NC}"
        exit_code=1
    else
        verbose "GPG signing is enabled"
    fi
    
    # Check if signing key is configured
    signing_key=$(git config --get user.signingkey 2>/dev/null)
    if [[ -z "$signing_key" ]]; then
        echo -e "${RED}❌ No GPG signing key${NC}"
        exit_code=1
    else
        verbose "GPG signing key: ${signing_key}"
    fi
    
    # Test GPG signing without prompts
    if [[ $exit_code -eq 0 ]]; then
        debug "Testing GPG signing with key: $signing_key"
        if ! echo 'test' | gpg --clearsign --default-key "$signing_key" --batch --yes >/dev/null 2>&1; then
            echo -e "${RED}❌ GPG signing test failed${NC}"
            exit_code=1
        else
            verbose "GPG signing test passed"
        fi
    fi
    
    # Check GPG agent status
    if [[ $exit_code -eq 0 ]]; then
        debug "Checking GPG agent responsiveness"
        if ! gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
            echo -e "${RED}❌ GPG agent not responsive${NC}"
            exit_code=1
        else
            verbose "GPG agent is responsive"
        fi
    fi
    
    # Show final status
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ GPG status: OK${NC}"
    else
        echo -e "${RED}❌ GPG status: FAILED${NC}"
    fi
    
    return $exit_code
}

# Function to attempt GPG recovery
gpg_recover() {
    echo -e "${YELLOW}🔄 Attempting GPG recovery...${NC}"
    
    # Try to restart GPG agent
    if command -v gpg-connect-agent >/dev/null 2>&1; then
        echo "  - Restarting GPG agent..."
        gpg-connect-agent /bye >/dev/null 2>&1 || true
    fi
    
    # Try to set GPG_TTY if not set
    if [[ -z "${GPG_TTY:-}" ]]; then
        echo "  - Setting GPG_TTY..."
        if [[ -t 0 ]]; then
            export GPG_TTY=$(tty)
            echo "    GPG_TTY set to: $GPG_TTY"
        else
            export GPG_TTY="/dev/null"
            echo "    GPG_TTY set to: /dev/null (non-TTY context)"
        fi
    else
        echo "  - GPG_TTY already set to: $GPG_TTY"
    fi
    
    # Wait a moment for agent to stabilize
    sleep 1
    
    # Test again
    if gpg_status; then
        echo -e "${GREEN}✅ GPG recovery successful${NC}"
        return 0
    else
        echo -e "${RED}❌ GPG recovery failed${NC}"
        return 1
    fi
}

# Function to show manual recovery steps
gpg_manual_recovery() {
    echo -e "${YELLOW}📋 Manual recovery steps:${NC}"
    echo ""
    echo "1. Start GPG agent:"
    echo "   gpg-connect-agent /bye"
    echo ""
    echo "2. Unlock your GPG key:"
    echo "   gpg --sign --default-key YOUR_KEY_ID < /dev/null"
    echo ""
    echo "3. Set GPG_TTY (if in terminal):"
    echo "   export GPG_TTY=\$(tty)"
    echo ""
    echo "4. Verify GPG check passes:"
    echo "   _cursor_gpg_check"
    echo ""
    echo "5. Try your git operation again"
}

# Function for comprehensive GPG recovery with package installation
gpg_full_recover() {
    echo -e "${BLUE}🔧 Comprehensive GPG recovery for TUI environments${NC}"
    
    verbose "Checking pinentry program availability"
    if ! command -v pinentry-tty >/dev/null 2>&1; then
        echo -e "${YELLOW}Installing pinentry-tty...${NC}"
        sudo apt update && sudo apt install -y pinentry-tty
        echo -e "${GREEN}✅ pinentry-tty installed${NC}"
    else
        verbose "pinentry-tty already available"
    fi
    
    verbose "Updating GPG agent configuration"
    cat > ~/.gnupg/gpg-agent.conf << 'EOF'
# GPG Agent Configuration for TUI Environments

# Enable SSH support
enable-ssh-support

# Use TTY-compatible pinentry
pinentry-program /usr/bin/pinentry-tty

# Cache settings for better performance
default-cache-ttl 86400
default-cache-ttl-ssh 86400
max-cache-ttl 86400
max-cache-ttl-ssh 86400
EOF
    
    verbose "Restarting GPG agent with new configuration"
    gpgconf --kill gpg-agent 2>/dev/null || true
    sleep 2
    export GPG_TTY=$(tty)
    gpg-agent --daemon --enable-ssh-support
    sleep 2
    
    echo -e "${GREEN}✅ Comprehensive recovery completed${NC}"
    
    # Test final status
    if gpg_status; then
        echo -e "${GREEN}🎉 GPG is now fully functional!${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  GPG recovery completed but may need passphrase${NC}"
        echo "Try: echo 'test' | gpg --clearsign --default-key 38495CCA2D2EF563"
        return 1
    fi
}

# Main function
main() {
    # Parse arguments
    local command="status"
    local args=()
    
    for arg in "$@"; do
        case "$arg" in
            --debug)
                DEBUG_MODE=true
                set -x  # Enable bash debug mode
                ;;
            status|recover|manual|full)
                command="$arg"
                ;;
            *)
                args+=("$arg")
                ;;
        esac
    done
    
    debug "Running command: $command with debug mode: $DEBUG_MODE"
    
    case "$command" in
        "status")
            gpg_status
            ;;
        "recover")
            if gpg_status; then
                echo -e "${GREEN}✅ GPG is already working${NC}"
            else
                gpg_recover
            fi
            ;;
        "full")
            gpg_full_recover
            ;;
        "manual")
            gpg_manual_recovery
            ;;
        *)
            echo "Usage: gpg-recovery [status|recover|manual|full] [--debug]"
            echo ""
            echo "Commands:"
            echo "  status  - Check current GPG status (terse output)"
            echo "  recover - Attempt automatic GPG recovery"
            echo "  manual  - Show manual recovery steps"
            echo "  full    - Comprehensive recovery with package installation"
            echo ""
            echo "Options:"
            echo "  --debug - Enable verbose output and debugging"
            ;;
    esac
}

# Export functions for use in other scripts
export -f gpg_status gpg_recover gpg_manual_recovery gpg_full_recover

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi