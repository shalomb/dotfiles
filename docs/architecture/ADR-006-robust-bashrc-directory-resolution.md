# ADR-006: Robust bashrc Directory Resolution

## Status
Proposed

## Context

The current `BASHRC_DIR` logic is fragile and causes constant problems:

### **Current Issues:**
1. **Symlink Dependency**: Assumes `~/.bashrc` is always a symlink
2. **Path Resolution Fragility**: Breaks when files are copied instead of symlinked
3. **Multiple Sourcing Scenarios**: Repository vs home directory, interactive vs non-interactive
4. **No Fallback Logic**: Fails completely when assumptions are wrong
5. **Inconsistent Behavior**: Works in some scenarios but not others

### **Sourcing Scenarios:**
1. **Repository Development**: `~/.bashrc` → symlink → `~/.config/bash/bashrc` → hardlink → repo
2. **Home Directory**: `~/.bashrc` → regular file → `~/.config/bash/`
3. **Non-interactive**: `bash -c "source ~/.bashrc"` (needs to work)
4. **Interactive**: Normal shell startup (needs to work)

## Decision

**Implement robust directory resolution with multiple fallback strategies.**

### **Core Principle:**
The bashrc should work regardless of how it's deployed (symlink, copy, hardlink) and regardless of the current working directory.

### **Resolution Strategy:**
1. **Primary**: Use the actual location of the bashrc file
2. **Fallback 1**: Check if we're in a dotfiles repository
3. **Fallback 2**: Use standard XDG paths
4. **Fallback 3**: Use hardcoded fallback with warning

### **Implementation:**
```bash
# Robust directory resolution with multiple fallbacks
resolve_bashrc_dir() {
    local bashrc_path
    local bashrc_dir
    local dotfiles_root
    
    # Primary: Use actual location of bashrc file
    if [[ -L ~/.bashrc ]]; then
        # Symlink: follow to actual location
        bashrc_path=$(readlink -f ~/.bashrc)
    else
        # Regular file: use its location
        bashrc_path=~/.bashrc
    fi
    
    bashrc_dir=$(dirname "$bashrc_path")
    
    # Fallback 1: Check if we're in a dotfiles repository
    if [[ -d "$bashrc_dir/.git" ]] && [[ -f "$bashrc_dir/.git/config" ]]; then
        # We're in the repository, use standard structure
        echo "$bashrc_dir"
        return 0
    fi
    
    # Fallback 2: Check if we're in a dotfiles subdirectory
    dotfiles_root=$(find "$bashrc_dir" -maxdepth 3 -name ".git" -type d 2>/dev/null | head -1)
    if [[ -n "$dotfiles_root" ]]; then
        dotfiles_root=$(dirname "$dotfiles_root")
        if [[ -d "$dotfiles_root/.config/bash" ]]; then
            echo "$dotfiles_root/.config/bash"
            return 0
        fi
    fi
    
    # Fallback 3: Use XDG standard
    if [[ -d "$HOME/.config/bash" ]]; then
        echo "$HOME/.config/bash"
        return 0
    fi
    
    # Fallback 4: Use bashrc directory (last resort)
    echo "$bashrc_dir"
}

# Set directories
BASHRC_DIR=$(resolve_bashrc_dir)
export DOTFILES_DIR="${BASHRC_DIR%/.config/bash}"
```

### **Validation:**
```bash
# Test all scenarios
test_directory_resolution() {
    echo "Testing directory resolution..."
    
    # Test 1: Symlink scenario
    ln -sf ~/.config/bash/bashrc ~/.bashrc.test
    BASHRC_DIR=$(resolve_bashrc_dir)
    echo "Symlink: $BASHRC_DIR"
    
    # Test 2: Regular file scenario
    cp ~/.config/bash/bashrc ~/.bashrc.test
    BASHRC_DIR=$(resolve_bashrc_dir)
    echo "Regular file: $BASHRC_DIR"
    
    # Test 3: Repository scenario
    cd ~/.config/dotfiles
    BASHRC_DIR=$(resolve_bashrc_dir)
    echo "Repository: $BASHRC_DIR"
    
    # Cleanup
    rm -f ~/.bashrc.test
}
```

## Rationale

### **Why This Approach:**
1. **Robust**: Works in all deployment scenarios
2. **Fallback-Rich**: Multiple strategies prevent complete failure
3. **Self-Documenting**: Clear logic flow and error handling
4. **Testable**: Easy to validate all scenarios
5. **Maintainable**: Single function with clear responsibilities

### **Benefits:**
- **No More Path Issues**: Works regardless of symlink/copy status
- **Consistent Behavior**: Same logic in all environments
- **Easy Debugging**: Clear fallback progression
- **Future-Proof**: Adapts to new deployment strategies

### **Trade-offs:**
- **Slightly More Complex**: More logic than simple symlink following
- **Multiple Checks**: Slightly slower than single path resolution
- **More Code**: Requires additional function and validation

## Implementation Plan

### **Phase 1: Core Function**
1. Implement `resolve_bashrc_dir()` function
2. Add comprehensive tests
3. Update bashrc to use new function

### **Phase 2: Validation**
1. Test all deployment scenarios
2. Validate fallback behavior
3. Ensure performance is acceptable

### **Phase 3: Documentation**
1. Update AGENTS.md with new behavior
2. Document all supported scenarios
3. Add troubleshooting guide

## Testing

### **Test Scenarios:**
```bash
# Test 1: Symlink deployment
ln -sf ~/.config/bash/bashrc ~/.bashrc
source ~/.bashrc
echo "BASHRC_DIR: $BASHRC_DIR"

# Test 2: Copy deployment
cp ~/.config/bash/bashrc ~/.bashrc
source ~/.bashrc
echo "BASHRC_DIR: $BASHRC_DIR"

# Test 3: Repository development
cd ~/.config/dotfiles
source .config/bash/bashrc
echo "BASHRC_DIR: $BASHRC_DIR"

# Test 4: Non-interactive
bash -c "source ~/.bashrc && echo 'BASHRC_DIR: $BASHRC_DIR'"
```

### **Success Criteria:**
- All test scenarios pass
- `BASHRC_DIR` points to correct directory
- `DOTFILES_DIR` is set correctly
- Functions load from correct location
- No errors in any scenario

## Consequences

### **Positive:**
- **Eliminates Path Issues**: No more BASHRC_DIR problems
- **Robust Deployment**: Works with any deployment method
- **Better Testing**: Clear validation of all scenarios
- **Easier Debugging**: Clear fallback progression

### **Neutral:**
- **Additional Complexity**: More logic than current approach
- **More Testing**: Need to validate all scenarios

### **Negative:**
- **Slightly Slower**: Multiple checks vs single path resolution
- **More Code**: Additional function and validation logic

## Related ADRs
- **ADR-005**: Mandatory Testing Before Export
- **ADR-003**: Bash Testing Workflow
- **ADR-001**: rc.d/ Directory for Core Functions

## Validation
```bash
# Run comprehensive tests
make test-bashrc-directory-resolution

# Test all scenarios
./tests/bashrc-directory-resolution/test-all-scenarios.sh

# Validate in production
source ~/.bashrc && echo "BASHRC_DIR: $BASHRC_DIR"
```