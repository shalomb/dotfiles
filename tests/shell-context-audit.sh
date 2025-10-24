#!/bin/bash
# Comprehensive Shell Context Audit
# Tests interactive, non-interactive, and login shell contexts

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Focus mode - run only tests matching pattern
FOCUS_PATTERN="${1:-}"

# Test result function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    # Skip if focus pattern set and test doesn't match
    if [[ -n "$FOCUS_PATTERN" && ! "$test_name" =~ $FOCUS_PATTERN ]]; then
        return 0
    fi
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo "🧪 Shell Context Audit"
if [[ -n "$FOCUS_PATTERN" ]]; then
    echo "🎯 Focus: $FOCUS_PATTERN"
fi
echo "======================"

# =============================================================================
# NON-INTERACTIVE SHELL TESTS
# =============================================================================

echo -e "\n${YELLOW}Non-Interactive Shell Context${NC}"
echo "-----------------------------"

# Test universal functions (should work)
run_test "has-cmd function available" "
    env -u SSH_CLIENT -u SSH_TTY bash -c 'source ~/.config/dotfiles/.config/bash/bashrc && type has-cmd >/dev/null'
"

run_test "defined function available" "
    env -u SSH_CLIENT -u SSH_TTY bash -c 'source ~/.config/dotfiles/.config/bash/bashrc && type defined >/dev/null'
"

run_test "dotfiles function available" "
    env -u SSH_CLIENT -u SSH_TTY bash -c 'source ~/.config/dotfiles/.config/bash/bashrc && type dotfiles >/dev/null'
"

# Test interactive functions (should NOT work)
run_test "reload function NOT available" "
    ! env -u SSH_CLIENT -u SSH_TTY bash -c 'source ~/.config/dotfiles/.config/bash/bashrc && type reload >/dev/null 2>&1'
"

run_test "aliases NOT loaded" "
    alias_count=\$(env -u SSH_CLIENT -u SSH_TTY bash -c 'source ~/.config/dotfiles/.config/bash/bashrc >/dev/null 2>&1; alias | wc -l')
    test \"\$alias_count\" -lt 10
"

# =============================================================================
# INTERACTIVE SHELL TESTS  
# =============================================================================

echo -e "\n${YELLOW}Interactive Shell Context${NC}"
echo "-------------------------"

# Test universal functions (should work)
run_test "has-cmd function available" "
    bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc && type has-cmd >/dev/null'
"

run_test "dotfiles function available" "
    bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc && type dotfiles >/dev/null'
"

# Test interactive functions (should work)
run_test "reload function available" "
    bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc && type reload >/dev/null'
"

run_test "aliases loaded" "
    bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc; alias_count=\$(alias | wc -l); test \$alias_count -gt 50'
"

run_test "dotfiles helpers available" "
    bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc && type _dotfiles_help >/dev/null'
"

run_test "dotfiles --help works" "
    bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc && dotfiles --help >/dev/null'
"

# =============================================================================
# LOGIN SHELL TESTS
# =============================================================================

echo -e "\n${YELLOW}Login Shell Context${NC}"
echo "-------------------"

# Test login shell sources bash_profile then bashrc
run_test "login shell loads bashrc" "
    bash -l -c 'type dotfiles >/dev/null'
"

run_test "login shell has interactive features" "
    bash -l -c 'type reload >/dev/null'
"

run_test "login shell has aliases" "
    bash -l -i -c 'alias_count=\$(alias | wc -l); test \$alias_count -gt 50'
"

run_test "PATH set correctly in login shell" "
    bash -l -c 'echo \$PATH | grep -q \"\$HOME/.local/bin\"'
"

# =============================================================================
# SSH CONTEXT TESTS
# =============================================================================

echo -e "\n${YELLOW}SSH Context Tests${NC}"
echo "-----------------"

# Test SSH non-interactive (should load interactive features due to SSH context)
run_test "SSH non-interactive loads interactive features" "
    SSH_CLIENT='test' bash -c 'source ~/.config/dotfiles/.config/bash/bashrc && type reload >/dev/null'
"

run_test "SSH context has aliases" "
    SSH_CLIENT='test' bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc; alias_count=\$(alias | wc -l); test \$alias_count -gt 50'
"

# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

echo -e "\n${YELLOW}Performance Tests${NC}"
echo "-----------------"

run_test "non-interactive startup < 0.1s" "
    time_output=\$(env -u SSH_CLIENT -u SSH_TTY bash -c 'time source ~/.config/dotfiles/.config/bash/bashrc' 2>&1)
    real_time=\$(echo \"\$time_output\" | grep real | awk '{print \$2}' | sed 's/[ms]//g')
    awk 'BEGIN { exit (\$1 < 0.1) ? 0 : 1 }' <<< \"\$real_time\"
"

run_test "interactive startup < 0.2s" "
    time_output=\$(bash -i -c 'time source ~/.config/dotfiles/.config/bash/bashrc' 2>&1)
    real_time=\$(echo \"\$time_output\" | grep real | awk '{print \$2}' | sed 's/[ms]//g')
    awk 'BEGIN { exit (\$1 < 0.2) ? 0 : 1 }' <<< \"\$real_time\"
"

# =============================================================================
# SUMMARY
# =============================================================================

echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All shell context tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some shell context tests failed.${NC}"
    exit 1
fi
