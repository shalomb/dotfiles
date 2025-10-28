#!/bin/bash
# Test script for robust bashrc directory resolution
# Tests all deployment scenarios to ensure BASHRC_DIR works correctly
# TESTS REPO VERSION, NOT LIVE CONFIG

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test directories
TEST_DIR="/tmp/bashrc-test-$$"
REPO_BASHRC=".config/bash/bashrc"

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_bashrc_dir="$3"
    
    echo -n "Testing: $test_name... "
    TESTS_RUN=$((TESTS_RUN + 1))
    
    # Run test and capture output
    local output
    local exit_code
    if output=$(eval "$test_command" 2>&1); then
        exit_code=0
    else
        exit_code=$?
    fi
    
    # Check if BASHRC_DIR matches expected
    local actual_bashrc_dir
    actual_bashrc_dir=$(echo "$output" | grep "BASHRC_DIR:" | cut -d: -f2 | tr -d ' ')
    
    if [[ "$actual_bashrc_dir" == "$expected_bashrc_dir" ]]; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC}"
        echo "  Expected: $expected_bashrc_dir"
        echo "  Actual: $actual_bashrc_dir"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to setup test environment
setup_test_env() {
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
}

# Function to cleanup test environment
cleanup_test_env() {
    cd /
    rm -rf "$TEST_DIR"
}

# Function to create test bashrc
create_test_bashrc() {
    local bashrc_content='
#!/bin/bash
# Test bashrc for directory resolution testing

# Source the resolve function
if [[ -f ".config/bash/lib/resolve-bashrc-dir.sh" ]]; then
    source ".config/bash/lib/resolve-bashrc-dir.sh"
fi

# Set BASHRC_DIR using robust resolution
BASHRC_DIR=$(resolve_bashrc_dir)

# Output for testing
echo "BASHRC_DIR: $BASHRC_DIR"
'
    echo "$bashrc_content" > "$TEST_DIR/test-bashrc"
    chmod +x "$TEST_DIR/test-bashrc"
}

# Trap to ensure cleanup
trap cleanup_test_env EXIT

echo "🧪 Testing bashrc directory resolution..."
echo "========================================"

# Setup test environment
setup_test_env
create_test_bashrc

# Test 1: Repository development (normal case)
echo -e "\n${YELLOW}Test 1: Repository Development${NC}"
run_test "Repository development" "bash -c 'source .config/bash/bashrc'" "$(pwd)/.config/bash"

# Test 2: Non-interactive shell
echo -e "\n${YELLOW}Test 2: Non-Interactive Shell${NC}"
run_test "Non-interactive shell" "bash -c 'source .config/bash/bashrc'" "$(pwd)/.config/bash"

# Test 3: Interactive shell
echo -e "\n${YELLOW}Test 3: Interactive Shell${NC}"
run_test "Interactive shell" "bash -i -c 'source .config/bash/bashrc'" "$(pwd)/.config/bash"

# Test 4: Different working directory
echo -e "\n${YELLOW}Test 4: Different Working Directory${NC}"
cd /tmp
run_test "Different working directory" "bash -c 'source .config/bash/bashrc'" "$(pwd)/.config/bash"

# Test 5: From /var/tmp
echo -e "\n${YELLOW}Test 5: From /var/tmp${NC}"
cd /var/tmp
run_test "From /var/tmp" "bash -c 'source .config/bash/bashrc'" "$(pwd)/.config/bash"

# Test 6: From home directory
echo -e "\n${YELLOW}Test 6: From Home Directory${NC}"
cd ~
run_test "From home directory" "bash -c 'source .config/bash/bashrc'" "$(pwd)/.config/bash"

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"
echo "Tests run: $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✅ All tests passed! Directory resolution is robust.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Directory resolution needs fixes.${NC}"
    exit 1
fi