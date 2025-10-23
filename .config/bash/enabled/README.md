# enabled/ - User-Facing Functions

## Purpose
This directory contains **user-facing functions** that are exported and available to the user's shell environment.

## Loading Order
Scripts in this directory are loaded **after** `lib/` functions, ensuring core utilities are available when these scripts run.

## File Types

### Agent Management Functions
- **`agent-bootstrap.sh`**: Agent status display
- **`agentctl-integration.sh`**: Unified agent management function
- **`ai-workflow-helpers.sh`**: Agent workflow commands (`next`, `agent-status`)

### Tool Functions
- **`aws.sh`**: AWS functions (`aws-login`, `aws-console`, `aws-whoami`)
- **`git.sh`**: Git functions (`gitignore`, `__my_git_ps1`)
- **`fzf.sh`**: FZF functions (`install-fzf`)
- **`gh.sh`**: GitHub CLI functions (`install-gh`, `suggest`, `explain`)

### Development Functions
- **`venv.sh`**: Python virtual environment functions (`mkvenv`, `activate`)
- **`rustup.sh`**: Rust functions (`gen-rustup-completions`)
- **`delta.sh`**: Delta functions (`test-delta`)
- **`npm.sh`**: Node.js functions (`npm-install`)

### Utility Functions
- **`loadenv.sh`**: Environment loading function
- **`vim.sh`**: Vim functions (`clear-swapfile`, `gvdiff`)

## Naming Convention
- **Tool scripts**: `toolname.sh` (e.g., `aws.sh`, `git.sh`)
- **Bootstrap scripts**: `toolname-bootstrap.sh` (e.g., `ssh-agent-bootstrap.sh`)
- **Fix/recovery scripts**: `fix-toolname.sh` (e.g., `fix-ssh-auth-sock.sh`)
- **Completion scripts**: `toolname-completion.bash.sh` (e.g., `git-flow-completion.bash.sh`)

## Script Requirements

### Interactive Check
Most scripts should include an interactive check:
```bash
# If not interactive, return
[[ ${-//[!i]/} ]] || return
```

### Function Export
If the script defines functions, export them:
```bash
export -f function_name
```

### Agent Context Headers
Include context headers for complex scripts:
```bash
# AGENT_CONTEXT: Brief description
# ARCHITECTURE: High-level pattern
# DESIGN_PATTERN: Specific conventions
```

## Common Patterns

### Tool Detection
```bash
if command -v toolname >/dev/null 2>&1; then
    # Tool-specific setup
fi
```

### Environment Setup
```bash
export TOOL_VAR="value"
export PATH="$HOME/.tool/bin:$PATH"
```

### Alias Definition
```bash
alias tool='tool --option'
```

## Agent Development Guidelines

### Adding New Scripts
1. **Check dependencies**: Ensure required lib functions are available
2. **Follow naming convention**: Use descriptive names with .sh extension
3. **Include interactive check**: Prevent non-interactive execution
4. **Test thoroughly**: Verify script works in various contexts
5. **Document purpose**: Add comments explaining what the script does

### Modifying Existing Scripts
1. **Preserve existing functionality**: Don't break existing features
2. **Test regression**: Ensure changes don't break other scripts
3. **Update documentation**: Keep comments and headers current
4. **Follow patterns**: Use established conventions

## Agent Context
**AGENT_CONTEXT**: Startup scripts that configure shell environment and tools
**ARCHITECTURE**: Plugin pattern - each script adds specific functionality
**DESIGN_PATTERN**: Single responsibility - each script handles one tool or feature