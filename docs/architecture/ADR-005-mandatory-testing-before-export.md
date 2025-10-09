# ADR-005: Mandatory Testing Before Export

## Status
Accepted - **MANDATORY REQUIREMENT**

## Context
Files were being exported to home directory without validation:
- Changes deployed without running tests
- Broken configurations discovered after deployment
- No enforcement mechanism to ensure testing
- Inconsistent workflow across different changes

## Decision
**MANDATORY: Run `make test-bash` before ANY export of bash configuration files.**

This is not optional. This is not a suggestion. This is a **REQUIREMENT**.

### Enforcement
- **Human workflow**: Must run `make test-bash` before export
- **Agent workflow**: MUST run `make test-bash` before ANY export command
- **CI/CD**: Pre-commit hooks validate test status
- **Documentation**: AGENTS.md instructs this as mandatory step

### Standard Workflow
```bash
# 1. Make changes to bash configuration
vim .config/bash/bashrc

# 2. MANDATORY: Run tests
make test-bash

# 3. ONLY IF TESTS PASS: Deploy
uv run python -m dotfile_manager export .config/bash/bashrc

# 4. Test in current shell
source ~/.bashrc

# 5. Commit changes
git add .config/bash/bashrc
git commit -m "bash: <description>"
```

### Files That Require Testing
- `.config/bash/bashrc`
- `.config/bash/profile`
- `.config/bash/rc.d/*`
- `.config/bash/enabled/*`
- `.config/bash/aliases`
- Any bash configuration file

### Files That Don't Require bash Testing
- Python files (use `make test` instead)
- Documentation files (no testing required)
- Non-bash configuration files (use appropriate tests)

## Rationale

### Prevent Broken Shells
- **Catch syntax errors**: Before they reach home directory
- **Validate sourcing**: Ensure files load without errors
- **Check performance**: Detect slow loading issues
- **Verify architecture**: Ensure file structure is correct

### Fast Feedback
- **< 2 seconds**: Tests complete quickly
- **Immediate results**: Know if changes work before deploying
- **TUI-safe**: Works in cursor-agent and other environments

### Consistent Quality
- **Everyone tests**: Same standard for all contributors
- **No exceptions**: Every bash change must pass tests
- **Automated validation**: Tests are objective, not subjective

## Implementation

### Agent Instructions (AGENTS.md)
```markdown
### **Mandatory Testing Before Export**

**REQUIREMENT**: Before ANY export of bash configuration:

1. Run `make test-bash`
2. Wait for completion
3. ONLY if tests pass, proceed with export
4. If tests fail, FIX the issue before export

**NO EXCEPTIONS**: This is mandatory for all bash configuration changes.
```

### Makefile Target
```makefile
test-bash: ## Run bash validation only (standards + shellcheck)
	@echo "Running bash standards validation..."
	@tests/bash-standards/validate-standards.sh
	@echo "Running shellcheck validation..."
	@tests/bash-standards/run-shellcheck.sh
	@echo "✅ Bash validation complete"
```

### Validation Script
- `tests/bash-standards/validate-standards.sh` - Behavioral tests
- `tests/bash-standards/run-shellcheck.sh` - Shellcheck validation

## Consequences

### Positive
- **No broken shells**: Issues caught before deployment
- **Fast iteration**: Tests complete in seconds
- **Consistent quality**: All changes validated
- **Clear workflow**: Everyone follows same process
- **Agent compliance**: AI agents follow mandatory workflow

### Neutral
- **Additional step**: Must run tests before export
- **Discipline required**: Cannot skip testing

### Negative
- **False positives possible**: Tests might fail on valid changes
- **Context-dependent**: Some issues only appear in production

## Exceptions

### When NOT to Run make test-bash
1. **Python-only changes**: Use `make test` instead
2. **Documentation changes**: No testing required
3. **Non-bash configs**: Use appropriate tests for that subsystem

### When to Override
**NEVER**. If tests fail, fix the issue. Do not deploy broken configuration.

If tests are wrong, fix the tests. Do not skip testing.

## Related ADRs
- **ADR-003**: Bash Testing Workflow with make test-bash
- **ADR-004**: Load rc.d/ Files En-Masse
- **ADR-001**: rc.d/ Directory for Core Functions

## Validation
```bash
# Check if tests pass
make test-bash

# If exit code is 0, tests passed
echo $?  # Should be 0

# Only then proceed with export
uv run python -m dotfile_manager export .config/bash/bashrc
```

## Agent Compliance
Agents MUST:
1. Read this ADR at session start
2. Follow the mandatory workflow
3. Never skip `make test-bash`
4. Never proceed with export if tests fail
5. Fix issues when tests fail, not skip testing
