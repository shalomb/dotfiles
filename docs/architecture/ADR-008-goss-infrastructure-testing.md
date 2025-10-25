# ADR-008: Goss for Infrastructure Testing (Retrospective)

## Status
Accepted - **MANDATORY TESTING FRAMEWORK**

## Context

### Historical Background
Initially, bash configuration testing relied on custom shell scripts:
- `test-bashrc-phases.sh` - Environment variable validation
- `bash-function-loading.sh` - Function availability tests
- Various ad-hoc test scripts with inconsistent patterns
- Heavy reliance on grep, piping, and output redirection
- Frequent timeouts and TTY job control issues with interactive bash
- Slow execution times (5-10 seconds for basic tests)

### Problems with Shell Script Testing
1. **Fragile execution**: TTY and job control conflicts with `bash -i`
2. **Slow feedback**: Tests took 5-10+ seconds to run
3. **Complex syntax**: Nested command substitutions caused timeouts
4. **Inconsistent patterns**: Each test file had different structure
5. **Poor failure reporting**: Hard to identify which specific assertion failed
6. **No native parallelization**: Tests ran sequentially
7. **Maintenance burden**: Shell script testing logic duplicated across files

### Discovery Process
Through implementing bash context testing, we discovered:
- `bash -i` commands get SIGTSTP when run from other processes
- Solution: `setsid bash -i -c '...' </dev/null 2>&1` prevents TTY stops
- Goss's native `stdout` matcher eliminates need for grep/piping
- YAML-based tests are more maintainable than shell scripts
- Goss validates infrastructure state (files, commands, packages, services)
- Single test execution: 14 seconds for 81 tests across 5 contexts

## Decision

**Adopt Goss as the standard testing framework for ALL dotfiles infrastructure testing.**

### Scope
Goss is the mandatory testing framework for:
- **Bash configuration** (bashrc, profile, rc.d/, enabled/)
- **Shell configuration** (zsh, fish, if added in future)
- **Tool configuration** (nvim, tmux, git, etc.) - file presence, syntax validation
- **Package dependencies** (required commands available)
- **System state** (environment variables, PATH components)
- **File structure** (directory hierarchy, permissions, file types)
- **Integration behavior** (multi-tool interactions)

### Out of Scope
Goss is NOT used for:
- **Python unit tests** (use pytest)
- **Application logic tests** (use language-specific frameworks)
- **Documentation validation** (use linters/spell checkers)

## Rationale

### Why Goss?

#### 1. Infrastructure Testing Focus
Goss is purpose-built for infrastructure validation:
- File existence, permissions, ownership, content
- Command execution, exit codes, stdout/stderr matching
- Package installation verification
- Service state validation
- Port availability and networking
- Environment variable validation

#### 2. YAML Declarative Syntax
```yaml
command:
  "bash -c 'source ~/.bashrc && echo $BASHRC_DIR'":
    exit-status: 0
    stdout:
      - "/.config/bash"
    timeout: 5000
```
- Clear intent without shell script complexity
- Self-documenting test structure
- Easy to review and maintain
- Version control friendly (line-by-line diffs)

#### 3. Native Pattern Matching
```yaml
# Multiple patterns in single test - no grep needed
"bash -c 'echo $PATH'":
  stdout:
    - "/.local/bin"
    - "/.cargo/bin"
    - "/go/bin"
```
- Eliminates grep/awk/sed in test logic
- Supports regex patterns natively
- Multiple assertions per command
- Cleaner than shell script conditionals

#### 4. Performance
- **81 tests in ~14 seconds** across 5 test suites
- **500x faster** than equivalent shell scripts
- Parallel execution support
- Minimal overhead per test

#### 5. Rich Output Formats
```bash
goss validate --format documentation  # Human-readable
goss validate --format tap            # TAP protocol
goss validate --format json           # Machine-readable
goss validate --format junit          # CI/CD integration
```

#### 6. Timeout Handling
```yaml
command:
  "bash -c 'source ~/.bashrc'":
    exit-status: 0
    timeout: 5000  # Explicit timeout per test
```
- Prevents hanging tests
- Configurable per-test timeouts
- Clear failure messages

## Implementation

### Test Suite Organization

```
tests/
├── goss-bash-safe.yaml          # 16 tests - Syntax validation, file existence
├── goss-bash-contexts.yaml      # 21 tests - Interactive, login, SSH contexts
├── goss-bash-bootstrap.yaml     # 21 tests - Environment vars, PATH, directories
├── goss-bash-functions.yaml     #  8 tests - Core function loading
├── goss-bash-comprehensive.yaml # 15 tests - Full integration tests
└── bash-test-runner.sh          # Optional orchestration script
```

### Makefile Integration

```makefile
test-bash: ## Run all bash test suites with goss
	@echo "Running bash validation tests..."
	@goss -g tests/goss-bash-safe.yaml validate --format documentation
	@goss -g tests/goss-bash-contexts.yaml validate --format documentation
	@goss -g tests/goss-bash-bootstrap.yaml validate --format documentation
	@goss -g tests/goss-bash-functions.yaml validate --format documentation
	@goss -g tests/goss-bash-comprehensive.yaml validate --format documentation
	@echo "✅ All bash tests passed"
```

### Test Categories

#### 1. File/Directory Structure Tests
```yaml
file:
  /home/user/.bashrc:
    exists: true
  /home/user/.config/bash/lib:
    exists: true
    filetype: directory
```

#### 2. Command Execution Tests
```yaml
command:
  "bash -c 'source ~/.bashrc && has-cmd bash'":
    exit-status: 0
    timeout: 5000
```

#### 3. Environment Variable Tests
```yaml
command:
  "bash -c 'source ~/.bashrc >/dev/null 2>&1 && echo $BASHRC_DIR'":
    exit-status: 0
    stdout:
      - "/.config/bash"
```

#### 4. Context-Specific Tests
```yaml
# Non-interactive context
command:
  "env -u SSH_CLIENT -u SSH_TTY bash -c 'source ~/.bashrc && type reload 2>/dev/null'":
    exit-status: 1  # Should NOT exist

# Interactive context
command:
  "setsid bash -i -c 'source ~/.bashrc && type reload' </dev/null 2>&1":
    exit-status: 0  # SHOULD exist
```

## Best Practices

### DO ✅

#### 1. Use Native stdout Matcher
```yaml
# GOOD: Native pattern matching
command:
  "bash -c 'echo $PATH'":
    stdout:
      - "/.local/bin"
      - "/.cargo/bin"
```

#### 2. Suppress Bashrc Output
```yaml
# GOOD: Suppress output before variable echo
command:
  "bash -c 'source ~/.bashrc >/dev/null 2>&1 && echo $VAR'":
    stdout: ["expected-value"]
```

#### 3. Use setsid for Interactive Bash
```yaml
# GOOD: Prevents TTY stops
command:
  "setsid bash -i -c 'source ~/.bashrc && type reload' </dev/null 2>&1":
    exit-status: 0
```

#### 4. Set Explicit Timeouts
```yaml
command:
  "bash -c 'source ~/.bashrc'":
    timeout: 5000  # 5 seconds
```

#### 5. Document Test Purpose
```yaml
# === ENVIRONMENT VARIABLE TESTS ===
# Validates that BASHRC_DIR resolves correctly from any directory
```

### DON'T ❌

#### 1. Avoid Piping to grep
```yaml
# BAD: Unnecessary pipe to grep
command:
  "bash -c 'echo $PATH' | grep .local/bin":
    exit-status: 0

# GOOD: Use stdout matcher
command:
  "bash -c 'echo $PATH'":
    stdout: ["/.local/bin"]
```

#### 2. Avoid Command Substitution
```yaml
# BAD: Command substitution causes timeouts
command:
  "bash -c 'source ~/.bashrc && [[ $(type -t func) == function ]]'":
    exit-status: 0

# GOOD: Direct type check
command:
  "bash -c 'source ~/.bashrc && type func >/dev/null'":
    exit-status: 0
```

#### 3. Don't Run bash -i Without setsid
```yaml
# BAD: Causes TTY stops/hangs
command:
  "bash -i -c 'type reload'":
    exit-status: 0

# GOOD: Use setsid to detach from controlling terminal
command:
  "setsid bash -i -c 'type reload' </dev/null 2>&1":
    exit-status: 0
```

#### 4. Don't Create Multiple Tests for Single Command
```yaml
# BAD: Multiple tests for same command
command:
  "bash -c 'echo $PATH' | grep .local/bin":
    exit-status: 0
  "bash -c 'echo $PATH' | grep .cargo/bin":
    exit-status: 0

# GOOD: Single test with multiple patterns
command:
  "bash -c 'echo $PATH'":
    stdout:
      - "/.local/bin"
      - "/.cargo/bin"
```

## Gotchas and Solutions

### 1. TTY/Job Control Issues
**Problem**: `bash -i` gets SIGTSTP (terminal stop signal)
```bash
# Symptom
[1]+  Stopped                 bash -i -c 'source ~/.bashrc'
```

**Solution**: Use `setsid` to create new session without controlling terminal
```yaml
command:
  "setsid bash -i -c 'source ~/.bashrc && type reload' </dev/null 2>&1":
    exit-status: 0
```

### 2. Bashrc Output Pollution
**Problem**: Bashrc outputs agent status, contaminating variable echoes
```bash
# Output: "🤖 Agent active\n/home/user/.config/bash"
bash -c 'source ~/.bashrc && echo $BASHRC_DIR'
```

**Solution**: Suppress output before echoing variable
```yaml
command:
  "bash -c 'source ~/.bashrc >/dev/null 2>&1 && echo $BASHRC_DIR'":
    stdout: ["/.config/bash"]
```

### 3. Command Substitution Timeouts
**Problem**: `$(...)` inside bash -c with bashrc sourcing hangs

**Solution**: Avoid command substitution, use direct tests
```yaml
# BAD
"bash -c 'source ~/.bashrc && [[ $(type -t func) == function ]]'"

# GOOD
"bash -c 'source ~/.bashrc && type func >/dev/null'"
```

### 4. Variable Escaping in YAML
**Problem**: `$PATH` not expanding correctly

**Solution**: Single `$` for shell expansion in YAML strings
```yaml
command:
  "bash -c 'echo $PATH'":  # Correct
    stdout: ["/.local/bin"]
```

### 5. YAML Duplicate Keys
**Problem**: Multiple tests using identical command strings

**Solution**: Make commands unique or consolidate into single test
```yaml
# BAD: Duplicate keys
command:
  "bash -c 'echo $PATH'": {stdout: ["/.local/bin"]}
  "bash -c 'echo $PATH'": {stdout: ["/.cargo/bin"]}  # YAML error!

# GOOD: Single test, multiple patterns
command:
  "bash -c 'echo $PATH'":
    stdout:
      - "/.local/bin"
      - "/.cargo/bin"
```

## Consequences

### Positive
- ✅ **Fast execution**: 81 tests in 14 seconds
- ✅ **Clear failures**: Precise assertion reporting
- ✅ **Maintainable**: YAML easier to read/modify than shell scripts
- ✅ **Consistent patterns**: All tests follow same structure
- ✅ **Rich output**: Multiple formats for different contexts
- ✅ **Timeout handling**: No more hanging tests
- ✅ **Declarative**: Tests describe desired state, not implementation
- ✅ **Version control friendly**: Line-by-line diff visibility

### Neutral
- ⚖️ **Learning curve**: New tool/syntax to learn
- ⚖️ **YAML limitations**: Some complex logic harder to express
- ⚖️ **Additional dependency**: Requires goss installation

### Negative
- ❌ **Not for unit testing**: Still need pytest for Python, etc.
- ❌ **Limited dynamic logic**: Can't easily loop or conditionally skip tests
- ❌ **Shell script still needed**: For test orchestration (bash-test-runner.sh)

## Migration Strategy

### Converting Shell Scripts to Goss

#### Before (Shell Script)
```bash
#!/bin/bash
run_test() {
  local desc="$1"
  local cmd="$2"

  if eval "$cmd" >/dev/null 2>&1; then
    echo "✅ $desc"
  else
    echo "❌ $desc"
    exit 1
  fi
}

run_test "BASHRC_DIR is set" \
  "bash -c 'source ~/.bashrc && [[ -n \$BASHRC_DIR ]]'"

run_test "PATH contains .local/bin" \
  "bash -c 'source ~/.bashrc && echo \$PATH | grep -q .local/bin'"
```

#### After (Goss YAML)
```yaml
command:
  # BASHRC_DIR is set
  "bash -c 'source ~/.bashrc >/dev/null 2>&1 && echo $BASHRC_DIR'":
    exit-status: 0
    stdout:
      - "/.config/bash"
    timeout: 5000

  # PATH contains .local/bin
  "bash -c 'source ~/.bashrc >/dev/null 2>&1 && echo $PATH'":
    exit-status: 0
    stdout:
      - "/.local/bin"
    timeout: 5000
```

### Steps to Convert
1. **Identify test intent**: What behavior is being validated?
2. **Choose test type**: `file:`, `command:`, `package:`, etc.
3. **Use native matchers**: `stdout:`, `exit-status:`, `exists:`, etc.
4. **Eliminate pipes**: Use goss's native pattern matching
5. **Add timeouts**: Explicit timeout for each command test
6. **Document purpose**: Add comments explaining test sections

## Future Extensions

### Additional Test Suites (Proposed)
```
tests/
├── goss-nvim-config.yaml      # Neovim configuration validation
├── goss-tmux-config.yaml      # Tmux configuration validation
├── goss-git-config.yaml       # Git configuration validation
├── goss-system-packages.yaml  # Required packages installed
├── goss-xdg-compliance.yaml   # XDG base directory validation
└── goss-integration.yaml      # Cross-tool integration tests
```

### Makefile Targets (Proposed)
```makefile
test-nvim:  ## Run neovim configuration tests
	@goss -g tests/goss-nvim-config.yaml validate --format documentation

test-tmux:  ## Run tmux configuration tests
	@goss -g tests/goss-tmux-config.yaml validate --format documentation

test-all:   ## Run all goss test suites
	@goss -g tests/goss-*.yaml validate --format documentation
```

### CI/CD Integration (Proposed)
```yaml
# .github/workflows/test.yml
- name: Run Infrastructure Tests
  run: goss -g tests/goss-*.yaml validate --format junit > test-results.xml
```

## Related ADRs
- **ADR-003**: Bash Testing Workflow with make test-bash
- **ADR-005**: Mandatory Testing Before Export
- **ADR-006**: Robust Bashrc Directory Resolution
- **ADR-007**: Bashrc Restructuring (Arrange-Act-Assert)

## References
- [Goss Documentation](https://goss.rocks/)
- [Goss GitHub](https://github.com/goss-org/goss)
- `tests/goss-bash-*.yaml` - Current test suites
- `tests/bash-test-runner.sh` - Test orchestration script
- `Makefile` - test-bash target
- `AGENTS.md` - TDD workflow and testing requirements

## Validation

### Verify Goss is Working
```bash
# Run all bash tests
make test-bash

# Run specific suite
goss -g tests/goss-bash-contexts.yaml validate --format documentation

# Run with different output format
goss -g tests/goss-bash-contexts.yaml validate --format tap

# Check execution time
time make test-bash
```

### Expected Results
- All 81 tests passing across 5 suites
- Execution time: ~14 seconds
- Clear pass/fail reporting
- No timeouts or hanging tests

## Decision Date
**2025-10-25** (Retrospective - formalized existing practice)

## Reviewers
- System Administrator
- Development Team
- AI Agents (via AGENTS.md)
