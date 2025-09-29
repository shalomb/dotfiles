#!/bin/bash
# Test script for cursor-agent container functionality

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Test 1: Check if container image exists
test_container_image() {
    print_status "$BLUE" "Test 1: Checking container image..."
    if podman image exists cursor-agent-container 2>/dev/null; then
        print_status "$GREEN" "✓ Container image exists"
        return 0
    else
        print_status "$RED" "✗ Container image not found"
        return 1
    fi
}

# Test 2: Check basic container functionality
test_basic_functionality() {
    print_status "$BLUE" "Test 2: Testing basic container functionality..."
    
    # Test if we can run a simple command with timeout
    if timeout 10s podman run --rm cursor-agent-container /bin/sh -c "echo 'Container works'" 2>/dev/null; then
        print_status "$GREEN" "✓ Container can execute commands"
        return 0
    else
        print_status "$RED" "✗ Container execution failed or timed out"
        return 1
    fi
}

# Test 3: Check tool availability
test_tools() {
    print_status "$BLUE" "Test 3: Testing tool availability..."
    
    local tools=("git" "curl" "jq" "rg")
    local all_tools_available=true
    
    for tool in "${tools[@]}"; do
        if timeout 5s podman run --rm cursor-agent-container /bin/sh -c "which $tool" 2>/dev/null; then
            print_status "$GREEN" "  ✓ $tool available"
        else
            print_status "$RED" "  ✗ $tool not available or timed out"
            all_tools_available=false
        fi
    done
    
    if $all_tools_available; then
        print_status "$GREEN" "✓ All tools available"
        return 0
    else
        print_status "$RED" "✗ Some tools missing"
        return 1
    fi
}

# Test 4: Check directory mounting
test_directory_mounting() {
    print_status "$BLUE" "Test 4: Testing directory mounting..."
    
    local test_dir="/tmp/cursor-agent-test"
    mkdir -p "$test_dir"
    echo "test file" > "$test_dir/test.txt"
    
    if timeout 10s podman run --rm -v "$test_dir:$test_dir" -w "$test_dir" cursor-agent-container /bin/sh -c "ls -la test.txt" 2>/dev/null; then
        print_status "$GREEN" "✓ Directory mounting works"
        rm -rf "$test_dir"
        return 0
    else
        print_status "$RED" "✗ Directory mounting failed or timed out"
        rm -rf "$test_dir"
        return 1
    fi
}

# Test 5: Check orchestration script
test_orchestration_script() {
    print_status "$BLUE" "Test 5: Testing orchestration script..."
    
    if [[ -f "cursor-agent-container.sh" && -x "cursor-agent-container.sh" ]]; then
        print_status "$GREEN" "✓ Orchestration script exists and is executable"
        return 0
    else
        print_status "$RED" "✗ Orchestration script missing or not executable"
        return 1
    fi
}

# Main test function
main() {
    print_status "$YELLOW" "Cursor-Agent Container Test Suite"
    print_status "$YELLOW" "================================="
    
    local tests_passed=0
    local total_tests=5
    
    test_container_image && ((tests_passed++))
    test_basic_functionality && ((tests_passed++))
    test_tools && ((tests_passed++))
    test_directory_mounting && ((tests_passed++))
    test_orchestration_script && ((tests_passed++))
    
    echo
    print_status "$BLUE" "Test Results: $tests_passed/$total_tests tests passed"
    
    if [[ $tests_passed -eq $total_tests ]]; then
        print_status "$GREEN" "✓ All tests passed! Container is ready for use."
        exit 0
    else
        print_status "$RED" "✗ Some tests failed. Please check the issues above."
        exit 1
    fi
}

# Run tests
main "$@"