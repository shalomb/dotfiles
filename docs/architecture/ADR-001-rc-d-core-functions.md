# ADR-001: rc.d/ Directory for Core Functions

## Status
Accepted

## Context
The bash configuration has multiple directories with unclear purposes:
- `rc.d/` - Contains core system files
- `enabled/` - User tools (currently empty)
- `disabled/` - Available tools (74 files)
- `tools/` - Deleted (was causing chaos)

## Decision
**Keep `rc.d/` directory for core functions that tools require.**

### Rationale
- Core system functions (01-functions, 02-colours, etc.) are essential
- These functions are required by tools but not user-selectable
- Separating core from user tools provides clear architecture
- Tools can depend on core functions without circular dependencies

### Implementation
- `rc.d/` contains core system files loaded by bashrc
- Files like `01-functions`, `02-colours`, `dotfiles` stay in `rc.d/`
- Tools can source these core functions as needed
- No user tools go in `rc.d/`

## Consequences
- **Positive**: Clear separation between core and user tools
- **Positive**: Tools can depend on core functions
- **Positive**: Core functions are always available
- **Neutral**: `rc.d/` remains unchanged from current state

## Examples
```bash
# Core functions in rc.d/
rc.d/01-functions    # Essential bash functions
rc.d/02-colours      # Color definitions
rc.d/dotfiles        # Dotfile management functions

# Tools can source core functions
source ~/.config/bash/rc.d/01-functions
```