#!/bin/bash
# Cursor Agent Bash Initialization Fix
# 
# This script applies a patch to fix bash initialization issues in cursor-agent.
# The patch adds a `G8n+` prefix to ensure proper bash initialization before
# running commands, fixing potential shell state issues.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to find cursor-agent installation
find_cursor_agent() {
    local search_paths=(
        "$HOME/.local/share/cursor-agent"
        "/opt/cursor-agent"
        "/usr/local/share/cursor-agent"
        "/usr/share/cursor-agent"
    )
    
    for path in "${search_paths[@]}"; do
        if [[ -d "$path" ]]; then
            # Find the latest version
            local latest_version
            latest_version=$(find "$path/versions" -maxdepth 1 -type d -name "20*" | sort -V | tail -1)
            if [[ -n "$latest_version" && -f "$latest_version/index.js" ]]; then
                echo "$latest_version"
                return 0
            fi
        fi
    done
    
    return 1
}

# Function to apply the patch
apply_patch() {
    local cursor_agent_dir="$1"
    local index_js="$cursor_agent_dir/index.js"
    local backup_file="$index_js.original"
    
    echo -e "${YELLOW}Applying cursor-agent bash initialization fix...${NC}"
    
    # Check if file exists
    if [[ ! -f "$index_js" ]]; then
        echo -e "${RED}Error: index.js not found at $index_js${NC}"
        return 1
    fi
    
    # Create backup if it doesn't exist
    if [[ ! -f "$backup_file" ]]; then
        echo -e "${YELLOW}Creating backup: $backup_file${NC}"
        cp "$index_js" "$backup_file"
    fi
    
    # Check if patch is already applied
    if grep -q 'G8n+`snap=' "$index_js"; then
        echo -e "${GREEN}Patch already applied!${NC}"
        return 0
    fi
    
    # Apply the patch
    echo -e "${YELLOW}Applying patch...${NC}"
    sed -i 's/let s=\["-O","extglob","-c",`snap=/let s=["-O","extglob","-c",G8n+`snap=/' "$index_js"
    
    # Verify patch was applied
    if grep -q 'G8n+`snap=' "$index_js"; then
        echo -e "${GREEN}✓ Patch applied successfully!${NC}"
        echo -e "${GREEN}✓ Bash initialization fix is now active${NC}"
        return 0
    else
        echo -e "${RED}✗ Patch failed to apply${NC}"
        return 1
    fi
}

# Function to restore from backup
restore_backup() {
    local cursor_agent_dir="$1"
    local index_js="$cursor_agent_dir/index.js"
    local backup_file="$index_js.original"
    
    if [[ -f "$backup_file" ]]; then
        echo -e "${YELLOW}Restoring from backup...${NC}"
        cp "$backup_file" "$index_js"
        echo -e "${GREEN}✓ Restored from backup${NC}"
    else
        echo -e "${RED}No backup found to restore from${NC}"
        return 1
    fi
}

# Function to check patch status
check_status() {
    local cursor_agent_dir="$1"
    local index_js="$cursor_agent_dir/index.js"
    
    if [[ ! -f "$index_js" ]]; then
        echo -e "${RED}Error: index.js not found${NC}"
        return 1
    fi
    
    if grep -q 'G8n+`snap=' "$index_js"; then
        echo -e "${GREEN}✓ Patch is applied${NC}"
        return 0
    else
        echo -e "${YELLOW}✗ Patch is not applied${NC}"
        return 1
    fi
}

# Main function
main() {
    local action="${1:-apply}"
    
    echo -e "${YELLOW}Cursor Agent Bash Initialization Fix${NC}"
    echo -e "${YELLOW}=====================================${NC}"
    
    # Find cursor-agent installation
    local cursor_agent_dir
    if ! cursor_agent_dir=$(find_cursor_agent); then
        echo -e "${RED}Error: Could not find cursor-agent installation${NC}"
        echo -e "${YELLOW}Searched in:${NC}"
        echo "  - $HOME/.local/share/cursor-agent"
        echo "  - /opt/cursor-agent"
        echo "  - /usr/local/share/cursor-agent"
        echo "  - /usr/share/cursor-agent"
        exit 1
    fi
    
    echo -e "${GREEN}Found cursor-agent at: $cursor_agent_dir${NC}"
    
    case "$action" in
        "apply")
            apply_patch "$cursor_agent_dir"
            ;;
        "restore")
            restore_backup "$cursor_agent_dir"
            ;;
        "status")
            check_status "$cursor_agent_dir"
            ;;
        *)
            echo -e "${RED}Usage: $0 [apply|restore|status]${NC}"
            echo ""
            echo "Commands:"
            echo "  apply   - Apply the bash initialization fix (default)"
            echo "  restore - Restore from backup"
            echo "  status  - Check if patch is applied"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"