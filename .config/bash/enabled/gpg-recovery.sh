#!/bin/bash
# GPG Recovery Tool for Cursor Agent Sessions
# Provides automatic GPG agent recovery and validation

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check GPG status
gpg_status() {
    local exit_code=0
    local signing_key
    
    echo -e "${BLUE}🔍 Checking GPG status...${NC}"
    
    # Check if GPG signing is enabled
    if ! git config --get commit.gpgsign >/dev/null 2>&1; then
        echo -e "${RED}❌ GPG signing is not configured${NC}"
        exit_code=1
    elif [[ "$(git config --get commit.gpgsign)" != "true" ]]; then
        echo -e "${RED}❌ GPG signing is disabled${NC}"
        exit_code=1
    else
        echo -e "${GREEN}✅ GPG signing is enabled${NC}"
    fi
    
    # Check if signing key is configured
    signing_key=$(git config --get user.signingkey 2>/dev/null)
    if [[ -z "$signing_key" ]]; then
        echo -e "${RED}❌ No GPG signing key configured${NC}"
        exit_code=1
    else
        echo -e "${GREEN}✅ GPG signing key: ${signing_key}${NC}"
    fi
    
    # Test GPG signing without prompts
    if [[ $exit_code -eq 0 ]]; then
        if ! echo 'test' | gpg --clearsign --default-key "$signing_key" --batch --yes >/dev/null 2>&1; then
            echo -e "${RED}❌ GPG signing test failed${NC}"
            exit_code=1
        else
            echo -e "${GREEN}✅ GPG signing test passed${NC}"
        fi
    fi
    
    # Check GPG agent status
    if [[ $exit_code -eq 0 ]]; then
        if ! gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
            echo -e "${RED}❌ GPG agent not responsive${NC}"
            exit_code=1
        else
            echo -e "${GREEN}✅ GPG agent is responsive${NC}"
        fi
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

# Main function
main() {
    case "${1:-status}" in
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
        "manual")
            gpg_manual_recovery
            ;;
        *)
            echo "Usage: gpg-recovery [status|recover|manual]"
            echo ""
            echo "Commands:"
            echo "  status  - Check current GPG status"
            echo "  recover - Attempt automatic GPG recovery"
            echo "  manual  - Show manual recovery steps"
            ;;
    esac
}

# Export functions for use in other scripts
export -f gpg_status gpg_recover gpg_manual_recovery

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi