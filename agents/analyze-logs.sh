#!/bin/bash
# Cursor-Agent Log Analysis Script
# Analyze and summarize cursor-agent execution logs

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Function to analyze log file
analyze_log_file() {
    local log_file="$1"
    
    if [[ ! -f "$log_file" ]]; then
        print_status "$RED" "Error: Log file '$log_file' not found"
        return 1
    fi
    
    print_status "$BLUE" "=== Analyzing Log File: $(basename "$log_file") ==="
    
    # Basic statistics
    local total_lines
    total_lines=$(wc -l < "$log_file")
    local info_count
    info_count=$(grep -c "\[INFO\]" "$log_file" || echo 0)
    local warn_count
    warn_count=$(grep -c "\[WARN\]" "$log_file" || echo 0)
    local error_count
    error_count=$(grep -c "\[ERROR\]" "$log_file" || echo 0)
    local fatal_count
    fatal_count=$(grep -c "\[FATAL\]" "$log_file" || echo 0)
    
    echo "Total Log Entries: $total_lines"
    echo "Info Messages: $info_count"
    echo "Warning Messages: $warn_count"
    echo "Error Messages: $error_count"
    echo "Fatal Messages: $fatal_count"
    echo ""
    
    # Session information
    local session_id
    session_id=$(head -1 "$log_file" | grep -o '\[[a-f0-9-]*\]' | head -1 | tr -d '[]' || echo "unknown")
    local start_time
    start_time=$(head -1 "$log_file" | cut -d']' -f1 | tr -d '[' || echo "unknown")
    local end_time
    end_time=$(tail -1 "$log_file" | cut -d']' -f1 | tr -d '[' || echo "unknown")
    
    echo "Session ID: $session_id"
    echo "Start Time: $start_time"
    echo "End Time: $end_time"
    echo ""
    
    # Container executions
    local container_executions
    container_executions=$(grep -c "Starting container execution" "$log_file" || echo 0)
    echo "Container Executions: $container_executions"
    
    if [[ $container_executions -gt 0 ]]; then
        echo ""
        print_status "$CYAN" "Container Execution Details:"
        grep "Starting container execution" "$log_file" | while read -r line; do
            local timestamp
            timestamp=$(echo "$line" | cut -d']' -f1 | tr -d '[')
            local details
            details=$(echo "$line" | sed 's/.*\[COMMAND\] //' | sed 's/ | .*//')
            echo "  $timestamp: $details"
        done
    fi
    
    # Security events
    local security_events
    security_events=$(grep -c "\[SECURITY\]" "$log_file" || echo 0)
    echo ""
    echo "Security Events: $security_events"
    
    if [[ $security_events -gt 0 ]]; then
        echo ""
        print_status "$YELLOW" "Security Event Details:"
        grep "\[SECURITY\]" "$log_file" | while read -r line; do
            local timestamp
            timestamp=$(echo "$line" | cut -d']' -f1 | tr -d '[')
            local level
            level=$(echo "$line" | grep -o '\[WARN\]\|\[ERROR\]\|\[INFO\]\|\[FATAL\]')
            local details
            details=$(echo "$line" | sed 's/.*\[SECURITY\] //' | sed 's/ | .*//')
            echo "  $timestamp $level: $details"
        done
    fi
    
    # Performance metrics
    local performance_entries
    performance_entries=$(grep -c "\[PERFORMANCE\]" "$log_file" || echo 0)
    echo ""
    echo "Performance Entries: $performance_entries"
    
    if [[ $performance_entries -gt 0 ]]; then
        echo ""
        print_status "$GREEN" "Performance Metrics:"
        grep "\[PERFORMANCE\]" "$log_file" | while read -r line; do
            local timestamp
            timestamp=$(echo "$line" | cut -d']' -f1 | tr -d '[')
            local details
            details=$(echo "$line" | sed 's/.*\[PERFORMANCE\] //' | sed 's/ | .*//')
            echo "  $timestamp: $details"
        done
    fi
    
    # Recent activity
    echo ""
    print_status "$BLUE" "Recent Activity (last 10 entries):"
    tail -10 "$log_file" | while read -r line; do
        local timestamp
        timestamp=$(echo "$line" | cut -d']' -f1 | tr -d '[')
        local level
        level=$(echo "$line" | grep -o '\[DEBUG\]\|\[INFO\]\|\[WARN\]\|\[ERROR\]\|\[FATAL\]')
        local component
        component=$(echo "$line" | grep -o '\[[A-Z_]*\]' | head -2 | tail -1 | tr -d '[]')
        local message
        message=$(echo "$line" | sed 's/.*\[[A-Z_]*\] //' | sed 's/ | .*//')
        echo "  $timestamp $level [$component]: $message"
    done
    
    echo ""
}

# Function to analyze all logs
analyze_all_logs() {
    print_status "$BLUE" "=== Analyzing All Log Files ==="
    
    if [[ ! -d "$LOG_DIR" ]]; then
        print_status "$RED" "Error: Log directory '$LOG_DIR' not found"
        return 1
    fi
    
    local log_files
    mapfile -t log_files < <(find "$LOG_DIR" -name "*.log" -type f | sort)
    
    if [[ ${#log_files[@]} -eq 0 ]]; then
        print_status "$YELLOW" "No log files found in $LOG_DIR"
        return 0
    fi
    
    print_status "$GREEN" "Found ${#log_files[@]} log file(s)"
    echo ""
    
    for log_file in "${log_files[@]}"; do
        analyze_log_file "$log_file"
        echo ""
        echo "----------------------------------------"
        echo ""
    done
}

# Function to show log summary
show_log_summary() {
    print_status "$BLUE" "=== Log Summary ==="
    
    if [[ ! -d "$LOG_DIR" ]]; then
        print_status "$RED" "Error: Log directory '$LOG_DIR' not found"
        return 1
    fi
    
    local log_files
    mapfile -t log_files < <(find "$LOG_DIR" -name "*.log" -type f | sort)
    
    if [[ ${#log_files[@]} -eq 0 ]]; then
        print_status "$YELLOW" "No log files found"
        return 0
    fi
    
    echo "Log Directory: $LOG_DIR"
    echo "Total Log Files: ${#log_files[@]}"
    echo ""
    
    # Show recent logs
    print_status "$CYAN" "Recent Log Files:"
    for log_file in "${log_files[@]: -5}"; do
        local file_size
        file_size=$(du -h "$log_file" | cut -f1)
        local file_date
        file_date=$(stat -c %y "$log_file" | cut -d' ' -f1)
        echo "  $(basename "$log_file") ($file_size, $file_date)"
    done
    
    echo ""
    
    # Show summary statistics
    local total_entries=0
    local total_errors=0
    local total_warnings=0
    local total_security_events=0
    
    for log_file in "${log_files[@]}"; do
        total_entries=$((total_entries + $(wc -l < "$log_file")))
        total_errors=$((total_errors + $(grep -c "\[ERROR\]" "$log_file" || echo 0)))
        total_warnings=$((total_warnings + $(grep -c "\[WARN\]" "$log_file" || echo 0)))
        total_security_events=$((total_security_events + $(grep -c "\[SECURITY\]" "$log_file" || echo 0)))
    done
    
    echo "Total Log Entries: $total_entries"
    echo "Total Errors: $total_errors"
    echo "Total Warnings: $total_warnings"
    echo "Total Security Events: $total_security_events"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [LOG_FILE]"
    echo ""
    echo "Analyze cursor-agent execution logs"
    echo ""
    echo "Options:"
    echo "  -a, --all        Analyze all log files"
    echo "  -s, --summary    Show log summary"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Show summary"
    echo "  $0 -a                                 # Analyze all logs"
    echo "  $0 logs/cursor-agent-20241229-143022.log  # Analyze specific log"
    echo "  $0 -s                                # Show summary only"
}

# Main function
main() {
    case "${1:-}" in
        -a|--all)
            analyze_all_logs
            ;;
        -s|--summary)
            show_log_summary
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        "")
            show_log_summary
            ;;
        *)
            if [[ -f "$1" ]]; then
                analyze_log_file "$1"
            else
                print_status "$RED" "Error: '$1' is not a valid log file"
                show_usage
                exit 1
            fi
            ;;
    esac
}

# Run main function
main "$@"