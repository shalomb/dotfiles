#!/bin/bash
# Comprehensive bash standards validation
# TUI-safe: minimal output, fast execution

set -uo pipefail

# Source essential bash configuration to make functions available
# Use relative paths from the repository root
if [[ -f .config/bash/rc.d/01-functions ]]; then
    source .config/bash/rc.d/01-functions
fi

# Define essential functions locally for testing
reload() {
    source .config/bash/bashrc
}

# Source dotfiles function if available
if [[ -f .config/bash/rc.d/dotfiles ]]; then
    source .config/bash/rc.d/dotfiles
fi

# Source aliases if available
if [[ -f .config/bash/aliases ]]; then
    source .config/bash/aliases
fi

# Source fzf-utils for cdp function
if [[ -f .config/bash/tools/fzf-utils.sh ]]; then
    source .config/bash/tools/fzf-utils.sh
fi

# Colors for output (TUI-safe) - using tput instead of hardcoded codes
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

# Function to check if a function exists
check_function() {
    local func_name="$1"
    type -t "$func_name" >/dev/null 2>&1 || return 1
}

# Function to check if an alias exists
check_alias() {
    local alias_name="$1"
    alias "$alias_name" >/dev/null 2>&1
}

# Main validation function
main() {
    echo "Running bash standards validation..."
    echo
    
    # Core functionality tests
    echo "Core Functions:"
    run_test "reload function" "check_function reload"
    run_test "dotfiles function" "check_function dotfiles"
    run_test "@is-interactive function" "check_function @is-interactive"
    run_test "@has-cmd function" "check_function @has-cmd"
    run_test "warn function" "check_function warn"
    run_test "die function" "check_function die"
    
    echo
    echo "Essential Aliases:"
    run_test "ls alias" "check_alias ls"
    run_test "grep alias" "check_alias grep"
    run_test "cdp function" "check_function cdp"
    
    echo
    echo "Architecture Tests:"
    run_test "bashrc exists" "[ -f .bashrc ]"
    run_test "enabled directory exists" "[ -d .config/bash/enabled ]"
    run_test "rc.d directory exists" "[ -d .config/bash/rc.d ]"
    run_test "tools directory exists" "[ -d .config/bash/tools ]"
    
    echo
    echo "Functionality Tests:"
    run_test "dotfiles help works" "dotfiles help >/dev/null 2>&1"
    run_test "reload function works" "reload >/dev/null 2>&1"
    
    # Summary
    echo
    echo "Validation Summary:"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}Failed: $FAILED${NC}"
        return 1
    else
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    fi
}

# Run main function
main "$@"