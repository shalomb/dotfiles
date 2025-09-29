#!/bin/bash
# Cursor-Agent Container Logger
# Comprehensive logging and observability for cursor-agent operations

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/cursor-agent-$(date +%Y%m%d-%H%M%S).log"
SESSION_ID="$(date +%s)-$(od -An -N4 -tu4 /dev/urandom | tr -d ' ')"

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Log levels
LOG_LEVEL_DEBUG=0
LOG_LEVEL_INFO=1
LOG_LEVEL_WARN=2
LOG_LEVEL_ERROR=3
LOG_LEVEL_FATAL=4

# Default log level (can be overridden with LOG_LEVEL env var)
LOG_LEVEL="${LOG_LEVEL:-$LOG_LEVEL_INFO}"

# Function to get current timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S.%3N'
}

# Function to get log level name
get_log_level_name() {
    case $1 in
        $LOG_LEVEL_DEBUG) echo "DEBUG" ;;
        $LOG_LEVEL_INFO) echo "INFO" ;;
        $LOG_LEVEL_WARN) echo "WARN" ;;
        $LOG_LEVEL_ERROR) echo "ERROR" ;;
        $LOG_LEVEL_FATAL) echo "FATAL" ;;
        *) echo "UNKNOWN" ;;
    esac
}

# Function to get log level color
get_log_level_color() {
    case $1 in
        $LOG_LEVEL_DEBUG) echo "$CYAN" ;;
        $LOG_LEVEL_INFO) echo "$GREEN" ;;
        $LOG_LEVEL_WARN) echo "$YELLOW" ;;
        $LOG_LEVEL_ERROR) echo "$RED" ;;
        $LOG_LEVEL_FATAL) echo "$RED" ;;
        *) echo "$NC" ;;
    esac
}

# Function to write log entry
write_log() {
    local level="$1"
    local component="$2"
    local message="$3"
    local extra_data="${4:-}"
    
    # Check if we should log this level
    if [[ $level -lt $LOG_LEVEL ]]; then
        return 0
    fi
    
    local timestamp
    timestamp=$(get_timestamp)
    local level_name
    level_name=$(get_log_level_name "$level")
    local color
    color=$(get_log_level_color "$level")
    
    # Create log entry
    local log_entry
    log_entry="[$timestamp] [$SESSION_ID] [$level_name] [$component] $message"
    
    # Add extra data if provided
    if [[ -n "$extra_data" ]]; then
        log_entry="$log_entry | $extra_data"
    fi
    
    # Write to log file
    echo "$log_entry" >> "$LOG_FILE"
    
    # Write to console with color
    echo -e "${color}$log_entry${NC}"
}

# Function to log debug information
log_debug() {
    write_log $LOG_LEVEL_DEBUG "$1" "$2" "${3:-}"
}

# Function to log info
log_info() {
    write_log $LOG_LEVEL_INFO "$1" "$2" "${3:-}"
}

# Function to log warning
log_warn() {
    write_log $LOG_LEVEL_WARN "$1" "$2" "${3:-}"
}

# Function to log error
log_error() {
    write_log $LOG_LEVEL_ERROR "$1" "$2" "${3:-}"
}

# Function to log fatal error
log_fatal() {
    write_log $LOG_LEVEL_FATAL "$1" "$2" "${3:-}"
}

# Function to log container execution
log_container_execution() {
    local command="$1"
    local working_dir="$2"
    local container_args="$3"
    local start_time
    start_time=$(date +%s.%3N)
    
    log_info "CONTAINER" "Starting container execution" "command='$command' working_dir='$working_dir' args='$container_args' start_time=$start_time"
    
    # Capture container output
    local container_output
    local exit_code=0
    
    if container_output=$(podman run --rm $container_args cursor-agent-container $command 2>&1); then
        exit_code=0
    else
        exit_code=$?
    fi
    
    local end_time
    end_time=$(date +%s.%3N)
    local duration
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    log_info "CONTAINER" "Container execution completed" "exit_code=$exit_code duration=${duration}s"
    
    # Log container output (truncated for readability)
    local output_preview
    output_preview=$(echo "$container_output" | head -10 | tr '\n' '; ' | sed 's/; *$//')
    log_debug "CONTAINER" "Container output preview" "output='$output_preview'"
    
    # Log full output to separate file if it's substantial
    if [[ ${#container_output} -gt 1000 ]]; then
        local output_file="${LOG_DIR}/container-output-$(date +%Y%m%d-%H%M%S).log"
        echo "$container_output" > "$output_file"
        log_info "CONTAINER" "Full container output saved" "file='$output_file' size=${#container_output} bytes"
    fi
    
    return $exit_code
}

# Function to log file operations
log_file_operation() {
    local operation="$1"
    local file_path="$2"
    local result="$3"
    local extra_info="${4:-}"
    
    log_info "FILE" "$operation file operation" "path='$file_path' result='$result' $extra_info"
}

# Function to log security events
log_security_event() {
    local event_type="$1"
    local details="$2"
    local severity="${3:-WARN}"
    
    case $severity in
        "INFO") log_info "SECURITY" "$event_type" "$details" ;;
        "WARN") log_warn "SECURITY" "$event_type" "$details" ;;
        "ERROR") log_error "SECURITY" "$event_type" "$details" ;;
        "FATAL") log_fatal "SECURITY" "$event_type" "$details" ;;
        *) log_warn "SECURITY" "$event_type" "$details" ;;
    esac
}

# Function to log system information
log_system_info() {
    log_info "SYSTEM" "Session started" "session_id=$SESSION_ID log_file=$LOG_FILE"
    log_info "SYSTEM" "Host information" "hostname=$(hostname) user=$(whoami) shell=$SHELL"
    log_info "SYSTEM" "Container runtime" "podman_version=$(podman --version 2>/dev/null || echo 'not available')"
    log_info "SYSTEM" "Working directory" "pwd=$(pwd)"
    log_info "SYSTEM" "Environment" "LOG_LEVEL=$LOG_LEVEL SESSION_ID=$SESSION_ID"
}

# Function to log performance metrics
log_performance() {
    local metric_name="$1"
    local value="$2"
    local unit="${3:-}"
    local context="${4:-}"
    
    log_info "PERFORMANCE" "$metric_name" "value=$value unit=$unit context='$context'"
}

# Function to initialize logging
init_logging() {
    # Create log directory
    mkdir -p "$LOG_DIR"
    
    # Log system information
    log_system_info
    
    # Log configuration
    log_info "CONFIG" "Logging initialized" "log_file=$LOG_FILE log_level=$LOG_LEVEL"
}

# Function to create summary report
create_summary_report() {
    local summary_file="${LOG_DIR}/summary-$(date +%Y%m%d-%H%M%S).log"
    
    log_info "REPORT" "Creating summary report" "file=$summary_file"
    
    {
        echo "=== Cursor-Agent Container Execution Summary ==="
        echo "Session ID: $SESSION_ID"
        echo "Start Time: $(head -1 "$LOG_FILE" | cut -d']' -f1 | tr -d '[')"
        echo "End Time: $(get_timestamp)"
        echo "Log File: $LOG_FILE"
        echo ""
        echo "=== Statistics ==="
        echo "Total Log Entries: $(wc -l < "$LOG_FILE")"
        echo "Info Messages: $(grep -c "\[INFO\]" "$LOG_FILE" || echo 0)"
        echo "Warning Messages: $(grep -c "\[WARN\]" "$LOG_FILE" || echo 0)"
        echo "Error Messages: $(grep -c "\[ERROR\]" "$LOG_FILE" || echo 0)"
        echo "Container Executions: $(grep -c "Starting container execution" "$LOG_FILE" || echo 0)"
        echo "Security Events: $(grep -c "\[SECURITY\]" "$LOG_FILE" || echo 0)"
        echo ""
        echo "=== Recent Activity ==="
        tail -20 "$LOG_FILE"
    } > "$summary_file"
    
    log_info "REPORT" "Summary report created" "file=$summary_file"
}

# Function to cleanup old logs
cleanup_old_logs() {
    local max_age_days="${LOG_CLEANUP_DAYS:-7}"
    
    log_info "CLEANUP" "Cleaning up old log files" "max_age_days=$max_age_days"
    
    find "$LOG_DIR" -name "*.log" -type f -mtime +$max_age_days -delete 2>/dev/null || true
    
    log_info "CLEANUP" "Log cleanup completed" "log_dir=$LOG_DIR"
}

# Export functions for use by other scripts
export -f log_debug log_info log_warn log_error log_fatal
export -f log_container_execution log_file_operation log_security_event
export -f log_performance log_system_info
export -f init_logging create_summary_report cleanup_old_logs

# Initialize logging if this script is sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is being executed directly
    case "${1:-}" in
        "init")
            init_logging
            ;;
        "summary")
            create_summary_report
            ;;
        "cleanup")
            cleanup_old_logs
            ;;
        *)
            echo "Usage: $0 {init|summary|cleanup}"
            echo ""
            echo "Commands:"
            echo "  init     - Initialize logging system"
            echo "  summary  - Create summary report"
            echo "  cleanup  - Clean up old log files"
            exit 1
            ;;
    esac
else
    # Script is being sourced
    init_logging
fi