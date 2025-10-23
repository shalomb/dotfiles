# ADR-007: Bashrc Restructuring - Arrange-Act-Assert Pattern

## Status
Accepted

## Context

The original `bashrc` had several critical robustness issues that made it fragile and difficult to debug:

### **Problems with Original Structure:**
1. **Mixed Concerns**: Variable setup, function loading, and shell configuration were all mixed together
2. **No Validation**: Critical variables could be set incorrectly with no error detection
3. **Silent Failures**: Scripts could fail to load without any indication
4. **Poor Debugging**: No clear separation made it hard to identify where issues occurred
5. **Subshell Issues**: Variable assignments in command substitutions created scope problems
6. **No Error Handling**: Missing validation for critical variables like `BASHRC_DIR` and `DOTFILES_DIR`

### **Specific Issues Found:**
- `BASHRC_DIR` variable was empty despite being set correctly
- `agentctl` function missing `DOTFILES_DIR` logic in live environment
- Tests failing due to subshell variable scope issues
- No validation that critical variables were actually set
- Complex nested logic made debugging nearly impossible

### **Root Cause:**
The bashrc was written as a monolithic script without clear separation of concerns, making it impossible to debug when things went wrong.

## Decision

**Restructure bashrc using the Arrange-Act-Assert pattern for clear separation of concerns.**

### **New Structure:**

#### **1. ARRANGE: Set up environment and variables**
```bash
# Enable tracing if requested
# Set up XDG directories
# Determine shell mode (interactive vs non-interactive)
```

#### **2. ACT: Load core functionality**
```bash
# Load resolve function first
# Set BASHRC_DIR using robust resolution
# Set DOTFILES_DIR
# Load core functions from lib directory
# Load enabled tools (interactive only)
# Load aliases
```

#### **3. ASSERT: Verify critical variables are set**
```bash
# Validate BASHRC_DIR is set
# Validate DOTFILES_DIR is set
# Return error if critical variables missing
```

#### **4. CONFIGURE: Set up shell behavior**
```bash
# Shell options
# History configuration
# Load bash completion
# Set up GPG
# Clean PATH
```

#### **5. INTERACTIVE: Interactive-only features**
```bash
# Set up ghostship prompt
# Interactive functions
# Check window size
# Set debian chroot
# Enable color support
```

### **Key Improvements:**

1. **Clear Separation**: Each section has a single responsibility
2. **Validation**: Critical variables are validated before proceeding
3. **Error Handling**: Script returns error if critical variables are missing
4. **Debugging**: Easy to identify which section has issues
5. **Maintainability**: Changes can be made to specific sections without affecting others
6. **Testing**: Each section can be tested independently

## Rationale

### **Why Arrange-Act-Assert:**
- **Arrange**: Sets up all prerequisites before doing any work
- **Act**: Performs the core functionality in a controlled environment
- **Assert**: Validates that the work was done correctly
- **Configure**: Sets up the environment for use
- **Interactive**: Handles user-specific features

### **Benefits:**
- **Robustness**: Validation prevents silent failures
- **Debuggability**: Clear structure makes issues easy to identify
- **Maintainability**: Changes are localized to specific sections
- **Testability**: Each section can be tested independently
- **Reliability**: Critical variables are guaranteed to be set

### **Trade-offs:**
- **More Code**: Slightly longer than original (but much clearer)
- **Validation Overhead**: Small performance cost for validation
- **Learning Curve**: New structure requires understanding the pattern

## Implementation

### **File Structure:**
```bash
#!/bin/bash

# =============================================================================
# ARRANGE: Set up environment and variables
# =============================================================================
# [XDG setup, shell mode detection]

# =============================================================================
# ACT: Load core functionality
# =============================================================================
# [Load functions, set variables, load scripts]

# =============================================================================
# ASSERT: Verify critical variables are set
# =============================================================================
# [Validate BASHRC_DIR, DOTFILES_DIR]

# =============================================================================
# CONFIGURE: Set up shell behavior
# =============================================================================
# [Shell options, history, completion, GPG, PATH]

# =============================================================================
# INTERACTIVE: Interactive-only features
# =============================================================================
# [Prompt, functions, window size, colors]
```

### **Critical Variables Validated:**
- `BASHRC_DIR`: Must be set for script loading
- `DOTFILES_DIR`: Must be set for agentctl and other tools

### **Error Handling:**
```bash
if [[ -z "$BASHRC_DIR" ]]; then
    echo "Error: BASHRC_DIR not set" >&2
    return 1
fi
```

## Consequences

### **Positive:**
- **Eliminates Silent Failures**: Validation catches issues immediately
- **Improves Debugging**: Clear structure makes problems easy to identify
- **Enhances Reliability**: Critical variables are guaranteed to be set
- **Simplifies Maintenance**: Changes are localized to specific sections
- **Enables Testing**: Each section can be tested independently

### **Neutral:**
- **Slightly More Code**: But much clearer and more maintainable
- **Validation Overhead**: Minimal performance impact

### **Negative:**
- **Learning Curve**: New structure requires understanding the pattern
- **Migration Effort**: Existing scripts may need updates

## Testing

### **Validation Tests:**
```bash
# Test that critical variables are set
bash -c "source .config/bash/bashrc && echo 'BASHRC_DIR: '$BASHRC_DIR"
bash -c "source .config/bash/bashrc && echo 'DOTFILES_DIR: '$DOTFILES_DIR"

# Test that validation works
bash -c "BASHRC_DIR='' source .config/bash/bashrc"  # Should fail
```

### **Success Criteria:**
- All critical variables are set correctly
- Validation catches missing variables
- Script structure is clear and maintainable
- Tests pass consistently

## Related ADRs
- **ADR-006**: Robust bashrc directory resolution
- **ADR-005**: Mandatory testing before export
- **ADR-003**: Bash testing workflow

## Validation
```bash
# Test the restructured bashrc
source .config/bash/bashrc
echo "BASHRC_DIR: $BASHRC_DIR"
echo "DOTFILES_DIR: $DOTFILES_DIR"
echo "INTERACTIVE_MODE: $INTERACTIVE_MODE"

# Run comprehensive tests
make test-bash
```

## Notes

This restructuring was necessary because the original bashrc had become unmaintainable due to mixed concerns and lack of validation. The Arrange-Act-Assert pattern provides a clear, robust structure that prevents the silent failures that were occurring before.

The key insight was that bashrc is the central orchestrator for all bash logic and needs to be super robust. This structure ensures that critical variables are always set correctly and that failures are caught immediately rather than silently.