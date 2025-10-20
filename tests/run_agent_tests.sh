#!/bin/bash
# Test runner for agent management system
# Runs tests with proper environment setup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/.." && pwd)"
PYTHON_PATH="$PROJECT_ROOT/src:${PYTHONPATH:-}"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Python
    if ! command -v python3 >/dev/null 2>&1; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check pytest
    if ! python3 -c "import pytest" >/dev/null 2>&1; then
        log_warning "pytest not found, installing..."
        pip install pytest
    fi
    
    log_success "Prerequisites check passed"
}

# Setup test environment
setup_test_env() {
    log_info "Setting up test environment..."
    
    # Create temporary test directory
    export TEST_TEMP_DIR=$(mktemp -d)
    export XDG_RUNTIME_DIR="$TEST_TEMP_DIR/runtime"
    export XDG_STATE_HOME="$TEST_TEMP_DIR/state"
    export XDG_CONFIG_HOME="$TEST_TEMP_DIR/config"
    export PYTHONPATH="$PYTHON_PATH"
    
    # Create XDG directories
    mkdir -p "$XDG_RUNTIME_DIR/agents"
    mkdir -p "$XDG_STATE_HOME/agents/logs"
    mkdir -p "$XDG_CONFIG_HOME/agents"
    
    log_success "Test environment setup complete"
}

# Cleanup test environment
cleanup_test_env() {
    if [[ -n "${TEST_TEMP_DIR:-}" && -d "$TEST_TEMP_DIR" ]]; then
        log_info "Cleaning up test environment..."
        rm -rf "$TEST_TEMP_DIR"
        log_success "Cleanup complete"
    fi
}

# Run tests
run_tests() {
    log_info "Running agent management tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run pytest with verbose output
    if python3 -m pytest tests/test_agent_management.py -v --tb=short; then
        log_success "All tests passed!"
        return 0
    else
        log_error "Some tests failed"
        return 1
    fi
}

# Main execution
main() {
    log_info "Starting agent management test suite..."
    
    # Set up cleanup trap
    trap cleanup_test_env EXIT
    
    # Run test phases
    check_prerequisites
    setup_test_env
    run_tests
    
    log_success "Test suite completed successfully!"
}

# Run main function
main "$@"