#!/bin/bash
# Test script for bash function loading in interactive and non-interactive shells
# Ensures functions load correctly and interactive checks don't break sourcing
# TESTS REPO VERSION, NOT LIVE CONFIG

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_exit_code="${3:-0}"
    
    echo -n "Testing: $test_name... "
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if eval "$test_command" >/dev/null 2>&1; then
        local actual_exit_code=$?
        if [[ $actual_exit_code -eq $expected_exit_code ]]; then
            echo -e "${GREEN}PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}FAIL${NC} (exit code $actual_exit_code, expected $expected_exit_code)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        local actual_exit_code=$?
        if [[ $actual_exit_code -eq $expected_exit_code ]]; then
            echo -e "${GREEN}PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}FAIL${NC} (exit code $actual_exit_code, expected $expected_exit_code)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
}

# Function to check if a function is defined with expected content
check_function_content() {
    local function_name="$1"
    local expected_content="$2"
    local test_name="$3"
    
    run_test "$test_name" "
        bash -i -c 'source .config/bash/bashrc && declare -f $function_name' | grep -q '$expected_content'
    "
}

# Function to check if a function is defined
check_function_exists() {
    local function_name="$1"
    local test_name="$2"
    
    run_test "$test_name" "
        bash -i -c 'source .config/bash/bashrc && type $function_name >/dev/null 2>&1'
    "
}

# Function to check if a function works correctly
check_function_works() {
    local function_name="$1"
    local test_command="$2"
    local test_name="$3"
    
    run_test "$test_name" "
        bash -i -c 'source .config/bash/bashrc && $function_name $test_command >/dev/null 2>&1'
    "
}

echo "🧪 Testing bash function loading..."
echo "=================================="

# Test 1: Check that agentctl function is defined
echo -e "\n${YELLOW}Test 1: Function Definition${NC}"
check_function_exists "agentctl" "agentctl function is defined"

# Test 2: Check that agentctl function has the correct content (DOTFILES_DIR logic)
echo -e "\n${YELLOW}Test 2: Function Content${NC}"
check_function_content "agentctl" "local dotfiles_dir" "agentctl has DOTFILES_DIR logic"
check_function_content "agentctl" "DOTFILES_DIR" "agentctl uses DOTFILES_DIR variable"

# Test 3: Check that agentctl function works correctly
echo -e "\n${YELLOW}Test 3: Function Execution${NC}"
check_function_works "agentctl" "--help" "agentctl --help works"

# Test 4: Check that functions load in interactive shells
echo -e "\n${YELLOW}Test 4: Interactive Shell Loading${NC}"
run_test "Functions load in interactive shell" "
    bash -i -c 'source .config/bash/bashrc && type agentctl >/dev/null 2>&1'
"

# Test 5: Check that functions load from different directories
echo -e "\n${YELLOW}Test 5: Directory Independence${NC}"
run_test "Functions load from /tmp" "
    cd /tmp && bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc && type agentctl >/dev/null 2>&1'
"

# Test 6: Check that enabled scripts don't have individual interactive checks
echo -e "\n${YELLOW}Test 6: No Individual Interactive Checks${NC}"
run_test "No individual interactive checks in enabled scripts" "
    ! grep -r '\\[\\[ \\${-//\\[!i\\]/} \\]\\] || return' .config/bash/enabled/ 2>/dev/null || true
"

# Test 7: Check that bashrc uses INTERACTIVE_MODE variable
echo -e "\n${YELLOW}Test 7: Centralized Interactive Check${NC}"
run_test "bashrc uses INTERACTIVE_MODE variable" "
    grep -q 'INTERACTIVE_MODE' ~/.config/dotfiles/.config/bash/bashrc
"

# Test 8: Check that enabled scripts are only loaded in interactive mode
echo -e "\n${YELLOW}Test 8: Enabled Scripts Loading Logic${NC}"
run_test "Enabled scripts loading is wrapped in INTERACTIVE_MODE check" "
    grep -A 10 -B 10 'enabled/.*\\.sh' ~/.config/dotfiles/.config/bash/bashrc | grep -q 'INTERACTIVE_MODE'
"

# Test 9: Check that functions work from any directory
echo -e "\n${YELLOW}Test 9: Directory Independence${NC}"
run_test "agentctl works from /tmp" "
    cd /tmp && bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc && agentctl --help >/dev/null 2>&1'
"

run_test "agentctl works from /var/tmp" "
    cd /var/tmp && bash -i -c 'source ~/.config/dotfiles/.config/bash/bashrc && agentctl --help >/dev/null 2>&1'
"

# Test 10: Check that no functions are exported as environment variables
echo -e "\n${YELLOW}Test 10: No Function Environment Variables${NC}"
run_test "No BASH_FUNC_agentctl environment variable" "
    ! env | grep -q 'BASH_FUNC_agentctl' || true
"

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✅ All tests passed! Bash function loading is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Bash function loading has issues.${NC}"
    exit 1
fi