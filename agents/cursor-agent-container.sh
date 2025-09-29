#!/bin/bash
# Cursor-Agent Container Orchestration Script
# Instance-per-directory approach for safe cursor-agent execution

set -euo pipefail

# Configuration
CONTAINER_IMAGE="cursor-agent-container"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the logger
source "$SCRIPT_DIR/cursor-agent-logger.sh"

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
    log_info "VALIDATION" "Checking container image availability" "image=$CONTAINER_IMAGE"
    
    if ! podman image exists "$CONTAINER_IMAGE" 2>/dev/null; then
        log_error "VALIDATION" "Container image not found" "image=$CONTAINER_IMAGE"
        print_status "$RED" "Error: Container image '$CONTAINER_IMAGE' not found"
        print_status "$YELLOW" "Please build the container first:"
        echo "  cd $SCRIPT_DIR"
        echo "  podman build -t $CONTAINER_IMAGE ."
        exit 1
    fi
    
    log_info "VALIDATION" "Container image found" "image=$CONTAINER_IMAGE"
}

# Function to run cursor-agent in container
run_cursor_agent() {
    local working_dir="${1:-$(pwd)}"
    local prompt="${2:-}"
    
    log_info "EXECUTION" "Starting cursor-agent execution" "working_dir=$working_dir prompt_length=${#prompt}"
    log_security_event "CONTAINER_START" "Starting container with restricted access" "working_dir=$working_dir"
    
    print_status "$BLUE" "Running cursor-agent in container..."
    print_status "$BLUE" "Working directory: $working_dir"
    
    # Log mount configuration
    local mount_config="working_dir=$working_dir home_bin=$HOME/.local/bin home_config=$HOME/.config parent_dir=$(dirname "$working_dir")"
    log_info "CONFIG" "Container mount configuration" "$mount_config"
    
    # Prepare container arguments
    local container_args="-v $working_dir:$working_dir -v $HOME/.local/bin:/usr/local/bin:ro -v $HOME/.config:/config:ro -v $(dirname "$working_dir"):$(dirname "$working_dir"):ro -w $working_dir"
    
    # Log the command that will be executed
    log_info "COMMAND" "Container command prepared" "args='$container_args' command='cursor-agent --print --force \"$prompt\"'"
    
    # Execute with logging
    local start_time
    start_time=$(date +%s.%3N)
    
    if log_container_execution "cursor-agent --print --force \"$prompt\"" "$working_dir" "$container_args"; then
        local end_time
        end_time=$(date +%s.%3N)
        local duration
        duration=$(echo "$end_time - $start_time" | bc -l)
        
        log_info "EXECUTION" "Cursor-agent execution completed successfully" "duration=${duration}s"
        log_security_event "CONTAINER_SUCCESS" "Container execution completed without security issues" "duration=${duration}s"
    else
        local exit_code=$?
        local end_time
        end_time=$(date +%s.%3N)
        local duration
        duration=$(echo "$end_time - $start_time" | bc -l)
        
        log_error "EXECUTION" "Cursor-agent execution failed" "exit_code=$exit_code duration=${duration}s"
        log_security_event "CONTAINER_ERROR" "Container execution failed" "exit_code=$exit_code duration=${duration}s" "ERROR"
        return $exit_code
    fi
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
    
    log_info "SESSION" "Starting cursor-agent container session" "args='$*'"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--dir)
                working_dir="$2"
                log_info "PARSING" "Working directory specified" "dir=$working_dir"
                shift 2
                ;;
            -h|--help)
                log_info "PARSING" "Help requested"
                show_usage
                exit 0
                ;;
            -v|--version)
                log_info "PARSING" "Version requested"
                show_version
                exit 0
                ;;
            -*)
                log_error "PARSING" "Unknown option provided" "option=$1"
                print_status "$RED" "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                prompt="$*"
                log_info "PARSING" "Prompt captured" "prompt_length=${#prompt}"
                break
                ;;
        esac
    done
    
    # Set default working directory
    if [[ -z "$working_dir" ]]; then
        working_dir="$(pwd)"
        log_info "CONFIG" "Using current directory as working directory" "dir=$working_dir"
    fi
    
    # Validate working directory
    if [[ ! -d "$working_dir" ]]; then
        log_error "VALIDATION" "Working directory does not exist" "dir=$working_dir"
        print_status "$RED" "Error: Working directory '$working_dir' does not exist"
        exit 1
    fi
    
    # Check if prompt is provided
    if [[ -z "$prompt" ]]; then
        log_error "VALIDATION" "No prompt provided"
        print_status "$RED" "Error: No prompt provided"
        show_usage
        exit 1
    fi
    
    # Log final configuration
    log_info "CONFIG" "Final configuration" "working_dir=$working_dir prompt_length=${#prompt} container_image=$CONTAINER_IMAGE"
    
    # Check container image
    check_container_image
    
    # Run cursor-agent
    run_cursor_agent "$working_dir" "$prompt"
    
    # Create summary report
    log_info "SESSION" "Session completed, creating summary report"
    create_summary_report
}

# Run main function with all arguments
main "$@"