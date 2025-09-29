#!/bin/bash
# Cursor-Agent Container Orchestration Script
# Instance-per-directory approach for safe cursor-agent execution

set -euo pipefail

# Configuration
CONTAINER_IMAGE="cursor-agent-container"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Function to check if container image exists
check_container_image() {
    if ! podman image exists "$CONTAINER_IMAGE" 2>/dev/null; then
        print_status "$RED" "Error: Container image '$CONTAINER_IMAGE' not found"
        print_status "$YELLOW" "Please build the container first:"
        echo "  cd $SCRIPT_DIR"
        echo "  podman build -t $CONTAINER_IMAGE ."
        exit 1
    fi
}

# Function to run cursor-agent in container
run_cursor_agent() {
    local working_dir="${1:-$(pwd)}"
    local prompt="${2:-}"
    
    print_status "$BLUE" "Running cursor-agent in container..."
    print_status "$BLUE" "Working directory: $working_dir"
    
    # Mount current directory and home directory for tools
    # Read-only mounts for parent directories and home config
    podman run --rm -it \
        -v "$working_dir:$working_dir" \
        -v "$HOME/.local/bin:/usr/local/bin:ro" \
        -v "$HOME/.config:/config:ro" \
        -v "$(dirname "$working_dir"):$(dirname "$working_dir"):ro" \
        -w "$working_dir" \
        "$CONTAINER_IMAGE" \
        cursor-agent --print --force "$prompt"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [PROMPT]"
    echo ""
    echo "Run cursor-agent in a secure container environment"
    echo ""
    echo "Options:"
    echo "  -d, --dir DIRECTORY    Working directory (default: current directory)"
    echo "  -h, --help            Show this help message"
    echo "  -v, --version         Show version"
    echo ""
    echo "Examples:"
    echo "  $0 \"analyze this codebase\""
    echo "  $0 -d /path/to/project \"run tests\""
    echo "  $0 -d ~/myproject \"check for security issues\""
    echo ""
    echo "Security Features:"
    echo "  - Read-only access to parent directories"
    echo "  - Read-only access to home directory configs"
    echo "  - Write access only to working directory"
    echo "  - Isolated container environment"
}

# Function to show version
show_version() {
    echo "Cursor-Agent Container Orchestrator v1.0.0"
    echo "Container image: $CONTAINER_IMAGE"
    if podman image exists "$CONTAINER_IMAGE" 2>/dev/null; then
        echo "Status: Available"
    else
        echo "Status: Not built"
    fi
}

# Main function
main() {
    local working_dir=""
    local prompt=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dir)
                working_dir="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--version)
                show_version
                exit 0
                ;;
            -*)
                print_status "$RED" "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                prompt="$*"
                break
                ;;
        esac
    done
    
    # Set default working directory
    if [[ -z "$working_dir" ]]; then
        working_dir="$(pwd)"
    fi
    
    # Validate working directory
    if [[ ! -d "$working_dir" ]]; then
        print_status "$RED" "Error: Working directory '$working_dir' does not exist"
        exit 1
    fi
    
    # Check if prompt is provided
    if [[ -z "$prompt" ]]; then
        print_status "$RED" "Error: No prompt provided"
        show_usage
        exit 1
    fi
    
    # Check container image
    check_container_image
    
    # Run cursor-agent
    run_cursor_agent "$working_dir" "$prompt"
}

# Run main function with all arguments
main "$@"