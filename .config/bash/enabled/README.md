# enabled/ - Bash Startup Scripts

## Purpose
This directory contains **startup scripts** that run during bash initialization to set up tools, environments, and functionality for the current shell session.

## Loading Order
Scripts in this directory are loaded **after** `lib/` functions, ensuring core utilities are available when these scripts run.

## File Types

### Tool Integration Scripts
- **`aws.sh`**: AWS CLI configuration and aliases
- **`git.sh`**: Git configuration and aliases
- **`kubectl.sh`**: Kubernetes CLI setup
- **`terraform.sh`**: Terraform configuration

### Agent Management Scripts
- **`ssh-agent-bootstrap.sh`**: SSH agent startup and management
- **`fix-ssh-auth-sock.sh`**: SSH socket recovery function
- **`fix-gpg-auth-sock.sh`**: GPG socket recovery function
- **`gpg-recovery.sh`**: GPG agent recovery tools

### Development Environment Scripts
- **`python.sh`**: Python environment setup
- **`go.sh`**: Go environment configuration
- **`rustup.sh`**: Rust toolchain setup
- **`nvm.sh`**: Node.js version management

### Shell Enhancement Scripts
- **`fzf.sh`**: Fuzzy finder integration
- **`ranger.sh`**: File manager configuration
- **`cursor.sh`**: Cursor editor integration with GPG pre-flight checks

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