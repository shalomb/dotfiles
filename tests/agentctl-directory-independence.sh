#!/bin/bash
# Test script for agentctl directory independence
# Ensures agentctl works from any directory, not just dotfiles root

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

# Test directories to try
TEST_DIRS=(
    "/tmp"
    "/home/unop"
    "/home/unop/oneTakeda/BuildingBlock-Template"
    "/var/tmp"
    "/usr/local"
)

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

# Function to check if agentctl function exists
check_agentctl_function() {
    local test_dir="$1"
    local test_name="$2"
    
    run_test "$test_name" "
        cd '$test_dir' && 
        source ~/.bashrc && 
        type agentctl >/dev/null 2>&1
    "
}

# Function to check if agentctl can run without module errors
check_agentctl_execution() {
    local test_dir="$1"
    local test_name="$2"
    
    run_test "$test_name" "
        cd '$test_dir' && 
        source ~/.bashrc && 
        agentctl --help >/dev/null 2>&1
    "
}

# Function to check if agentctl can find the Python module
check_agentctl_module_import() {
    local test_dir="$1"
    local test_name="$2"
    
    run_test "$test_name" "
        cd '$test_dir' && 
        source ~/.bashrc && 
        agentctl init >/dev/null 2>&1
    "
}

# Function to check DOTFILES_DIR environment variable
check_dotfiles_dir() {
    local test_dir="$1"
    local test_name="$2"
    
    run_test "$test_name" "
        cd '$test_dir' && 
        source ~/.bashrc && 
        [[ -n \"\$DOTFILES_DIR\" ]] && 
        [[ -d \"\$DOTFILES_DIR\" ]] && 
        [[ -f \"\$DOTFILES_DIR/src/agent_management/agentctl.py\" ]]
    "
}

echo "🧪 Testing agentctl directory independence..."
echo "=============================================="

# Test 1: Check that agentctl function is available from different directories
echo -e "\n${YELLOW}Test 1: Function Availability${NC}"
for test_dir in "${TEST_DIRS[@]}"; do
    if [[ -d "$test_dir" ]]; then
        check_agentctl_function "$test_dir" "agentctl function available from $test_dir"
    fi
done

# Test 2: Check that agentctl can execute without module errors
echo -e "\n${YELLOW}Test 2: Execution Without Module Errors${NC}"
for test_dir in "${TEST_DIRS[@]}"; do
    if [[ -d "$test_dir" ]]; then
        check_agentctl_execution "$test_dir" "agentctl executes from $test_dir"
    fi
done

# Test 3: Check that agentctl can import the Python module
echo -e "\n${YELLOW}Test 3: Python Module Import${NC}"
for test_dir in "${TEST_DIRS[@]}"; do
    if [[ -d "$test_dir" ]]; then
        check_agentctl_module_import "$test_dir" "agentctl imports module from $test_dir"
    fi
done

# Test 4: Check that DOTFILES_DIR is set correctly
echo -e "\n${YELLOW}Test 4: DOTFILES_DIR Environment Variable${NC}"
for test_dir in "${TEST_DIRS[@]}"; do
    if [[ -d "$test_dir" ]]; then
        check_dotfiles_dir "$test_dir" "DOTFILES_DIR set correctly from $test_dir"
    fi
done

# Test 5: Edge case - non-existent directory
echo -e "\n${YELLOW}Test 5: Edge Cases${NC}"
run_test "agentctl works from non-existent directory" "
    cd /nonexistent 2>/dev/null || true && 
    source ~/.bashrc && 
    agentctl --help >/dev/null 2>&1
"

# Test 6: Edge case - directory with spaces
echo -e "\n${YELLOW}Test 6: Directory with Spaces${NC}"
mkdir -p "/tmp/test dir with spaces"
run_test "agentctl works from directory with spaces" "
    cd '/tmp/test dir with spaces' && 
    source ~/.bashrc && 
    agentctl --help >/dev/null 2>&1
"
rm -rf "/tmp/test dir with spaces"

# Test 7: Edge case - symlinked directory
echo -e "\n${YELLOW}Test 7: Symlinked Directory${NC}"
ln -sf /tmp /tmp/symlinked_dir
run_test "agentctl works from symlinked directory" "
    cd /tmp/symlinked_dir && 
    source ~/.bashrc && 
    agentctl --help >/dev/null 2>&1
"
rm -f /tmp/symlinked_dir

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✅ All tests passed! agentctl is directory-independent.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. agentctl may not work from all directories.${NC}"
    exit 1
fi