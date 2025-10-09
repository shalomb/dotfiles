#!/bin/bash
# Bash configuration behavioral validation
# Tests generic behaviors, not specific functions/aliases

set -uo pipefail

# Colors for output (TUI-safe)
RED=$(tput setaf 1 2>/dev/null || echo '')
GREEN=$(tput setaf 2 2>/dev/null || echo '')
YELLOW=$(tput setaf 3 2>/dev/null || echo '')
NC=$(tput sgr0 2>/dev/null || echo '')

# Test results
PASSED=0
FAILED=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $test_name"
        ((FAILED++))
    fi
}

# Main validation function
main() {
    echo "Running bash behavioral validation..."
    echo
    
    # Architecture Tests - File structure exists
    echo "Architecture:"
    run_test "bashrc file exists" "[ -f .config/bash/bashrc ]"
    run_test "rc.d directory exists" "[ -d .config/bash/rc.d ]"
    run_test "enabled directory exists" "[ -d .config/bash/enabled ]"
    run_test "disabled directory exists" "[ -d .config/bash/disabled ]"
    
    echo
    echo "Sourcing Behavior:"
    # Test that bashrc can be sourced without errors in login shell context
    run_test "bashrc sources without errors" "BASH_PROFILE_SOURCED=1 bash --norc -c 'source .config/bash/bashrc 2>&1' | grep -qiv 'error\|fatal'"
    # Test that rc.d files are readable
    run_test "rc.d files are readable" "[ -r .config/bash/rc.d/01-functions ]"
    # Test that enabled files are readable (if any exist)
    run_test "enabled files are readable" "[ ! -d .config/bash/enabled ] || [ -z \"\$(ls -A .config/bash/enabled 2>/dev/null)\" ] || find .config/bash/enabled -name '*.sh' -type f ! -readable | wc -l | grep -q '^0$'"
    
    echo
    echo "Loading Behavior:"
    # Test that rc.d is loaded (by checking BASHRC_DIR is set after sourcing)
    run_test "rc.d directory is located" "BASH_PROFILE_SOURCED=1 bash --norc -c 'source .config/bash/bashrc && [ -n \"\$BASHRC_DIR\" ]'"
    # Test that enabled scripts can be loaded without permission errors
    run_test "enabled scripts load cleanly" "BASH_PROFILE_SOURCED=1 bash --norc -c 'source .config/bash/bashrc 2>&1' | grep -qiv 'permission denied'"
    
    echo
    echo "Shell Startup Performance:"
    # Test that shell startup is reasonably fast (< 2 seconds)
    run_test "bashrc loads in < 2 seconds" "timeout 2s bash --norc -c 'BASH_PROFILE_SOURCED=1 source .config/bash/bashrc'"
    
    echo
    echo "Error Handling:"
    # Test that bashrc doesn't exit with error
    run_test "bashrc exits cleanly" "BASH_PROFILE_SOURCED=1 bash --norc -c 'source .config/bash/bashrc && exit 0'"
    # Test that bashrc completes successfully
    run_test "bashrc completes without errors" "BASH_PROFILE_SOURCED=1 bash --norc -c 'source .config/bash/bashrc && echo ok' | grep -q ok"
    
    # Summary
    echo
    echo "Validation Summary:"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}Failed: $FAILED${NC}"
        echo
        echo "Fix behavioral issues before deploying bash configuration changes."
        return 1
    else
        echo -e "${GREEN}All behavioral tests passed!${NC}"
        return 0
    fi
}

# Run main function
main "$@"
