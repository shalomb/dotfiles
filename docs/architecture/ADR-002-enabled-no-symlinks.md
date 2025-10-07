# ADR-002: enabled/ Directory Uses File Movement, Not Symlinks

## Status
Accepted

## Context
The current architecture has confusion about how tools are enabled:
- `enabled/` directory is empty
- `disabled/` contains 74 tools
- Previous attempts used symlinks which caused chaos
- Need clear mechanism for enabling/disabling tools

## Decision
**Enabling tools is done by moving files from `disabled/` to `enabled/` directory. No symlinks.**

### Rationale
- **File movement is explicit** - Clear what's enabled vs disabled
- **No symlink chaos** - Eliminates broken symlink issues
- **Simple mental model** - Move file = enable, move back = disable
- **Consistent with hardlink system** - Aligns with dotfile manager approach
- **Atomic operations** - File either exists in enabled/ or disabled/, not both

### Implementation
```bash
# Enable a tool
mv disabled/aws.sh enabled/aws.sh

# Disable a tool  
mv enabled/aws.sh disabled/aws.sh

# Check what's enabled
ls enabled/

# Check what's available
ls disabled/
```

### File Management
- **enabled/** - Contains actual files (not symlinks)
- **disabled/** - Contains actual files (not symlinks)
- **Dotfile manager** - Manages hardlinks between repo and home directory
- **No symlinks** - Anywhere in the system

## Consequences
- **Positive**: Clear enable/disable mechanism
- **Positive**: No symlink maintenance issues
- **Positive**: Simple to understand and debug
- **Positive**: Aligns with hardlink dotfile management
- **Neutral**: Requires file movement instead of symlink creation

## Examples
```bash
# Enable essential tools
mv disabled/cd.sh enabled/cd.sh
mv disabled/aws.sh enabled/aws.sh
mv disabled/fzf-utils.sh enabled/fzf-utils.sh

# Deploy changes
uv run python -m dotfile_manager export .config/bash/enabled/
```