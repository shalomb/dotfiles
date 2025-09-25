#!/bin/bash
# Integration test script for dotfile management behavior

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR=$(mktemp -d)
FAKE_HOME="$TEST_DIR/home"
FAKE_REPO="$TEST_DIR/repo"

echo -e "${YELLOW}Setting up test environment in $TEST_DIR${NC}"

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up test environment${NC}"
    rm -rf "$TEST_DIR"
    
    # Clean up test files from repo
    REPO_ROOT="$(dirname "$0")/.."
    rm -f "$REPO_ROOT/test_file.txt"
    rm -rf "$REPO_ROOT/test_dir"
    rm -rf "$REPO_ROOT/deep"
}
trap cleanup EXIT

# Setup test environment
setup_test_env() {
    mkdir -p "$FAKE_HOME"
    
    # Create test files in actual repo (not fake repo)
    REPO_ROOT="$(dirname "$0")/.."
    echo "Hello from repo" > "$REPO_ROOT/test_file.txt"
    mkdir -p "$REPO_ROOT/test_dir"
    echo "Nested content" > "$REPO_ROOT/test_dir/nested_file.txt"
    
    # Create existing files in fake home
    echo "Existing content" > "$FAKE_HOME/existing_file.txt"
    mkdir -p "$FAKE_HOME/test_dir"
    echo "Unmanaged content" > "$FAKE_HOME/test_dir/unmanaged_file.txt"
}

# Test functions
test_single_file_export() {
    echo -e "${YELLOW}Testing single file export...${NC}"
    
    # Run from repo root with fake home
    cd "$(dirname "$0")/.."
    HOME="$FAKE_HOME" uv run python -m dotfile_manager export test_file.txt
    
    # Check that file exists in home directory
    if [[ -f "$FAKE_HOME/test_file.txt" ]]; then
        echo -e "${GREEN}✓ File exported successfully${NC}"
    else
        echo -e "${RED}✗ File export failed${NC}"
        return 1
    fi
    
    # Check content
    if [[ "$(cat "$FAKE_HOME/test_file.txt")" == "Hello from repo" ]]; then
        echo -e "${GREEN}✓ File content is correct${NC}"
    else
        echo -e "${RED}✗ File content is incorrect${NC}"
        return 1
    fi
}

test_directory_export_preserves_unmanaged() {
    echo -e "${YELLOW}Testing directory export preserves unmanaged files...${NC}"
    
    # Export directory (run from repo root with fake home)
    cd "$(dirname "$0")/.."
    HOME="$FAKE_HOME" uv run python -m dotfile_manager export test_dir
    
    # Check that managed file exists
    if [[ -f "$FAKE_HOME/test_dir/nested_file.txt" ]]; then
        echo -e "${GREEN}✓ Managed file exported${NC}"
    else
        echo -e "${RED}✗ Managed file not exported${NC}"
        return 1
    fi
    
    # Check that unmanaged file still exists (key test!)
    if [[ -f "$FAKE_HOME/test_dir/unmanaged_file.txt" ]]; then
        echo -e "${GREEN}✓ Unmanaged file preserved${NC}"
    else
        echo -e "${RED}✗ Unmanaged file was removed (BUG!)${NC}"
        return 1
    fi
    
    # Check unmanaged content
    if [[ "$(cat "$FAKE_HOME/test_dir/unmanaged_file.txt")" == "Unmanaged content" ]]; then
        echo -e "${GREEN}✓ Unmanaged file content preserved${NC}"
    else
        echo -e "${RED}✗ Unmanaged file content changed${NC}"
        return 1
    fi
}

test_force_mode() {
    echo -e "${YELLOW}Testing force mode...${NC}"
    
    # Create conflicting file
    echo "Conflicting content" > "$FAKE_HOME/test_file.txt"
    
    # Export with force (run from repo root with fake home)
    cd "$(dirname "$0")/.."
    HOME="$FAKE_HOME" uv run python -m dotfile_manager export --force test_file.txt
    
    # Check that content is from repo
    if [[ "$(cat "$FAKE_HOME/test_file.txt")" == "Hello from repo" ]]; then
        echo -e "${GREEN}✓ Force mode overwrote conflicting file${NC}"
    else
        echo -e "${RED}✗ Force mode failed to overwrite${NC}"
        return 1
    fi
}

test_makefile_integration() {
    echo -e "${YELLOW}Testing Makefile integration...${NC}"
    
    # Test make refresh TARGET=single_file (run from repo root with fake home)
    cd "$(dirname "$0")/.."
    HOME="$FAKE_HOME" make refresh TARGET=test_file.txt
    
    if [[ -f "$FAKE_HOME/test_file.txt" ]]; then
        echo -e "${GREEN}✓ Make refresh single file works${NC}"
    else
        echo -e "${RED}✗ Make refresh single file failed${NC}"
        return 1
    fi
    
    # Test make refresh TARGET=directory
    HOME="$FAKE_HOME" make refresh TARGET=test_dir
    
    if [[ -f "$FAKE_HOME/test_dir/nested_file.txt" ]]; then
        echo -e "${GREEN}✓ Make refresh directory works${NC}"
    else
        echo -e "${RED}✗ Make refresh directory failed${NC}"
        return 1
    fi
    
    # Check unmanaged files are still preserved
    if [[ -f "$FAKE_HOME/test_dir/unmanaged_file.txt" ]]; then
        echo -e "${GREEN}✓ Make refresh preserves unmanaged files${NC}"
    else
        echo -e "${RED}✗ Make refresh removed unmanaged files${NC}"
        return 1
    fi
}

test_parent_directory_creation() {
    echo -e "${YELLOW}Testing parent directory creation...${NC}"
    
    # Create nested file in actual repo
    REPO_ROOT="$(dirname "$0")/.."
    mkdir -p "$REPO_ROOT/deep/nested/path"
    echo "Deep nested content" > "$REPO_ROOT/deep/nested/path/file.txt"
    
    # Export nested file (run from repo root with fake home)
    cd "$(dirname "$0")/.."
    HOME="$FAKE_HOME" uv run python -m dotfile_manager export deep/nested/path/file.txt
    
    # Check that parent directories were created
    if [[ -d "$FAKE_HOME/deep/nested/path" ]]; then
        echo -e "${GREEN}✓ Parent directories created${NC}"
    else
        echo -e "${RED}✗ Parent directories not created${NC}"
        return 1
    fi
    
    # Check that file exists
    if [[ -f "$FAKE_HOME/deep/nested/path/file.txt" ]]; then
        echo -e "${GREEN}✓ Nested file exported${NC}"
    else
        echo -e "${RED}✗ Nested file not exported${NC}"
        return 1
    fi
}

# Run tests
main() {
    echo -e "${YELLOW}Starting dotfile management behavioral tests${NC}"
    
    setup_test_env
    
    # Run all tests
    test_single_file_export
    test_directory_export_preserves_unmanaged
    test_force_mode
    test_makefile_integration
    test_parent_directory_creation
    
    echo -e "${GREEN}All tests passed! ✓${NC}"
}

main "$@"