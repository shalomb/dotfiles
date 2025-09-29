#!/bin/bash
# Cursor Agent Bash Initialization Patch
# 
# This script applies a patch to fix bash initialization issues in cursor-agent.
# The patch adds a `G8n+` prefix to ensure proper bash initialization before
# running commands, fixing potential shell state issues.
#
# Usage: cursor-agent-patch.sh [apply|status|restore]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_NAME="$(basename "$0")"
PATCH_MARKER='G8n+`snap='
ORIGINAL_PATTERN='let s=\["-O","extglob","-c",`snap='
PATCHED_PATTERN='let s=["-O","extglob","-c",G8n+`snap='

# Function to print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Function to find cursor-agent installations
find_cursor_agent_installations() {
    local installations=()
    local search_paths=(
        "$HOME/.local/share/cursor-agent"
        "/opt/cursor-agent"
        "/usr/local/share/cursor-agent"
        "/usr/share/cursor-agent"
    )
    
    for base_path in "${search_paths[@]}"; do
        if [[ -d "$base_path/versions" ]]; then
            # Find all version directories
            while IFS= read -r -d '' version_dir; do
                if [[ -f "$version_dir/index.js" ]]; then
                    installations+=("$version_dir")
                fi
            done < <(find "$base_path/versions" -maxdepth 1 -type d -name "20*" -print0 2>/dev/null)
        fi
    done
    
    printf '%s\n' "${installations[@]}"
}

# Function to apply patch to a single installation
apply_patch_to_installation() {
    local installation_dir="$1"
    local index_js="$installation_dir/index.js"
    local backup_file="$index_js.original"
    
    print_status "$BLUE" "Processing: $installation_dir"
    
    # Check if file exists
    if [[ ! -f "$index_js" ]]; then
        print_status "$RED" "  ✗ index.js not found"
        return 1
    fi
    
    # Create backup if it doesn't exist
    if [[ ! -f "$backup_file" ]]; then
        print_status "$YELLOW" "  Creating backup: $(basename "$backup_file")"
        cp "$index_js" "$backup_file"
    else
        print_status "$BLUE" "  Backup already exists: $(basename "$backup_file")"
    fi
    
    # Check if patch is already applied
    if grep -q "$PATCH_MARKER" "$index_js"; then
        print_status "$GREEN" "  ✓ Patch already applied"
        return 0
    fi
    
    # Apply the patch
    print_status "$YELLOW" "  Applying patch..."
    if sed -i "s/$ORIGINAL_PATTERN/$PATCHED_PATTERN/" "$index_js"; then
        # Verify patch was applied
        if grep -q "$PATCH_MARKER" "$index_js"; then
            print_status "$GREEN" "  ✓ Patch applied successfully"
            return 0
        else
            print_status "$RED" "  ✗ Patch verification failed"
            return 1
        fi
    else
        print_status "$RED" "  ✗ Patch application failed"
        return 1
    fi
}

# Function to restore from backup
restore_from_backup() {
    local installation_dir="$1"
    local index_js="$installation_dir/index.js"
    local backup_file="$index_js.original"
    
    print_status "$BLUE" "Processing: $installation_dir"
    
    if [[ -f "$backup_file" ]]; then
        print_status "$YELLOW" "  Restoring from backup..."
        cp "$backup_file" "$index_js"
        print_status "$GREEN" "  ✓ Restored from backup"
        return 0
    else
        print_status "$RED" "  ✗ No backup found to restore from"
        return 1
    fi
}

# Function to check patch status
check_patch_status() {
    local installation_dir="$1"
    local index_js="$installation_dir/index.js"
    
    print_status "$BLUE" "Checking: $installation_dir"
    
    if [[ ! -f "$index_js" ]]; then
        print_status "$RED" "  ✗ index.js not found"
        return 1
    fi
    
    if grep -q "$PATCH_MARKER" "$index_js"; then
        print_status "$GREEN" "  ✓ Patch is applied"
        return 0
    else
        print_status "$YELLOW" "  ✗ Patch is not applied"
        return 1
    fi
}

# Function to run basic tests
run_basic_tests() {
    local installation_dir="$1"
    
    print_status "$BLUE" "Running basic tests for: $installation_dir"
    
    cd "$installation_dir"
    
    # Test 1: Check if cursor-agent runs without immediate errors
    print_status "$YELLOW" "  Test 1: Basic startup test"
    if timeout 5s ./cursor-agent --help >/dev/null 2>&1; then
        print_status "$GREEN" "    ✓ Startup test passed"
    else
        print_status "$RED" "    ✗ Startup test failed"
        return 1
    fi
    
    # Test 2: Test shell command execution
    print_status "$YELLOW" "  Test 2: Shell command test"
    if timeout 10s ./cursor-agent -p --force "run echo test" >/dev/null 2>&1; then
        print_status "$GREEN" "    ✓ Shell command test passed"
    else
        print_status "$RED" "    ✗ Shell command test failed"
        return 1
    fi
    
    return 0
}

# Main function
main() {
    local action="${1:-apply}"
    
    print_status "$YELLOW" "Cursor Agent Bash Initialization Patch"
    print_status "$YELLOW" "======================================="
    
    # Find cursor-agent installations
    local installations
    mapfile -t installations < <(find_cursor_agent_installations)
    
    if [[ ${#installations[@]} -eq 0 ]]; then
        print_status "$RED" "Error: Could not find any cursor-agent installations"
        print_status "$YELLOW" "Searched in:"
        echo "  - $HOME/.local/share/cursor-agent"
        echo "  - /opt/cursor-agent"
        echo "  - /usr/local/share/cursor-agent"
        echo "  - /usr/share/cursor-agent"
        exit 1
    fi
    
    print_status "$GREEN" "Found ${#installations[@]} cursor-agent installation(s)"
    
    local success_count=0
    local total_count=${#installations[@]}
    
    case "$action" in
        "apply")
            print_status "$YELLOW" "Applying patches..."
            for installation in "${installations[@]}"; do
                if apply_patch_to_installation "$installation"; then
                    ((success_count++))
                fi
            done
            
            if [[ $success_count -eq $total_count ]]; then
                print_status "$GREEN" "✓ All patches applied successfully!"
                
                # Run tests on the first installation
                if [[ ${#installations[@]} -gt 0 ]]; then
                    echo
                    run_basic_tests "${installations[0]}"
                fi
            else
                print_status "$RED" "✗ Some patches failed ($success_count/$total_count successful)"
                exit 1
            fi
            ;;
            
        "restore")
            print_status "$YELLOW" "Restoring from backups..."
            for installation in "${installations[@]}"; do
                if restore_from_backup "$installation"; then
                    ((success_count++))
                fi
            done
            
            if [[ $success_count -eq $total_count ]]; then
                print_status "$GREEN" "✓ All installations restored successfully!"
            else
                print_status "$RED" "✗ Some restores failed ($success_count/$total_count successful)"
                exit 1
            fi
            ;;
            
        "status")
            print_status "$YELLOW" "Checking patch status..."
            for installation in "${installations[@]}"; do
                if check_patch_status "$installation"; then
                    ((success_count++))
                fi
            done
            
            echo
            print_status "$BLUE" "Summary: $success_count/$total_count installations have the patch applied"
            ;;
            
        *)
            print_status "$RED" "Usage: $SCRIPT_NAME [apply|status|restore]"
            echo ""
            echo "Commands:"
            echo "  apply   - Apply the bash initialization fix (default)"
            echo "  status  - Check if patch is applied"
            echo "  restore - Restore from backup"
            echo ""
            echo "This patch fixes bash initialization issues in cursor-agent by adding"
            echo "a G8n+ prefix to ensure proper bash initialization before running commands."
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"