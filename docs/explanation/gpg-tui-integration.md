# GPG Integration in TUI Environments

## The Problem

GPG signing is **mandatory** for all commits in this repository, but TUI (Terminal User Interface) environments present unique challenges:

### Core Issues

1. **Pinentry Blocking**: GPG pinentry programs expect interactive TTY access
2. **Agent Environment**: cursor-agent runs in non-interactive contexts
3. **SSH/Tmux Complexity**: Nested terminal environments break pinentry
4. **Mandatory Signing**: All commits must be GPG signed - no exceptions

### Why This Matters

- **Security**: GPG signing provides cryptographic proof of commit authorship
- **Integrity**: Signed commits cannot be tampered with
- **Compliance**: Many organizations require signed commits
- **Agent Workflows**: AI agents must be able to sign commits autonomously

## The TUI Challenge

### Traditional GPG Workflow
```
User → GPG Agent → Pinentry → User Input → Signed Data
```

### TUI Environment Reality
```
Agent → GPG Agent → Pinentry → ❌ BLOCKED (No TTY)
```

### Common Failure Modes

1. **Pinentry Hangs**: Process waits indefinitely for user input
2. **TTY Errors**: "not a tty" errors in tmux/SSH
3. **Agent Blocking**: cursor-agent becomes unresponsive
4. **Workflow Interruption**: Development stops due to signing failures

## The Solution Architecture

### Multi-Layer Approach

1. **Environment Detection**: Identify TUI vs GUI contexts
2. **Pinentry Selection**: Choose appropriate pinentry program
3. **Agent Integration**: cursor-agent GPG capability
4. **Fallback Mechanisms**: Recovery when primary methods fail

### Key Components

- **GPG Agent Configuration**: Optimized for TUI environments
- **Pinentry Programs**: TTY-compatible pinentry selection
- **Cursor-Agent Integration**: Seamless GPG operations
- **Recovery Tools**: Automated GPG agent recovery

## Implementation Philosophy

### Mandatory Signing
- **No Exceptions**: All commits must be GPG signed
- **No Workarounds**: Disabling signing is not acceptable
- **Agent Capability**: AI agents must sign commits

### TUI-First Design
- **Terminal Native**: Optimized for terminal environments
- **SSH Compatible**: Works over SSH connections
- **Tmux Friendly**: Functions in tmux sessions
- **Agent Ready**: Designed for automated workflows

### Recovery-Focused
- **Self-Healing**: Automatic GPG agent recovery
- **Diagnostic Tools**: Clear error messages and solutions
- **Fallback Options**: Multiple recovery strategies

## Success Criteria

### Functional Requirements
- ✅ GPG signing works in all TUI environments
- ✅ cursor-agent can sign commits autonomously
- ✅ No pinentry blocking or hanging
- ✅ Automatic recovery from GPG failures

### Non-Functional Requirements
- ✅ Fast signing operations (< 2 seconds)
- ✅ Reliable operation (99%+ success rate)
- ✅ Clear error messages and recovery guidance
- ✅ Minimal user intervention required

## Future Considerations

### Advanced Features
- **Hardware Token Support**: YubiKey integration
- **Multi-Key Management**: Multiple signing keys
- **CI/CD Integration**: Automated signing in pipelines
- **Key Rotation**: Automated key management

### Monitoring and Observability
- **Signing Metrics**: Success/failure rates
- **Performance Tracking**: Signing operation timing
- **Error Analytics**: Common failure patterns
- **Recovery Statistics**: Automatic vs manual recovery rates