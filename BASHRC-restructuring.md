# Bashrc Restructuring Proposal

## Executive Summary

The current bashrc implementation has made progress with the AAA pattern, but suffers from:
- **Redundancy**: Variables set/resolved multiple times
- **Complexity**: Duplicate logic for directory resolution
- **Command failures**: Scripts run commands without checking existence
- **Unclear orchestration**: bashrc both orchestrates AND does work
- **Sourcing chaos**: PATH and dependencies set up multiple times in unpredictable order

**Proposed Solution**: Transform bashrc into a pure orchestrator following a strict phase-based initialization pattern with defensive script loading.

---

## Critical Issues Analysis

### 1. Redundancy & Duplicate Logic

**XDG Variables** (bashrc:11-20)
```bash
# Set twice with identical logic
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"  # Line 11
[[ -z "$XDG_CONFIG_HOME" ]] && export XDG_CONFIG_HOME="$HOME/.config"  # Line 18
```
**Impact**: Wasted cycles, confusing to maintain

**BASHRC_DIR Resolution** (bashrc:36-87)
```bash
# Lines 36-52: Inline resolution logic
BASHRC_DIR="$(cd "$(dirname "$(readlink -f ~/.bashrc)")" && pwd)"

# Lines 63-87: Load resolve function, re-resolve, update BASHRC_DIR again
source resolve-bashrc-dir.sh
NEW_BASHRC_DIR=$(resolve_bashrc_dir)
if [[ "$NEW_BASHRC_DIR" != "$BASHRC_DIR" ]]; then
    BASHRC_DIR="$NEW_BASHRC_DIR"  # Overwrite previous value
fi
```
**Impact**: Same variable set 2-3 times, complex conditional logic, hard to debug

**DOTFILES_DIR Calculation** (bashrc:48-52, 77-82)
```bash
# Calculated once based on initial BASHRC_DIR
if [[ "$BASHRC_DIR" == "$HOME/.config/bash" ]]; then
    DOTFILES_DIR="$HOME/.config/dotfiles"
fi

# Then calculated AGAIN after BASHRC_DIR changes
if [[ "$BASHRC_DIR" == "$HOME/.config/bash" ]]; then
    DOTFILES_DIR="$HOME/.config/dotfiles"
fi
```
**Impact**: Duplicate conditional logic, maintenance burden

### 2. PATH Setup Chaos

**Multiple PATH Modifications**:
1. bashrc:23 - Early setup: `export PATH="$HOME/.local/bin:$PATH"`
2. profile:34 - Sources 00-path (comprehensive setup)
3. bashrc:90-96 - Sources all lib/* including 00-path AGAIN
4. lib/cargo.sh - Appends cargo paths
5. bashrc:167 - Finally cleans PATH

**Problems**:
- 00-path is sourced by BOTH profile AND bashrc
- PATH is reset to system defaults in 00-path:7, potentially losing previous additions
- cargo.sh adds paths that 00-path already adds
- Final clean_path may remove valid paths added elsewhere

**Evidence**:
```bash
# 00-path:7 - RESETS PATH to system defaults
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"

# 00-path:31-33 - Adds cargo paths
if [[ -d "$HOME/.cargo/bin" ]]; then
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# lib/cargo.sh:3-5 - DUPLICATES cargo path addition
if [[ -e $HOME/.cargo/bin ]]; then
  PATH="$PATH:$HOME/.cargo/bin"
fi
```

### 3. Command-Not-Found Errors

**Root Cause**: Scripts execute commands without existence checks

**delta.sh:14**
```bash
source <(delta --generate-completion bash)
# FAILS if delta not installed, no guard clause
```

**rustup.sh:10**
```bash
gen-rustup-completions  # Calls 'rustup' unconditionally
# FAILS if rustup not installed
```

**jira.sh:3**
```bash
@has-cmd jira || return 0
# FAILS because @has-cmd may not be loaded yet from 01-functions
```

**Why This Happens**:
1. enabled/*.sh scripts are sourced in arbitrary alphabetical order (bashrc:100-104)
2. No guarantee that 01-functions is loaded before scripts use @has-cmd
3. Scripts assume commands exist without checking
4. No dependency declaration mechanism

### 4. Sourcing Order Violations

**Current Order** (bashrc:90-104):
```bash
# Load ALL lib/* in arbitrary order
for script in "${BASHRC_DIR}"/lib/*; do
    source "$script"
done

# Load ALL enabled/*.sh in arbitrary order
for script in "${BASHRC_DIR}"/enabled/*.sh; do
    source "$script"
done
```

**Problems**:
- lib/00-path might source after lib/cargo.sh, wasting the cargo setup
- 01-functions might source after 02-colours, missing dependencies
- enabled/jira.sh might source before lib/01-functions, breaking @has-cmd
- No explicit ordering, relies on filesystem alphabetical sorting
- File naming with numbers (00-, 01-, 02-) is a hack, not a design

**Evidence from lib/**:
```
00-path          # Should be first (PATH setup)
01-functions     # Should be second (defines @has-cmd, etc.)
02-colours       # Depends on functions
bash-completion  # Depends on PATH
cargo.sh         # Depends on PATH (but also modifies PATH!)
ghostship        # Depends on PATH
```

### 5. Orchestrator Anti-Pattern

**bashrc Currently Does Too Much**:
- Sets variables (XDG, PATH, HISTFILE, etc.)
- Loads functions
- Configures shell options (set, shopt)
- Sets up completions
- Configures prompt
- Defines functions (reload, defined)

**Orchestrator Should**:
- Only coordinate sourcing order
- Set bootstrap variables (BASHRC_DIR, DOTFILES_DIR, INTERACTIVE_MODE)
- Delegate all work to specialized scripts
- Provide error handling and reporting

---

## Proposed Architecture

### Design Principles

1. **Single Responsibility**: Each file does exactly one thing
2. **Defensive Loading**: All scripts check prerequisites before executing
3. **Explicit Dependencies**: Clear declaration of what each script needs
4. **Idempotent Operations**: Safe to source multiple times
5. **Fail-Fast Validation**: Errors reported immediately with context
6. **Pure Orchestration**: bashrc coordinates, doesn't do work

### Phase-Based Initialization

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: Bootstrap (bashrc only)                            │
│ - Determine BASHRC_DIR, DOTFILES_DIR                        │
│ - Set INTERACTIVE_MODE                                       │
│ - Define guard() helper for defensive loading               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Environment (lib/env/)                             │
│ - XDG directories (01-xdg.sh)                               │
│ - PATH setup (02-path.sh)                                   │
│ - Core env vars (03-environment.sh)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Core Functions (lib/functions/)                    │
│ - Utility functions (has-cmd, defined, warn, die)          │
│ - Colours and formatting                                    │
│ - Shell helper functions                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Shell Configuration (lib/config/)                  │
│ - History setup                                              │
│ - Shell options (shopt, set)                                │
│ - Completion system                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: Features (enabled/*, interactive only)            │
│ - Tool integrations (git, fzf, etc.)                        │
│ - Prompt setup                                               │
│ - Aliases and shortcuts                                      │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
.config/bash/
├── bashrc                      # Pure orchestrator
├── profile                     # Login shell setup
├── lib/
│   ├── env/                   # PHASE 1: Environment
│   │   ├── 01-xdg.sh         # XDG directories
│   │   ├── 02-path.sh        # PATH setup
│   │   └── 03-environment.sh # Other env vars
│   ├── functions/             # PHASE 2: Core functions
│   │   ├── 01-guards.sh      # Guard functions (has-cmd, etc.)
│   │   ├── 02-colours.sh     # Colour definitions
│   │   └── 03-helpers.sh     # Helper functions
│   └── config/                # PHASE 3: Shell config
│       ├── 01-history.sh     # History configuration
│       ├── 02-options.sh     # Shell options
│       └── 03-completion.sh  # Completion system
└── enabled/                   # PHASE 4: Features (unchanged)
    └── *.sh                   # Tool integrations
```

---

## Implementation Details

### 1. Pure Orchestrator: bashrc

```bash
#!/bin/bash
# bashrc - Pure orchestrator for bash shell initialization
# Coordinates loading of shell configuration in strict phases
# Does NOT do work itself - delegates to specialized scripts

# =============================================================================
# PHASE 0: Bootstrap
# =============================================================================

# Enable tracing if requested (for debugging)
[[ -n ${BASHRC_TRACE_SOURCING:-} ]] && set -xv

# Detect interactive mode
case $- in
    *i*) export INTERACTIVE_MODE=1 ;;
    *)   export INTERACTIVE_MODE=0 ;;
esac

# Determine BASHRC_DIR (single definitive resolution)
if [[ -L ~/.bashrc ]]; then
    export BASHRC_DIR="$(cd "$(dirname "$(readlink -f ~/.bashrc)")" && pwd)"
elif [[ -f ~/.bashrc ]]; then
    export BASHRC_DIR="$(cd "$(dirname ~/.bashrc)" && pwd)"
else
    export BASHRC_DIR="$HOME/.config/bash"
fi

# Derive DOTFILES_DIR from BASHRC_DIR
if [[ "$BASHRC_DIR" == "$HOME/.config/bash" ]]; then
    export DOTFILES_DIR="$HOME/.config/dotfiles"
else
    export DOTFILES_DIR="${BASHRC_DIR%/.config/bash}"
fi

# Validate bootstrap succeeded
if [[ ! -d "$BASHRC_DIR" ]]; then
    echo "ERROR: BASHRC_DIR not found: $BASHRC_DIR" >&2
    return 1
fi

# Define guard() helper for defensive script loading
# Usage: guard command-name || return 0
guard() {
    command -v "$1" >/dev/null 2>&1
}

# Define source_phase() for organized loading with error handling
source_phase() {
    local phase_name="$1"
    local phase_dir="$2"
    local pattern="${3:-*.sh}"

    [[ -n "$BASHRC_TRACE_SOURCING" ]] && echo "[bashrc] Loading phase: $phase_name" >&2

    if [[ ! -d "$phase_dir" ]]; then
        [[ -n "$BASHRC_TRACE_SOURCING" ]] && echo "[bashrc] Phase directory not found: $phase_dir" >&2
        return 0
    fi

    # Source scripts in explicit order (numerically sorted)
    for script in "$phase_dir"/$pattern; do
        [[ ! -f "$script" ]] && continue
        [[ ! -r "$script" ]] && continue

        [[ -n "$BASHRC_TRACE_SOURCING" ]] && echo "[bashrc] Sourcing: $script" >&2

        if ! source "$script"; then
            echo "ERROR: Failed to source $script" >&2
            return 1
        fi
    done
}

# =============================================================================
# PHASE 1: Environment Setup
# =============================================================================

source_phase "Environment" "$BASHRC_DIR/lib/env"

# Validate critical environment variables are set
if [[ -z "$PATH" ]]; then
    echo "ERROR: PATH not set after environment phase" >&2
    return 1
fi

# =============================================================================
# PHASE 2: Core Functions
# =============================================================================

source_phase "Functions" "$BASHRC_DIR/lib/functions"

# Validate critical functions are available
if ! guard has-cmd; then
    echo "ERROR: has-cmd function not available after functions phase" >&2
    return 1
fi

# =============================================================================
# PHASE 3: Shell Configuration
# =============================================================================

source_phase "Configuration" "$BASHRC_DIR/lib/config"

# =============================================================================
# PHASE 4: Features (Interactive Only)
# =============================================================================

if [[ $INTERACTIVE_MODE -eq 1 ]]; then
    source_phase "Features" "$BASHRC_DIR/enabled"

    # Load aliases if available
    [[ -f ~/.config/bash/aliases ]] && source ~/.config/bash/aliases
    [[ -f ~/.bash_aliases ]] && source ~/.bash_aliases

    # Define reload function for interactive shells
    reload() {
        echo "Reloading bashrc..."
        source ~/.bashrc
    }
fi

# =============================================================================
# PHASE 5: Post-Load Cleanup
# =============================================================================

# Clean up PATH to remove duplicates
if guard clean_path; then
    clean_path PATH
    export PATH
fi

# Export GPG_TTY for interactive shells
[[ $INTERACTIVE_MODE -eq 1 ]] && export GPG_TTY=$(tty)

[[ -n "$BASHRC_TRACE_SOURCING" ]] && echo "[bashrc] Initialization complete" >&2
```

### 2. Defensive Script Template

All scripts in `lib/` and `enabled/` should follow this pattern:

```bash
#!/bin/bash
# <script-name>.sh - Brief description
# DEPENDENCIES: command1, command2, function1
# PHASE: env|functions|config|features

# Guard clause - check prerequisites
_check_prerequisites() {
    local missing=()

    # Check required commands
    for cmd in delta git; do
        guard "$cmd" || missing+=("$cmd")
    done

    # Check required functions
    for func in has-cmd warn; do
        guard "$func" || missing+=("function:$func")
    done

    # Report missing prerequisites
    if [[ ${#missing[@]} -gt 0 ]]; then
        [[ -n "$BASHRC_TRACE_SOURCING" ]] && \
            echo "[$(basename "$BASH_SOURCE")] Missing prerequisites: ${missing[*]}" >&2
        return 1
    fi

    return 0
}

# Exit early if prerequisites not met
_check_prerequisites || return 0

# =============================================================================
# Script implementation starts here
# =============================================================================

export DELTA_FEATURES='+side-by-side +line-numbers'
export DELTA_PAGER='less --tabs=2 -Rn'
export GIT_PAGER='delta'

# Generate completions safely
if guard delta; then
    source <(delta --generate-completion bash 2>/dev/null) || true
fi
```

### 3. Reorganized lib/ Structure

**lib/env/01-xdg.sh**
```bash
#!/bin/bash
# XDG Base Directory setup
# PHASE: env
# DEPENDENCIES: none

# Set XDG directories (only once, with proper defaults)
: "${XDG_CONFIG_HOME:=$HOME/.config}"
: "${XDG_CACHE_HOME:=$HOME/.cache}"
: "${XDG_DATA_HOME:=$HOME/.local/share}"
: "${XDG_STATE_HOME:=$HOME/.local/state}"

export XDG_CONFIG_HOME XDG_CACHE_HOME XDG_DATA_HOME XDG_STATE_HOME

# Create directories if they don't exist
mkdir -p "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$XDG_STATE_HOME"
```

**lib/env/02-path.sh**
```bash
#!/bin/bash
# PATH setup - single source of truth
# PHASE: env
# DEPENDENCIES: XDG_DATA_HOME

# Only set PATH if not already set (allow parent shell to override)
if [[ -z "${BASH_PATH_SET:-}" ]]; then
    # Start with system defaults
    PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"

    # Add user directories in priority order
    _add_to_path() {
        [[ -d "$1" ]] && PATH="$1:$PATH"
    }

    # Reverse priority order (last added = highest priority)
    _add_to_path "/usr/share/perl6/site/bin"
    _add_to_path "$HOME/.arkade/bin"
    _add_to_path "$HOME/.rbenv/bin"
    _add_to_path "$HOME/.nvm"
    _add_to_path "$HOME/.venv/bin"
    _add_to_path "$XDG_DATA_HOME/bob/nvim-bin"
    _add_to_path "$HOME/.cargo/bin"
    _add_to_path "$HOME/go/bin"
    _add_to_path "$XDG_DATA_HOME/go/bin"
    _add_to_path "$HOME/.config/bin"
    _add_to_path "$HOME/.local/bin"

    export PATH
    export BASH_PATH_SET=1

    unset -f _add_to_path
fi

# Define clean_path function for later use
clean_path() {
    local var_name="$1"
    local path_value="${!var_name}"

    [[ -z "$path_value" ]] && return 0

    local -A seen_paths=()
    local cleaned_paths=()

    IFS=':' read -ra path_array <<< "$path_value"

    for path in "${path_array[@]}"; do
        [[ -z "$path" ]] && continue

        # Normalize and deduplicate
        local normalized_path
        if [[ "$path" == /* ]]; then
            normalized_path="$(realpath "$path" 2>/dev/null || echo "$path")"
            [[ ! -d "$normalized_path" ]] && continue
        else
            normalized_path="$path"
        fi

        [[ -n "${seen_paths[$normalized_path]:-}" ]] && continue

        cleaned_paths+=("$normalized_path")
        seen_paths["$normalized_path"]=1
    done

    local result
    printf -v result '%s:' "${cleaned_paths[@]}"
    printf -v "$var_name" '%s' "${result%:}"
}
```

**lib/functions/01-guards.sh**
```bash
#!/bin/bash
# Guard and check functions
# PHASE: functions
# DEPENDENCIES: none

# Check if command exists
has-cmd() {
    command -v "$1" >/dev/null 2>&1
}

# Compatibility alias
@has-cmd() {
    has-cmd "$@"
}

# Check if function is defined
defined() {
    declare -F "$1" >/dev/null 2>&1
}

# Check if running in interactive shell
@is-interactive() {
    [[ ${-//[!i]/} ]]
}

# Call function if it's defined
call-if-defined() {
    defined "$1" && "$@"
}
```

---

## Migration Plan

### Phase 1: Create New Structure (No Breaking Changes)

**Tasks**:
1. Create new directory structure:
   ```bash
   mkdir -p .config/bash/lib/{env,functions,config}
   ```

2. Create new orchestrator as `bashrc.new`:
   - Implement pure orchestrator pattern
   - Use source_phase() for organized loading
   - Add comprehensive error handling

3. Reorganize lib/ files:
   - Move/split files into env/, functions/, config/
   - Add guard clauses to all scripts
   - Remove redundant code (cargo.sh, etc.)

4. Update enabled/ scripts:
   - Add _check_prerequisites to each
   - Replace command execution with guarded versions
   - Document DEPENDENCIES in headers

**Validation**:
- bashrc.new sources successfully in clean environment
- All tests pass with bashrc.new
- No command-not-found errors during sourcing

### Phase 2: Testing & Validation

**Test Scenarios**:
1. Fresh shell in various directories
2. Non-interactive shell (scripts)
3. SSH login shell
4. Tmux new window
5. Source from /tmp, /var/tmp, $HOME
6. Missing commands (delta, rustup, etc.)
7. Partial installation (some tools missing)

**Validation Criteria**:
- No errors during sourcing
- All expected functions available
- PATH contains expected directories
- No duplicate PATH entries
- Prompt renders correctly
- Commands available as expected

### Phase 3: Cutover

**Steps**:
1. Backup current bashrc:
   ```bash
   cp .config/bash/bashrc .config/bash/bashrc.old
   ```

2. Replace with new version:
   ```bash
   mv .config/bash/bashrc.new .config/bash/bashrc
   ```

3. Test in new shell:
   ```bash
   bash -i -c 'echo "Interactive test: $BASHRC_DIR"'
   bash -c 'echo "Non-interactive test: $BASHRC_DIR"'
   ```

4. Monitor for issues over 24 hours

5. Remove old backup if stable

---

## Test Plan

### Unit Tests

**Test: 01-bootstrap.sh**
```bash
#!/bin/bash
# Test bashrc bootstrap phase

test_bashrc_dir_resolution() {
    # Test symlink resolution
    ln -sf "$PWD/.config/bash/bashrc" ~/.bashrc
    result=$(bash -c 'source ~/.bashrc && echo "$BASHRC_DIR"')
    expected="$PWD/.config/bash"
    assert_equals "$expected" "$result"
}

test_dotfiles_dir_derivation() {
    result=$(bash -c 'source .config/bash/bashrc && echo "$DOTFILES_DIR"')
    expected="$PWD"
    assert_equals "$expected" "$result"
}

test_interactive_mode_detection() {
    # Interactive shell
    result=$(bash -i -c 'source .config/bash/bashrc && echo "$INTERACTIVE_MODE"')
    assert_equals "1" "$result"

    # Non-interactive shell
    result=$(bash -c 'source .config/bash/bashrc && echo "$INTERACTIVE_MODE"')
    assert_equals "0" "$result"
}

test_guard_function_available() {
    result=$(bash -c 'source .config/bash/bashrc && guard bash && echo "OK"')
    assert_equals "OK" "$result"
}
```

**Test: 02-environment.sh**
```bash
#!/bin/bash
# Test environment phase

test_xdg_directories_set() {
    result=$(bash -c 'source .config/bash/bashrc && echo "$XDG_CONFIG_HOME"')
    assert_not_empty "$result"
}

test_path_contains_local_bin() {
    result=$(bash -c 'source .config/bash/bashrc && echo "$PATH"')
    assert_contains "$HOME/.local/bin" "$result"
}

test_path_no_duplicates() {
    result=$(bash -c 'source .config/bash/bashrc && echo "$PATH" | tr ":" "\n" | sort | uniq -d')
    assert_empty "$result" "PATH should have no duplicates"
}

test_clean_path_function_available() {
    result=$(bash -c 'source .config/bash/bashrc && type -t clean_path')
    assert_equals "function" "$result"
}
```

**Test: 03-functions.sh**
```bash
#!/bin/bash
# Test functions phase

test_has_cmd_exists() {
    result=$(bash -c 'source .config/bash/bashrc && type -t has-cmd')
    assert_equals "function" "$result"
}

test_has_cmd_works() {
    result=$(bash -c 'source .config/bash/bashrc && has-cmd bash && echo "OK"')
    assert_equals "OK" "$result"
}

test_defined_function_exists() {
    result=$(bash -c 'source .config/bash/bashrc && type -t defined')
    assert_equals "function" "$result"
}

test_at_has_cmd_alias_works() {
    result=$(bash -c 'source .config/bash/bashrc && @has-cmd bash && echo "OK"')
    assert_equals "OK" "$result"
}
```

**Test: 04-defensive-loading.sh**
```bash
#!/bin/bash
# Test defensive loading of enabled scripts

test_delta_loads_without_delta() {
    # Temporarily hide delta command
    result=$(bash -c 'PATH=/usr/bin:/bin source .config/bash/bashrc 2>&1')
    assert_not_contains "delta: command not found" "$result"
}

test_rustup_loads_without_rustup() {
    result=$(bash -c 'PATH=/usr/bin:/bin source .config/bash/bashrc 2>&1')
    assert_not_contains "rustup: command not found" "$result"
}

test_has_cmd_available_before_enabled_scripts() {
    # Create test script that uses @has-cmd
    cat > /tmp/test-enabled.sh <<'EOF'
@has-cmd test-command || echo "has-cmd works"
EOF

    result=$(bash -i -c 'source .config/bash/bashrc' 2>&1)
    assert_contains "has-cmd works" "$result"

    rm -f /tmp/test-enabled.sh
}
```

### Integration Tests

**Test: 05-complete-sourcing.sh**
```bash
#!/bin/bash
# Test complete bashrc sourcing in various scenarios

test_sourcing_from_home() {
    cd ~
    result=$(bash -c 'source ~/.bashrc && echo "$BASHRC_DIR"' 2>&1)
    assert_success "$?" "Should source successfully from home"
    assert_not_contains "ERROR" "$result"
}

test_sourcing_from_tmp() {
    cd /tmp
    result=$(bash -c 'source ~/.bashrc && echo "$BASHRC_DIR"' 2>&1)
    assert_success "$?" "Should source successfully from /tmp"
    assert_not_contains "ERROR" "$result"
}

test_sourcing_from_dotfiles_repo() {
    cd ~/.config/dotfiles
    result=$(bash -c 'source .config/bash/bashrc && echo "$BASHRC_DIR"' 2>&1)
    assert_success "$?" "Should source successfully from repo"
    assert_not_contains "ERROR" "$result"
}

test_interactive_shell_features() {
    result=$(bash -i -c 'source ~/.bashrc && type reload' 2>&1)
    assert_contains "reload is a function" "$result"
}

test_non_interactive_no_prompt() {
    result=$(bash -c 'source ~/.bashrc && echo "${PS1:-unset}"' 2>&1)
    assert_not_contains "ghostship" "$result"
}
```

**Test: 06-idempotency.sh**
```bash
#!/bin/bash
# Test that sourcing bashrc multiple times is safe

test_double_sourcing() {
    result=$(bash -c '
        source .config/bash/bashrc
        PATH1="$PATH"
        source .config/bash/bashrc
        PATH2="$PATH"
        [[ "$PATH1" == "$PATH2" ]] && echo "OK"
    ')
    assert_equals "OK" "$result" "PATH should be identical after double sourcing"
}

test_triple_sourcing_no_errors() {
    result=$(bash -c '
        source .config/bash/bashrc 2>&1
        source .config/bash/bashrc 2>&1
        source .config/bash/bashrc 2>&1
    ' | grep -i error)
    assert_empty "$result" "Should have no errors after triple sourcing"
}
```

### Regression Tests

**Test: 07-regression.sh**
```bash
#!/bin/bash
# Regression tests for known issues

test_agentctl_available_from_any_dir() {
    cd /tmp
    result=$(bash -i -c 'source ~/.bashrc && type agentctl' 2>&1)
    assert_contains "agentctl is a function" "$result"
}

test_dotfiles_dir_correct_from_any_dir() {
    cd /var/tmp
    result=$(bash -c 'source ~/.bashrc && echo "$DOTFILES_DIR"')
    assert_contains ".config/dotfiles" "$result"
}

test_ghostship_available_in_interactive() {
    result=$(bash -i -c 'source ~/.bashrc && has-cmd ghostship && echo "OK"')
    # Only test if ghostship is installed
    if command -v ghostship >/dev/null; then
        assert_equals "OK" "$result"
    fi
}

test_no_command_not_found_errors() {
    result=$(bash -i -c 'source ~/.bashrc 2>&1' | grep "command not found")
    assert_empty "$result" "Should have no 'command not found' errors"
}
```

### Performance Tests

**Test: 08-performance.sh**
```bash
#!/bin/bash
# Performance tests for bashrc sourcing

test_sourcing_speed() {
    local start=$(date +%s%N)
    bash -c 'source ~/.bashrc' >/dev/null 2>&1
    local end=$(date +%s%N)
    local duration=$(( (end - start) / 1000000 )) # Convert to milliseconds

    echo "Bashrc sourcing took: ${duration}ms"

    # Assert it takes less than 500ms (adjust as needed)
    [[ $duration -lt 500 ]] || {
        echo "WARNING: Bashrc sourcing is slow (${duration}ms > 500ms)"
        return 1
    }
}

test_no_unnecessary_subshells() {
    # Check for inefficient patterns like $(command) in loops
    result=$(grep -r '\$(' .config/bash/bashrc .config/bash/lib/ .config/bash/enabled/ | wc -l)
    echo "Command substitutions found: $result"

    # This is just informational, adjust threshold as needed
    [[ $result -lt 20 ]] || echo "WARNING: Many command substitutions detected"
}
```

### Test Execution

**Run all tests**:
```bash
# Create test runner
cat > tests/test-bashrc-restructuring.sh <<'EOF'
#!/bin/bash
set -euo pipefail

# Simple test framework
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

assert_equals() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ "$1" == "$2" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "✅ PASS"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "❌ FAIL: Expected '$1', got '$2'"
        [[ -n "${3:-}" ]] && echo "   $3"
    fi
}

assert_success() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ "$1" -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "✅ PASS"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "❌ FAIL: Command failed with exit code $1"
        [[ -n "${2:-}" ]] && echo "   $2"
    fi
}

assert_contains() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if echo "$2" | grep -qF "$1"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "✅ PASS"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "❌ FAIL: '$2' does not contain '$1'"
    fi
}

assert_not_contains() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if ! echo "$2" | grep -qF "$1"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "✅ PASS"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "❌ FAIL: '$2' should not contain '$1'"
    fi
}

assert_empty() {
    assert_equals "" "$1" "${2:-}"
}

assert_not_empty() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ -n "$1" ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "✅ PASS"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo "❌ FAIL: Expected non-empty value"
        [[ -n "${2:-}" ]] && echo "   $2"
    fi
}

# Source all test files
for test_file in tests/bashrc-restructuring/*-*.sh; do
    [[ -f "$test_file" ]] || continue
    echo ""
    echo "Running $(basename "$test_file")..."
    echo "=========================================="
    source "$test_file"
done

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total: $TESTS_RUN"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"

[[ $TESTS_FAILED -eq 0 ]] && exit 0 || exit 1
EOF

chmod +x tests/test-bashrc-restructuring.sh

# Create test directory
mkdir -p tests/bashrc-restructuring

# Run tests
./tests/test-bashrc-restructuring.sh
```

---

## Benefits of Proposed Architecture

1. **Zero Redundancy**: Each variable/path set exactly once
2. **Clear Dependencies**: Explicit phases ensure correct load order
3. **Defensive Loading**: Scripts check prerequisites, no command-not-found errors
4. **Easy Debugging**: BASHRC_TRACE_SOURCING shows exact load sequence
5. **Fast Failures**: Errors reported immediately with context
6. **Maintainable**: Each file has single responsibility
7. **Testable**: Each phase can be tested independently
8. **Idempotent**: Safe to source multiple times
9. **Portable**: Works in any directory, any deployment scenario
10. **Documented**: Clear contracts between orchestrator and scripts

---

## Success Metrics

**Before Restructuring**:
- Command-not-found errors: 4+ (delta, gum, @has-cmd, rustup)
- Variables set multiple times: 6+ (XDG vars, BASHRC_DIR, DOTFILES_DIR, PATH)
- Lines of duplicate code: ~50
- Sourcing order: Undefined (alphabetical)
- Script dependencies: Implicit/unknown

**After Restructuring**:
- Command-not-found errors: 0
- Variables set multiple times: 0
- Lines of duplicate code: 0
- Sourcing order: Explicit phases
- Script dependencies: Declared in headers
- Test coverage: 95%+
- Sourcing time: <500ms

---

## Rollback Plan

If issues arise after cutover:

```bash
# Immediate rollback
cp .config/bash/bashrc.old .config/bash/bashrc
source ~/.bashrc

# Verify rollback worked
echo "BASHRC_DIR: $BASHRC_DIR"
echo "Functions available: $(type -t has-cmd reload agentctl)"
```

---

## Appendix: File Migration Matrix

| Current Location | New Location | Changes Required |
|-----------------|--------------|------------------|
| lib/00-path | lib/env/02-path.sh | Add guard clauses, remove duplicates with cargo.sh |
| lib/01-functions | lib/functions/01-guards.sh + lib/functions/03-helpers.sh | Split into guards and helpers |
| lib/02-colours | lib/functions/02-colours.sh | Add guard clauses |
| lib/cargo.sh | DELETE | Functionality merged into lib/env/02-path.sh |
| lib/history.sh | lib/config/01-history.sh | Add guard clauses |
| enabled/*.sh | enabled/*.sh (no move) | Add _check_prerequisites() to each |

---

## Questions for Review

1. **Phase granularity**: Is 4 phases sufficient, or should we have more?
2. **Naming**: Are env/, functions/, config/ clear enough names?
3. **Guard function**: Should guard() be a function or alias?
4. **Error handling**: Should errors be fatal (return 1) or warnings?
5. **Backwards compatibility**: Should we maintain old variable names?
6. **Profile integration**: Should profile also use phase-based loading?

---

## References

- ADR-006: Robust bashrc directory resolution
- ADR-007: Bashrc restructuring using Arrange-Act-Assert pattern
- Current bashrc: `.config/bash/bashrc`
- Current lib/: `.config/bash/lib/`
- Test suite: `tests/bash-function-loading.sh`, `tests/bashrc-directory-resolution/`
