# tests/ - Bash Configuration Tests

## Purpose
This directory contains **test scripts** that validate bash configuration functionality, performance, and correctness.

## Test Types

### Behavioral Tests
- **`simple-shell-test.sh`**: Basic shell functionality tests
- **`test-shell-login.sh`**: Login shell behavior validation
- **`test-editor-set.sh`**: Editor configuration tests

### Test Results
- **`results/test.log`**: Test execution logs and results

## Running Tests

### Individual Tests
```bash
# Run specific test
./tests/simple-shell-test.sh

# Run with verbose output
DOTFILES_DEBUG=1 ./tests/test-shell-login.sh
```

### All Tests
```bash
# From dotfiles root
make test-bash

# Or run tests directly
cd .config/bash/tests
for test in *.sh; do
    echo "Running $test..."
    bash "$test"
done
```

## Test Structure

### Test Script Requirements
- **Shebang**: `#!/bin/bash`
- **Error handling**: `set -e` for strict error checking
- **Cleanup**: Clean up any test artifacts
- **Documentation**: Clear test descriptions

### Mock Functions
Tests may include mock functions for external dependencies:
```bash
# Mock external commands
bootstrap_ssh_agent() { echo "Mock SSH agent bootstrap"; }
export -f bootstrap_ssh_agent
```

### Test Data
- **Temporary files**: Use `/tmp` for test artifacts
- **Environment isolation**: Don't modify global environment
- **Cleanup**: Remove test files after completion

## Test Categories

### Functionality Tests
- **Core functions**: Test utility functions from rc.d/
- **Tool integration**: Verify enabled/ scripts work correctly
- **Environment setup**: Check PATH, variables, aliases

### Performance Tests
- **Startup time**: Measure bash initialization speed
- **Function execution**: Test function performance
- **Memory usage**: Check for memory leaks

### Integration Tests
- **End-to-end**: Test complete bash startup flow
- **Tool interaction**: Verify tools work with bash config
- **Error handling**: Test error scenarios

## Agent Development Guidelines

### Writing Tests
1. **Test one thing**: Each test should focus on one aspect
2. **Use descriptive names**: Make test purpose clear
3. **Include setup/teardown**: Prepare and clean up test environment
4. **Test edge cases**: Include error conditions and boundary cases
5. **Document assumptions**: Note any test dependencies or requirements

### Running Tests During Development
1. **Before changes**: Run tests to establish baseline
2. **During development**: Run relevant tests frequently
3. **After changes**: Run full test suite to verify no regressions
4. **Before committing**: Ensure all tests pass

### Test Maintenance
1. **Keep tests current**: Update tests when functionality changes
2. **Remove obsolete tests**: Delete tests for removed features
3. **Add new tests**: Create tests for new functionality
4. **Review test results**: Investigate and fix failing tests

## Agent Context
**AGENT_CONTEXT**: Test scripts for validating bash configuration
**ARCHITECTURE**: Test-driven development pattern
**DESIGN_PATTERN**: Isolated, repeatable, automated validation