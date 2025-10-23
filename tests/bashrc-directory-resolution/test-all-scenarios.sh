#!/bin/bash
# Test script for robust bashrc directory resolution
# Tests all deployment scenarios to ensure BASHRC_DIR works correctly

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
ORIGINAL_BASHRC="$HOME/.bashrc"

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
    # Restore original bashrc if it was modified
    if [[ -L "$ORIGINAL_BASHRC" ]]; then
        rm -f "$ORIGINAL_BASHRC"
    fi
}

# Function to create test bashrc
create_test_bashrc() {
    local bashrc_content='
#!/bin/bash
# Test bashrc for directory resolution testing

# Source the resolve function
if [[ -f "$HOME/.config/dotfiles/.config/bash/lib/resolve-bashrc-dir.sh" ]]; then
    source "$HOME/.config/dotfiles/.config/bash/lib/resolve-bashrc-dir.sh"
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

# Test 1: Symlink scenario
echo -e "\n${YELLOW}Test 1: Symlink Deployment${NC}"
ln -sf "$TEST_DIR/test-bashrc" "$ORIGINAL_BASHRC"
run_test "Symlink deployment" "bash -c 'source ~/.bashrc'" "$TEST_DIR"

# Test 2: Regular file scenario
echo -e "\n${YELLOW}Test 2: Regular File Deployment${NC}"
cp "$TEST_DIR/test-bashrc" "$ORIGINAL_BASHRC"
run_test "Regular file deployment" "bash -c 'source ~/.bashrc'" "$TEST_DIR"

# Test 3: Repository scenario
echo -e "\n${YELLOW}Test 3: Repository Development${NC}"
cd "$HOME/.config/dotfiles"
run_test "Repository development" "bash -c 'source .config/bash/bashrc'" "$HOME/.config/dotfiles/.config/bash"

# Test 4: Non-interactive shell
echo -e "\n${YELLOW}Test 4: Non-Interactive Shell${NC}"
run_test "Non-interactive shell" "bash -c 'source ~/.bashrc'" "$TEST_DIR"

# Test 5: Interactive shell
echo -e "\n${YELLOW}Test 5: Interactive Shell${NC}"
run_test "Interactive shell" "bash -i -c 'source ~/.bashrc'" "$TEST_DIR"

# Test 6: Different working directory
echo -e "\n${YELLOW}Test 6: Different Working Directory${NC}"
cd /tmp
run_test "Different working directory" "bash -c 'source ~/.bashrc'" "$TEST_DIR"

# Test 7: XDG fallback
echo -e "\n${YELLOW}Test 7: XDG Fallback${NC}"
# Create a scenario where only XDG path exists
rm -f "$ORIGINAL_BASHRC"
ln -sf "$HOME/.config/bash/bashrc" "$ORIGINAL_BASHRC"
run_test "XDG fallback" "bash -c 'source ~/.bashrc'" "$HOME/.config/bash"

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