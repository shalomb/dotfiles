# ADR-003: Bash Testing Workflow with make test-bash

## Status
Accepted

## Context
Bash configuration changes were being deployed without systematic validation:
- No standard test target for bash changes
- Changes deployed directly to home directory without testing
- Behavioral issues only discovered after deployment
- Too much focus on testing specific functions/aliases (brittle)
- Need generic behavioral tests that focus on architecture

## Decision
**Use `make test-bash` as the standard validation target for all bash configuration changes.**

### Rationale
- **Test before deploy**: Catch errors before they reach production
- **Behavioral focus**: Test architecture and behaviors, not specific implementations
- **Fast feedback**: Runs in < 2 seconds for rapid iteration
- **Standard workflow**: Consistent process for all bash changes
- **TUI-safe**: Works in cursor-agent and other terminal environments

### Test Categories

#### 1. Architecture Tests
- File structure exists (bashrc, rc.d/, enabled/, disabled/)
- Files are readable and properly organized

#### 2. Sourcing Behavior
- bashrc sources without errors
- rc.d/ files are readable
- enabled/ scripts load cleanly

#### 3. Loading Behavior
- rc.d/ directory is located (BASHRC_DIR set)
- enabled/ scripts load without permission errors

#### 4. Performance Tests
- bashrc loads in < 2 seconds
- No blocking operations during startup

#### 5. Error Handling
- bashrc exits cleanly
- No unhandled errors or premature exits
- Proper handling of unset variables

### What We DON'T Test
- **Specific functions**: Too brittle, changes frequently
- **Specific aliases**: Implementation detail, not behavior
- **Tool availability**: External dependency, not our concern
- **Personal preferences**: User-specific configuration

## Implementation

### Makefile Target
```makefile
test-bash: ## Run bash validation only (standards + shellcheck)
	@echo "Running bash standards validation..."
	@tests/bash-standards/validate-standards.sh
	@echo "Running shellcheck validation..."
	@tests/bash-standards/run-shellcheck.sh
	@echo "✅ Bash validation complete"
```

### Standard Workflow
```bash
# 1. Make changes to bash configuration
vim .config/bash/bashrc

# 2. Run validation
make test-bash

# 3. If tests pass, deploy
uv run python -m dotfile_manager export .config/bash/bashrc

# 4. Test in current shell
source ~/.bashrc

# 5. Commit changes
git add .config/bash/bashrc
git commit -m "bash: <description of change>"
```

### Test Script Location
- `tests/bash-standards/validate-standards.sh` - Behavioral validation
- `tests/bash-standards/run-shellcheck.sh` - Shellcheck validation

## Consequences

### Positive
- **Catch errors early**: Issues found before deployment
- **Consistent workflow**: Everyone uses the same process
- **Fast iteration**: Tests complete in seconds
- **Behavioral focus**: Tests are resilient to implementation changes
- **TUI-compatible**: Works in all environments

### Neutral
- **Additional step**: Requires running `make test-bash` before deploy
- **Test maintenance**: Tests need updating if architecture changes

### Negative
- **Not exhaustive**: Doesn't test all possible edge cases
- **Environment-dependent**: Some issues only appear in specific contexts

## Examples

### Good: Behavioral Test
```bash
run_test "bashrc sources without errors" "bash --norc -c 'source .config/bash/bashrc 2>&1' | grep -qiv 'error'"
```

### Bad: Implementation Test
```bash
run_test "dotfiles function exists" "type -t dotfiles >/dev/null"
```

### Good: Architecture Test
```bash
run_test "rc.d directory exists" "[ -d .config/bash/rc.d ]"
```

### Bad: Specific Function Test
```bash
run_test "cdp function works" "cdp /tmp >/dev/null"
```

## Related ADRs
- **ADR-001**: rc.d/ Directory for Core Functions
- **ADR-002**: enabled/ Directory Uses File Movement, Not Symlinks
- **ADR-004**: Load rc.d/ Files En-Masse (to be created)

## References
- `Makefile` - test-bash target
- `tests/bash-standards/validate-standards.sh` - Behavioral validation script
- `AGENTS.md` - Definition of Done includes testing
