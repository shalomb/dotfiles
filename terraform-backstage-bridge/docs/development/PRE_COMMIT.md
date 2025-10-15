# Pre-commit Configuration Guide

## Overview

This project uses [pre-commit](https://pre-commit.com/) hooks to ensure code quality and prevent broken code from being committed. The pre-commit configuration automatically runs tests, linting, and other checks before each commit.

## Installation

### Quick Setup
```bash
make pre-commit-install
```

### Manual Setup
```bash
# Install pre-commit
pip install pre-commit
# or
uv add --dev pre-commit

# Install the hooks
pre-commit install
```

## Configured Hooks

The pre-commit configuration includes the following hooks that run before each commit:

### 🔍 **File Validation Hooks**
- **Trailing whitespace removal**: Cleans up trailing spaces
- **End-of-file fixer**: Ensures files end with a newline
- **YAML/TOML/JSON syntax check**: Validates configuration files
- **Large file check**: Prevents accidentally committing large files (>1MB)
- **Merge conflict markers**: Detects unresolved merge conflicts
- **Debug statements**: Catches leftover debugger imports

### 🐍 **Python Code Quality Hooks**
- **Ruff linting**: Fast Python linter with auto-fix
- **Ruff formatting**: Code formatting
- **MyPy type checking**: Static type analysis

### 🧪 **Testing Hooks**
- **Dependency check**: Verifies all required dependencies are installed
- **Core functionality test**: Quick test suite (28 tests, ~1s)
- **Basic test suite**: Full test suite without coverage (~3s)
- **Code linting**: Project-specific linting rules
- **Package build check**: Verifies the package can be built successfully

## Usage

### Automatic Execution
Pre-commit hooks run automatically when you commit:
```bash
git add .
git commit -m "Your commit message"
# Hooks will run automatically
```

### Manual Execution
```bash
# Run all hooks on all files
make pre-commit-run

# Run specific hook
pre-commit run <hook-id>

# Run only on staged files
pre-commit run
```

### Available Make Targets
- `make pre-commit-install` - Install and set up pre-commit hooks
- `make pre-commit-run` - Run all hooks on all files
- `make pre-commit-update` - Update hook versions

### Bypass Hooks (Not Recommended)
If you need to skip hooks in an emergency:
```bash
git commit --no-verify -m "Emergency commit"
```

## Hook Details

### Fast Hooks (< 2 seconds)
- File validation hooks
- Ruff linting/formatting
- Dependency check
- Core functionality test

### Slower Hooks (2-5 seconds)
- MyPy type checking
- Basic test suite
- Package build check

## Performance

The pre-commit configuration is optimized for speed:
- **Total runtime**: ~10-15 seconds for all hooks
- **Core tests**: Run without coverage for speed
- **Parallel execution**: Multiple hooks can run simultaneously
- **Incremental**: Only runs on changed files when possible

## Configuration

The configuration is in `.pre-commit-config.yaml`. Key settings:

```yaml
fail_fast: false          # Run all hooks even if one fails
default_stages: [pre-commit]  # Run on commit by default
exclude: |                # Skip these files/directories
  (?x)^(
    __pycache__/.*|
    \.pytest_cache/.*|
    dist/.*|
    \.coverage.*
  )$
```

## Troubleshooting

### Common Issues

**Hook fails with import errors**:
```bash
# Ensure dependencies are installed
make install-dev
```

**Python version mismatch**:
```bash
# Update pre-commit environments
pre-commit clean
pre-commit install --install-hooks
```

**Slow performance**:
```bash
# Clean pre-commit cache
pre-commit clean
```

### Debugging

View detailed hook output:
```bash
pre-commit run --verbose --all-files
```

Check pre-commit logs:
```bash
cat ~/.cache/pre-commit/pre-commit.log
```

## Integration with CI/CD

The same quality checks run in CI/CD pipelines. The pre-commit hooks ensure:
- No broken code reaches the repository
- Consistent code style across all commits
- Test coverage is maintained
- Build process works correctly

## Benefits

✅ **Prevent broken commits**: Catch issues before they reach the repository
✅ **Consistent code quality**: Automatic formatting and linting
✅ **Fast feedback**: Get immediate feedback on code changes
✅ **Reduced CI failures**: Many issues caught locally before CI runs
✅ **Team consistency**: Everyone follows the same quality standards

## Customization

To modify hooks, edit `.pre-commit-config.yaml`:

```yaml
# Add new hook
- id: custom-check
  name: Custom Check
  entry: ./scripts/custom-check.sh
  language: system
  pass_filenames: false
```

To add new make targets to pre-commit:

```yaml
- id: make-new-target
  name: New Target
  entry: make new-target
  language: system
  pass_filenames: false
  stages: [pre-commit]
```

After modifying the configuration:
```bash
pre-commit install --install-hooks
```
