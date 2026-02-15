# agentctl NPM Tools Management

## Overview

Direct top-level subcommands for NPM-based CLI tools that provide lightweight wrappers around `npm exec`. No global installation or `sudo` privileges required.

## Architecture

### Design Philosophy

- **Zero Setup**: Use `npm exec` for instant execution without installation
- **Fast Execution**: Use cached packages (no registry lookups for `start`)
- **User-Local**: No global installation, no sudo required
- **Minimal Overhead**: Direct subprocess execution, no wrapper scripts
- **Pass-Through Arguments**: Forward all additional arguments to the underlying tool
- **Flat Structure**: Tools as top-level commands for quick access

### Command Structure

```bash
agentctl <tool> <action> [args...]
agentctl copilot start [args...]              # Execute copilot (cached)
agentctl copilot upgrade [args...]            # Execute copilot@latest
agentctl pi start [args...]                   # Execute pi (cached)
agentctl pi upgrade [args...]                 # Execute pi@latest
agentctl gemini start [args...]               # Execute gemini (cached)
agentctl gemini upgrade [args...]             # Execute gemini@latest
```

## Available Tools

| Tool | Package | Command |
|------|---------|---------|
| **copilot** | `@github/copilot` | GitHub Copilot CLI |
| **pi** | `@mariozechner/pi-coding-agent` | Pi coding agent by Mario Zechner |
| **gemini** | `@google/gemini-cli` | Google Gemini CLI |

## Usage

### Start a Tool (Cached Version)

Fast execution using locally cached package (no npm registry lookup):

```bash
# Run copilot with cached version
agentctl copilot start

# Pass arguments through to the tool
agentctl copilot start --version
```

**What happens**: `npm exec @github/copilot [args...]`
- Uses locally cached `@github/copilot` if available
- Falls back to npm registry if not cached
- Fastest execution path

### Upgrade a Tool

Update to the latest version from npm registry:

```bash
# Upgrade pi to latest
agentctl pi upgrade

# Upgrade and pass arguments
agentctl pi upgrade --version
```

**What happens**: `npm exec @mariozechner/pi-coding-agent@latest [args...]`
- Fetches latest version from npm registry
- Executes the latest version
- Caches it for future use

### Show Available Actions for a Tool

```bash
# Show available actions (start, upgrade) for copilot
agentctl copilot

# Show all available top-level commands
agentctl -h
```

### Get Help from a Tool

```bash
# Get help from the tool itself (use start to get tool's help)
agentctl gemini start --help

# Show version
agentctl pi start --version
```

## Implementation Details

### NPMPackageManager Class

Located in `src/agent_management/agentctl.py`:

```python
class NPMPackageManager:
    """Manages NPM packages as CLI tools."""
    
    PACKAGES = {
        'copilot': {
            'package': '@github/copilot',
            'description': 'GitHub Copilot CLI'
        },
        'pi': {
            'package': '@mariozechner/pi-coding-agent',
            'description': 'Pi coding agent by Mario Zechner'
        },
        'gemini': {
            'package': '@google/gemini-cli',
            'description': 'Google Gemini CLI'
        }
    }
```

### Methods

- **`start(tool_name, args=None) -> int`**: Execute tool with cached version
- **`upgrade(tool_name, args=None) -> int`**: Execute tool at latest version
- **`_run_npm_exec(package, version, args) -> int`**: Internal helper to run npm exec

### Features

1. **Logging**: All commands logged to stderr for debugging
2. **Exit Codes**: Preserved from npm exec and underlying tools
3. **TTY Support**: Full stdin/stdout/stderr pass-through for interactive tools
4. **Timeouts**: No timeout on npm exec (allows long-running tools)
5. **Keyboard Interrupt**: Properly handles Ctrl+C (exit code 130)

## Performance Characteristics

### `start` Command (Cached)
- **First run**: ~500ms (npm registry check + download)
- **Subsequent runs**: ~100ms (local cache)
- **Network**: Only if package not in npm cache
- **Optimization**: No `@latest` lookup, uses local version

### `upgrade` Command (Latest)
- **Every run**: ~1-2s (npm registry lookup)
- **Network**: Always queries npm registry for latest
- **Use case**: Getting newest features/bug fixes

## Adding New Tools

To add a new NPM package tool:

1. Add entry to `NPMPackageManager.PACKAGES` in `agentctl.py`:
```python
'myapp': {
    'package': '@myorg/myapp',
    'description': 'My awesome CLI app'
}
```

2. Tool automatically available as:
```bash
agentctl myapp start
agentctl myapp upgrade
```

No other code changes needed!

## Error Handling

- **npm not found**: Exit code 127
- **Unknown tool**: Exit code 1
- **npm exec failure**: Returns npm's exit code
- **User interrupt (Ctrl+C)**: Exit code 130

## Integration with Shell

These tools integrate seamlessly with bash/zsh:

```bash
# Use in scripts
if agentctl pi start --version >/dev/null 2>&1; then
    echo "pi is available"
fi

# Capture output
version=$(agentctl copilot start --version)

# Chain operations
agentctl gemini start && echo "Success"
```

## Comparison with Global Installation

| Approach | Pros | Cons |
|----------|------|------|
| **agentctl <tool>** | No sudo, user-local, instant, no cleanup needed | Slight startup overhead (~100ms) |
| **npm install -g** | Pre-cached, no startup overhead | Requires sudo, shared globally, cleanup needed |
| **Manual npm exec** | Simple | No abstraction, must manage versions |

## Implementation References

- **Main Code**: `src/agent_management/agentctl.py`
- **Bash Integration**: `.config/bash/enabled/agentctl-integration.sh`
- **Architecture ADR**: `docs/architecture/ADR-012-unified-agent-management-agentctl.md`

## Future Enhancements

Potential improvements:

1. **Pre-warming**: Background cache update for latest versions
2. **Metrics**: Track execution times and cache hits
3. **Aliases**: Create shell aliases for shorter commands
4. **Configuration**: User-configurable tool registry
5. **Pinning**: Lock specific tool versions for reproducibility

## Troubleshooting

### Tool Fails Immediately

**Problem**: `agentctl copilot start` fails with "not found"

**Solution**: 
1. Check npm is installed: `npm --version`
2. Try upgrade to get latest: `agentctl copilot upgrade`
3. Check network connectivity

### Slow First Run

**Problem**: First execution of `agentctl pi start` takes long

**Solution**:
- This is normal on first run (npm fetching from registry)
- Subsequent runs use cache (~100ms)
- Pre-warming can be done with: `agentctl pi upgrade` once

### Wrong Version Running

**Problem**: `agentctl gemini start --version` shows old version

**Solution**:
- Use `upgrade` to get latest: `agentctl gemini upgrade --version`
- Or clear npm cache: `npm cache clean --force`

## Related Documentation

- [ADR-012: Unified Agent Management](../architecture/ADR-012-unified-agent-management-agentctl.md)
- [GPG Recovery Spec](./agentctl-gpg-recovery-spec.md)
- [Agent Integration](../../.config/bash/enabled/agentctl-integration.sh)
