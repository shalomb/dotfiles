#!/bin/bash
# Cursor Agent Bash Initialization Patch (Python-based)
# 
# This script uses a robust Python implementation to apply patches to cursor-agent.
# The Python script uses precise pattern matching instead of dangerous sed operations.
#
# Usage: cursor-agent-patch.sh [apply|status|restore]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH_PY="$SCRIPT_DIR/patch.py"

# Function to print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    print_status "$RED" "Error: python3 is required but not installed"
    exit 1
fi

# Check if the Python patch script exists
if [[ ! -f "$PATCH_PY" ]]; then
    print_status "$RED" "Error: Python patch script not found at $PATCH_PY"
    exit 1
fi

# Make sure the Python script is executable
chmod +x "$PATCH_PY"

# Run the Python patch script with all arguments
exec python3 "$PATCH_PY" "$@"