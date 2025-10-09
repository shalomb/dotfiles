# ADR-004: Load rc.d/ Files En-Masse

## Status
Accepted

## Context
The bashrc was individually sourcing rc.d/ files:
- `source ~/.config/bash/rc.d/01-functions`
- `source ~/.config/bash/rc.d/02-colours`
- Missing `dotfiles` function because it wasn't explicitly listed

This approach:
- Requires updating bashrc for every new rc.d/ file
- Easy to forget files (e.g., dotfiles function)
- Inconsistent with how enabled/ directory works
- Violates DRY principle

## Decision
**Load all files from rc.d/ directory using a loop, matching the pattern used for enabled/ directory.**

### Implementation
```bash
# Get the directory containing this bashrc file
BASHRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load all core functions from rc.d directory
# These must be loaded FIRST as enabled/ tools depend on them
if [[ -d "${BASHRC_DIR}/rc.d" ]]; then
    for script in "${BASHRC_DIR}"/rc.d/*; do
        if [[ -f "$script" && -r "$script" ]]; then
            source "$script"
        fi
    done
else
    [[ -n "$DOTFILES_DEBUG" ]] && echo "debug: rc.d directory missing" >&2
fi
```

### Rationale
- **Automatic discovery**: New rc.d/ files are loaded automatically
- **Consistent pattern**: Same as enabled/ directory loading
- **Relative paths**: Uses BASH_SOURCE to find files relative to bashrc
- **Dependency order**: rc.d/ loaded before enabled/ (tools depend on core)
- **Testable**: Can test in repo without affecting home directory

## Loading Order
1. **rc.d/**: Core functions (01-functions, 02-colours, dotfiles, etc.)
2. **enabled/**: User tools (depend on rc.d/ functions like @has-cmd)
3. **aliases**: Command aliases
4. **bash-completion**: Tab completion

This order ensures:
- Core functions available before tools load
- Tools can use @has-cmd, @is-interactive, etc.
- No circular dependencies

## Benefits

### Maintenance
- **No manual updates**: Add files to rc.d/, they load automatically
- **No missed files**: Everything in rc.d/ is loaded
- **Clear pattern**: Same as enabled/ directory

### Testing
- **Relative paths**: Test changes in repo before deploying
- **Isolation**: BASHRC_DIR allows testing without affecting home
- **Validation**: `make test-bash` verifies loading behavior

### Architecture
- **Consistent**: Same pattern for rc.d/ and enabled/
- **Explicit**: BASHRC_DIR makes path resolution clear
- **Flexible**: Easy to add new core functions

## Consequences

### Positive
- **Automatic loading**: New rc.d/ files work immediately
- **No forgotten files**: dotfiles function now loads correctly
- **Consistent patterns**: rc.d/ and enabled/ use same approach
- **Testable**: Can validate changes before deployment

### Neutral
- **Load order**: Files load in filesystem order (not necessarily alphabetical)
- **All files loaded**: Can't selectively disable rc.d/ files (use enabled/ for that)

### Negative
- **Potential conflicts**: Bad rc.d/ file breaks entire loading
- **Less explicit**: Not immediately obvious which files are loaded

## Migration

### Before
```bash
if [[ -f ~/.config/bash/rc.d/01-functions ]]; then
    source ~/.config/bash/rc.d/01-functions
fi

if [[ -f ~/.config/bash/rc.d/02-colours ]]; then
    source ~/.config/bash/rc.d/02-colours
fi

# dotfiles function was missing!
```

### After
```bash
BASHRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -d "${BASHRC_DIR}/rc.d" ]]; then
    for script in "${BASHRC_DIR}"/rc.d/*; do
        if [[ -f "$script" && -r "$script" ]]; then
            source "$script"
        fi
    done
fi

# dotfiles function now loads automatically!
```

## Related ADRs
- **ADR-001**: rc.d/ Directory for Core Functions
- **ADR-002**: enabled/ Directory Uses File Movement
- **ADR-003**: Bash Testing Workflow with make test-bash

## Testing
```bash
# Validate behavioral changes
make test-bash

# Deploy to home directory
uv run python -m dotfile_manager export .config/bash/bashrc

# Test in current shell
source ~/.bashrc
type dotfiles  # Should now be available
```
