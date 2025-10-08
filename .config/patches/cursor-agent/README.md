# Cursor Agent Bash Initialization Patch (Python-based)

This directory contains a robust Python-based patch system for fixing bash initialization issues in cursor-agent.

## Overview

The patch fixes bash initialization issues in cursor-agent by adding a `G8n+` prefix to ensure proper bash initialization before running commands. This prevents shell state issues that can occur when cursor-agent runs commands.

## Key Improvements over sed-based approach

- **Precise pattern matching**: Uses regex to find the exact bash initialization pattern
- **Safe operations**: No risk of corrupting JavaScript code
- **Robust error handling**: Comprehensive error checking and recovery
- **Better testing**: Includes basic functionality tests
- **Type safety**: Full Python type hints and validation

## Files

- `patch.py` - Main Python patch implementation
- `cursor-agent-patch.sh` - Shell wrapper script
- `pyproject.toml` - Python project configuration
- `README.md` - This documentation

## Usage

### Using the shell wrapper (recommended)
```bash
# Apply the patch
.config/patches/cursor-agent/cursor-agent-patch.sh apply

# Check status
.config/patches/cursor-agent/cursor-agent-patch.sh status

# Restore from backup
.config/patches/cursor-agent/cursor-agent-patch.sh restore
```

### Using Python directly
```bash
# Apply the patch
python3 .config/patches/cursor-agent/patch.py apply

# Check status
python3 .config/patches/cursor-agent/patch.py status

# Restore from backup
python3 .config/patches/cursor-agent/patch.py restore
```

### Using uv (if integrated)
```bash
# Install dependencies
uv sync

# Run the patch
uv run python -m patch apply
```

## Features

- **Automatic installation detection**: Finds all cursor-agent installations
- **Backup creation**: Creates backups before patching
- **Idempotent operations**: Safe to run multiple times
- **Comprehensive testing**: Basic functionality tests after patching
- **Color-coded output**: Clear status messages
- **Error recovery**: Graceful handling of failures

## Technical Details

### Pattern Matching

The patch uses a precise regex pattern to find the bash initialization code:

```python
pattern = r'let s=\["-O","extglob","-c",`snap=\$\(command cat <&3\) && builtin shopt -s extglob && builtin eval -- "\$snap" && \{ builtin export PWD="\$\(builtin pwd\)"; \$\{c\}; \}; COMMAND_EXIT_CODE=\$\?; dump_bash_state >&4; builtin exit \$COMMAND_EXIT_CODE`'
```

This pattern is much more specific than the previous sed approach and only matches the intended bash initialization code.

### Safety Features

- **Backup verification**: Ensures backups are created before patching
- **Pattern validation**: Verifies the exact pattern exists before patching
- **Patch verification**: Confirms the patch was applied correctly
- **File integrity**: Checks file readability and writability

## Integration

This patch system integrates with the existing dotfiles infrastructure:

- Uses the same command interface as the original patch
- Maintains compatibility with existing workflows
- Follows the established patch standards
- Integrates with uv and ruff for Python tooling

## Troubleshooting

### Common Issues

1. **Python not found**: Ensure python3 is installed and in PATH
2. **Permission denied**: Check file permissions on cursor-agent installations
3. **Pattern not found**: The cursor-agent version may have changed structure
4. **Backup failed**: Check disk space and file permissions

### Recovery

If the patch fails, the original file is automatically restored from backup. If no backup exists, the patch will not be applied.

## Development

### Running Tests

```bash
# Run ruff linting
uv run ruff check .config/patches/cursor-agent/

# Run ruff formatting
uv run ruff format .config/patches/cursor-agent/

# Test the patch script
python3 .config/patches/cursor-agent/patch.py status
```

### Adding New Features

1. Modify `patch.py` with new functionality
2. Update tests and documentation
3. Run linting and formatting
4. Test with real cursor-agent installations