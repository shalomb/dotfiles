#!/bin/bash
# Test script for cursor-agent logging system

set -euo pipefail

# Source the logger
source "$(dirname "$0")/cursor-agent-logger.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Test logging functions
test_logging_functions() {
    print_status "$BLUE" "Testing logging functions..."
    
    log_debug "TEST" "This is a debug message" "test_data=debug_value"
    log_info "TEST" "This is an info message" "test_data=info_value"
    log_warn "TEST" "This is a warning message" "test_data=warn_value"
    log_error "TEST" "This is an error message" "test_data=error_value"
    
    print_status "$GREEN" "✓ Logging functions test completed"
}

# Test security events
test_security_events() {
    print_status "$BLUE" "Testing security event logging..."
    
    log_security_event "TEST_START" "Starting security test" "INFO"
    log_security_event "TEST_WARNING" "This is a security warning" "WARN"
    log_security_event "TEST_ERROR" "This is a security error" "ERROR"
    log_security_event "TEST_SUCCESS" "Security test completed" "INFO"
    
    print_status "$GREEN" "✓ Security events test completed"
}

# Test performance logging
test_performance_logging() {
    print_status "$BLUE" "Testing performance logging..."
    
    log_performance "EXECUTION_TIME" "1.234" "seconds" "test_execution"
    log_performance "MEMORY_USAGE" "128" "MB" "container_runtime"
    log_performance "CPU_USAGE" "45.6" "percent" "container_runtime"
    
    print_status "$GREEN" "✓ Performance logging test completed"
}

# Test file operations
test_file_operations() {
    print_status "$BLUE" "Testing file operation logging..."
    
    log_file_operation "CREATE" "/tmp/test-file.txt" "SUCCESS" "size=1024 bytes"
    log_file_operation "READ" "/tmp/test-file.txt" "SUCCESS" "bytes_read=1024"
    log_file_operation "DELETE" "/tmp/test-file.txt" "SUCCESS" "cleanup_completed"
    
    print_status "$GREEN" "✓ File operations test completed"
}

# Test container execution logging (simulated)
test_container_execution() {
    print_status "$BLUE" "Testing container execution logging..."
    
    # Simulate container execution
    log_info "CONTAINER" "Simulating container execution" "command='echo hello' working_dir='/tmp'"
    
    local start_time
    start_time=$(date +%s.%3N)
    
    # Simulate some work
    sleep 0.1
    
    local end_time
    end_time=$(date +%s.%3N)
    local duration
    duration=$(echo "$end_time - $start_time" | bc -l)
    
    log_info "CONTAINER" "Simulated container execution completed" "duration=${duration}s"
    
    print_status "$GREEN" "✓ Container execution test completed"
}

# Main test function
main() {
    print_status "$YELLOW" "Cursor-Agent Logging System Test"
    print_status "$YELLOW" "================================="
    
    # Run all tests
    test_logging_functions
    echo ""
    test_security_events
    echo ""
    test_performance_logging
    echo ""
    test_file_operations
    echo ""
    test_container_execution
    echo ""
    
    # Create summary report
    print_status "$BLUE" "Creating summary report..."
    create_summary_report
    
    print_status "$GREEN" "✓ All logging tests completed successfully!"
    print_status "$BLUE" "Check the logs directory for generated log files:"
    echo "  Log file: $LOG_FILE"
    echo "  Log directory: $LOG_DIR"
    echo ""
    print_status "$YELLOW" "To analyze the logs, run:"
    echo "  ./analyze-logs.sh"
}

# Run tests
main "$@"