#!/bin/bash
# Fast shellcheck runner for bash standards validation
# TUI-safe: redirects output to avoid breaking cursor-agent interface

set -euo pipefail

# Colors for output (TUI-safe) - using tput instead of hardcoded codes
RED=$(tput setaf 1 2>/dev/null || echo '')
GREEN=$(tput setaf 2 2>/dev/null || echo '')
YELLOW=$(tput setaf 3 2>/dev/null || echo '')
NC=$(tput sgr0 2>/dev/null || echo '')

# Test configuration
SHELLCHECK_OPTS="--shell=bash --external-sources --exclude=SC1090,SC1091"
TIMEOUT=30
MAX_FILES=50

# Function to run shellcheck on a file
check_file() {
    local file="$1"
    local output_file="/tmp/shellcheck_$(basename "$file").out"
    
    # Run shellcheck with timeout
    if timeout "$TIMEOUT" shellcheck $SHELLCHECK_OPTS "$file" > "$output_file" 2>&1; then
        echo -e "${GREEN}✓${NC} $file"
        return 0
    else
        echo -e "${RED}✗${NC} $file"
        cat "$output_file"
        return 1
    fi
}

# Main function
main() {
    echo "Running shellcheck validation..."
    
    local failed=0
    local total=0
    
    # Find all bash files
    local files=()
    while IFS= read -r -d '' file; do
        files+=("$file")
    done < <(find .config/bash -name "*.sh" -type f -print0 | head -z -n "$MAX_FILES")
    
    # Check each file
    for file in "${files[@]}"; do
        ((total++))
        if ! check_file "$file"; then
            ((failed++))
        fi
    done
    
    # Summary
    echo
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}All $total files passed shellcheck validation${NC}"
        return 0
    else
        echo -e "${RED}$failed of $total files failed shellcheck validation${NC}"
        return 1
    fi
}

# Run main function
main "$@"