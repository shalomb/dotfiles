#!/bin/bash
# Comprehensive bash test suite runner

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERBOSE=${1:-false}

# Test suite definitions
declare -A TEST_SUITES=(
    ["syntax"]="goss-bash-safe.yaml"
    ["comprehensive"]="goss-bash-comprehensive.yaml"
    ["contexts"]="goss-bash-contexts.yaml"
    ["bootstrap"]="goss-bash-bootstrap.yaml"
    ["functions"]="goss-bash-functions.yaml"
    ["audit"]="shell-context-audit.sh"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

run_goss_test() {
    local test_file="$1"
    local suite_name="$2"

    echo -e "${BLUE}Running $suite_name suite...${NC}"

    if [[ "$VERBOSE" == "true" ]]; then
        setsid goss -g "$test_file" validate --format documentation </dev/null
    else
        if setsid goss -g "$test_file" validate --format tap </dev/null >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $suite_name: PASSED${NC}"
            return 0
        else
            echo -e "${RED}❌ $suite_name: FAILED${NC}"
            if [[ "$VERBOSE" != "true" ]]; then
                echo "  Run with 'make test-bash VERBOSE=true' for details"
            fi
            return 1
        fi
    fi
}

run_shell_test() {
    local test_file="$1"
    local suite_name="$2"
    
    echo -e "${BLUE}Running $suite_name suite...${NC}"
    
    if [[ "$VERBOSE" == "true" ]]; then
        "./$test_file"
    else
        if "./$test_file" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $suite_name: PASSED${NC}"
            return 0
        else
            echo -e "${RED}❌ $suite_name: FAILED${NC}"
            echo "  Run with 'make test-bash VERBOSE=true' for details"
            return 1
        fi
    fi
}

main() {
    cd "$SCRIPT_DIR"
    
    echo -e "${YELLOW}Running comprehensive bash test suites...${NC}"
    [[ "$VERBOSE" == "true" ]] && echo -e "${YELLOW}Verbose mode enabled${NC}"
    
    local failed_suites=()
    local total_suites=0
    
    # Run each test suite
    for suite_name in "${!TEST_SUITES[@]}"; do
        test_file="${TEST_SUITES[$suite_name]}"
        total_suites=$((total_suites + 1))
        
        if [[ ! -f "$test_file" ]]; then
            echo -e "${YELLOW}⚠️  $suite_name: SKIPPED (file not found: $test_file)${NC}"
            continue
        fi
        
        if [[ "$test_file" == *.yaml ]]; then
            if ! run_goss_test "$test_file" "$suite_name"; then
                failed_suites+=("$suite_name")
            fi
        else
            if ! run_shell_test "$test_file" "$suite_name"; then
                failed_suites+=("$suite_name")
            fi
        fi
        
        echo # Add spacing between suites
    done
    
    # Summary
    local passed_count=$((total_suites - ${#failed_suites[@]}))
    echo -e "${BLUE}=== Test Suite Summary ===${NC}"
    echo -e "${GREEN}Passed: $passed_count${NC}"
    echo -e "${RED}Failed: ${#failed_suites[@]}${NC}"
    
    if [[ ${#failed_suites[@]} -gt 0 ]]; then
        echo -e "${RED}Failed suites: ${failed_suites[*]}${NC}"
        exit 1
    else
        echo -e "${GREEN}All bash test suites passed!${NC}"
        exit 0
    fi
}

main "$@"
