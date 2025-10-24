# Bash Configuration Restructure Plan

## Cyclomatic Complexity Analysis

### High Complexity Files (Control Flow Statements)

| File | Control Flow Count | Complexity Level | Risk |
|------|-------------------|------------------|------|
| `enabled/cd.sh` | 64 | Very High | Very High |
| `enabled/git-bar.sh` | 47 | Very High | Very High |
| `lib/dotfiles` | 34 | High | High |
| `enabled/fzf-utils.sh` | 19 | Moderate | Medium |
| `enabled/cursor.sh` | 17 | Moderate | Medium |
| `lib/00-path` | 17 | Moderate | Medium |
| `enabled/aws.sh` | 21 | Moderate | Medium |
| `enabled/browse-md.sh` | 13 | Moderate | Medium |

### Total Control Flow Statements: 535 across 77 files

## Refactoring Priorities

### **Priority 1: Critical (Very High Risk)**
- **`enabled/cd.sh`** - 64 control flow statements
  - Massive `cd` function with deeply nested conditions
  - Complex path resolution logic
  - Multiple `if-elif-else` chains
  - **Action**: Break into smaller functions

- **`enabled/git-bar.sh`** - 47 control flow statements
  - Large git wrapper function
  - Complex argument parsing logic
  - Multiple nested conditions for different git commands
  - **Action**: Extract command handlers

### **Priority 2: High Risk**
- **`lib/dotfiles`** - 34 control flow statements
  - Large case statement with many branches
  - Multiple helper functions with their own complexity
  - **Action**: Use command pattern or lookup tables

### **Priority 3: Medium Risk**
- **`enabled/fzf-utils.sh`** - 19 control flow statements
- **`enabled/cursor.sh`** - 17 control flow statements
- **`lib/00-path`** - 17 control flow statements
- **`enabled/aws.sh`** - 21 control flow statements

## Refactoring Strategies

### **1. Extract Functions**
```bash
# Before: One massive function
cd() {
    # 400+ lines of complex logic
}

# After: Broken into smaller functions
_cd_handle_options() { ... }
_cd_resolve_path() { ... }
_cd_execute() { ... }
cd() {
    local options=$(_cd_handle_options "$@")
    local path=$(_cd_resolve_path "$@")
    _cd_execute "$path"
}
```

### **2. Use Lookup Tables**
```bash
# Before: Long case statement
case "$cmd" in
    enter) _dotfiles_enter "$@" ;;
    load) _dotfiles_load "$@" ;;
    # ... 8 more cases
esac

# After: Associative array
declare -A commands=(
    [enter]=_dotfiles_enter
    [load]=_dotfiles_load
    # ...
)
${commands[$cmd]} "$@"
```

### **3. Early Returns**
```bash
# Before: Nested conditions
if [[ -z "$path" ]]; then
    if [[ "$qualifier" == "help" ]]; then
        # help logic
    else
        # default logic
    fi
fi

# After: Early returns
if [[ -z "$path" ]]; then
    [[ "$qualifier" == "help" ]] && { show_help; return; }
    # default logic
    return
fi
```

### **4. Command Pattern**
```bash
# Instead of large switch statements, use command objects
declare -A command_handlers=(
    [enter]="_dotfiles_enter"
    [load]="_dotfiles_load"
    [list]="_dotfiles_list"
    [search]="_dotfiles_search"
    [prompt]="_dotfiles_prompt"
    [reload]="_dotfiles_reload"
    [help]="_dotfiles_help"
)
```

## Complexity Reduction Goals

### **Target Metrics**
- **cd.sh**: Reduce from 64 to <20 control flow statements
- **git-bar.sh**: Reduce from 47 to <25 control flow statements
- **dotfiles**: Reduce from 34 to <15 control flow statements
- **Overall**: Reduce total from 535 to <300 control flow statements

### **Success Criteria**
- All functions have cyclomatic complexity <20
- No single function exceeds 50 lines
- Clear separation of concerns
- Improved testability
- Better maintainability

## Implementation Plan

### **Phase 1: Critical Functions**
1. Refactor `cd.sh` - Extract path resolution logic
2. Refactor `git-bar.sh` - Extract command handlers
3. Test thoroughly after each refactor

### **Phase 2: High Priority**
1. Refactor `lib/dotfiles` - Use command pattern
2. Simplify helper functions
3. Add comprehensive tests

### **Phase 3: Medium Priority**
1. Refactor remaining high-complexity files
2. Standardize patterns across codebase
3. Document refactoring patterns

## Notes

- **Current State**: 535 control flow statements across 77 files
- **Target State**: <300 control flow statements
- **Risk Level**: High complexity increases bug risk and maintenance burden
- **Priority**: Focus on functions with >20 control flow statements first

## Tools for Analysis

- **Current Analysis**: `grep -c "if.*then\|elif\|case.*in\|while\|for.*in" .config/bash/**/*.sh`
- **Target Tool**: Consider adding `shellcheck` complexity analysis
- **Monitoring**: Track complexity metrics in CI/CD pipeline