# lib/ - Bash Library Functions and Tool Setup

## Purpose
This directory contains **library functions and tool setup** that are loaded during bash startup and provide reusable functionality for scripts in the `enabled/` directory.

## Loading Order
Files in this directory are loaded **first** during bash startup, before any `enabled/` scripts. This ensures core functions are available when enabled scripts run.

## File Naming Convention
- **Numbered files** (e.g., `00-path`, `01-functions`): Loaded in numerical order
- **Named files** (e.g., `agent-commands`, `bootstrap-agents`): Loaded alphabetically after numbered files

## Key Files

### Core Functions
- **`00-path`**: Sets up PATH environment variable
- **`01-functions`**: Core utility functions (`@has-cmd`, `@is-enabled`, etc.)
- **`02-colours`**: Color definitions and terminal styling

### Tool Setup
- **`cargo.sh`**: Rust tool setup (PATH, environment)
- **`coreutils.sh`**: Core utilities aliases
- **`history.sh`**: Bash history configuration
- **`tz.sh`**: Timezone environment variables

### Agent Management
- **`bootstrap-agents.sh`**: SSH and GPG agent bootstrap and discovery functions
- **`agent-commands`**: Agent-specific workflow commands (`next`, `agent-status`)

### Shell Features
- **`bash-completion`**: Bash completion setup
- **`ghostship`**: Ghostship prompt integration
- **`ps1`**: PS1 prompt configuration
- **`prompt_command`**: PROMPT_COMMAND setup

## Usage Guidelines

### For Library Functions
- **Export functions**: Use `export -f function_name` to make functions available to enabled scripts
- **No side effects**: Library functions should not modify global state unless explicitly intended
- **Documentation**: Include AGENT_CONTEXT headers for complex functions

### For Agent Development
- **Dependencies**: Check what functions are available before using them
- **Loading order**: Remember that lib loads before enabled/
- **Testing**: Test functions in isolation before integrating

## Example Usage
```bash
# In an enabled/ script
source "${BASHRC_DIR}/lib/bootstrap-agents.sh"
bootstrap_agents  # Function now available
```

## Agent Context
**AGENT_CONTEXT**: Library functions loaded first during bash startup
**ARCHITECTURE**: Dependency injection pattern - core functions loaded before dependent scripts
**DESIGN_PATTERN**: Pure functions with minimal side effects, exported for reuse