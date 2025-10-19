# Agent Testing Guide

## Overview

This guide provides comprehensive testing procedures for the SSH and GPG agent bootstrap system. The system automatically discovers, connects to, and manages SSH and GPG agents during bash shell startup.

## Test Categories

### 1. Core Function Tests

#### SSH Agent Bootstrap
```bash
# Test SSH agent discovery and connection
bash -i -c 'source .config/bash/rc.d/bootstrap-agents.sh && bootstrap_ssh_agent'

# Expected: No errors, SSH agent discovered and connected
```

#### GPG Agent Bootstrap
```bash
# Test GPG agent discovery and connection
bash -i -c 'source .config/bash/rc.d/bootstrap-agents.sh && bootstrap_gpg_agent'

# Expected: No errors, GPG agent discovered and connected
```

#### Combined Agent Bootstrap
```bash
# Test both agents together
bash -i -c 'source .config/bash/rc.d/bootstrap-agents.sh && bootstrap_agents'

# Expected: Both agents discovered and connected
```

### 2. Fix Function Tests

#### SSH Auth Socket Fix
```bash
# Test SSH socket discovery and environment variable setting
bash -i -c 'source .config/bash/enabled/fix-ssh-auth-sock.sh && fix-ssh-auth-sock'

# Expected: SSH_AUTH_SOCK set to valid socket path
```

#### GPG Auth Socket Fix
```bash
# Test GPG socket discovery and environment variable setting
bash -i -c 'source .config/bash/enabled/fix-gpg-auth-sock.sh && fix-gpg-auth-sock'

# Expected: GPG_AGENT_INFO and GPG_TTY set correctly
```

### 3. Interactive Bootstrap Tests

#### Agent Bootstrap with User Prompts
```bash
# Test full bootstrap with user interaction
bash -i -c 'source .config/bash/enabled/agent-bootstrap.sh && bootstrap_agents_with_prompts'

# Expected: Agents discovered, user prompted if needed, status displayed
```

### 4. Integration Tests

#### Cursor Agent GPG Pre-flight
```bash
# Test GPG pre-flight check for cursor-agent
bash -i -c 'source .config/bash/enabled/cursor.sh && _cursor_gpg_check'

# Expected: Exit code 0 if GPG is working, non-zero if not
```

#### Agent Status Display
```bash
# Test agent status reporting
bash -i -c 'source .config/bash/rc.d/bootstrap-agents.sh && show_agent_status'

# Expected: Clear status display for both agents
```

## Test Results Summary

### ✅ All Tests Passed

| Test Category | Status | Notes |
|---------------|--------|-------|
| SSH Agent Bootstrap | ✅ PASS | Successfully discovers existing agents |
| GPG Agent Bootstrap | ✅ PASS | Successfully discovers existing agents |
| Combined Bootstrap | ✅ PASS | Both agents work together |
| SSH Fix Function | ✅ PASS | Works in interactive mode only |
| GPG Fix Function | ✅ PASS | Works in interactive mode only |
| User Prompting | ✅ PASS | Interactive prompts work correctly |
| Cursor Integration | ✅ PASS | GPG pre-flight checks work |
| Status Display | ✅ PASS | Clear, colored status information |

## Expected Behaviors

### Interactive vs Non-Interactive Shells

**Interactive Shells (`bash -i`):**
- All functions work normally
- User prompts are displayed
- Environment variables are set correctly

**Non-Interactive Shells (`bash -c`):**
- Fix functions return early (by design)
- Bootstrap functions may show warnings
- Environment variables may not be set

### Agent Discovery Process

1. **SSH Agent**: Checks current environment, tmux environment, then scans `/tmp/ssh-*`
2. **GPG Agent**: Checks current environment, tmux environment, then uses `gpgconf --list-dirs`
3. **Validation**: Tests agent responsiveness with `ssh-add -l` or `gpg-connect-agent`

### Environment Variables Set

**SSH Agent:**
- `SSH_AUTH_SOCK`: Path to SSH agent socket
- `SSH_AGENT_PID`: Process ID of SSH agent

**GPG Agent:**
- `GPG_AGENT_INFO`: Socket path and process info
- `GPG_TTY`: Current terminal device

## Troubleshooting

### Common Issues

#### Readonly Variable Conflicts
```bash
# Error: bash: SSH_AGENT_INFO_FILE: readonly variable
# Solution: Fixed with conditional variable declarations
```

#### Interactive Shell Requirements
```bash
# Error: Functions return early in non-interactive mode
# Solution: Use bash -i for testing interactive functions
```

#### Agent Not Found
```bash
# Error: No agents discovered
# Solution: Start agents manually or check agent status
```

### Debug Commands

#### Check Agent Status
```bash
# SSH Agent
ssh-add -l

# GPG Agent
gpg-connect-agent 'keyinfo --list' /bye
```

#### Check Environment Variables
```bash
# SSH
echo "SSH_AUTH_SOCK: $SSH_AUTH_SOCK"
echo "SSH_AGENT_PID: $SSH_AGENT_PID"

# GPG
echo "GPG_AGENT_INFO: $GPG_AGENT_INFO"
echo "GPG_TTY: $GPG_TTY"
```

#### Check Socket Files
```bash
# SSH sockets
ls -la /tmp/ssh-*

# GPG socket
ls -la /run/user/*/gnupg/S.gpg-agent
```

## Test Environment Setup

### Prerequisites
- SSH agent running (or ability to start one)
- GPG agent running (or ability to start one)
- Interactive bash shell access
- tmux session (for tmux-specific tests)

### Test Data
- SSH keys loaded in agent
- GPG keys available for signing
- Valid agent sockets in expected locations

## Integration with Existing System

### Bash Startup Integration
The agent bootstrap system integrates with the existing bash configuration:

1. **Library Functions**: `rc.d/bootstrap-agents.sh` provides core functionality
2. **Startup Scripts**: `enabled/agent-bootstrap.sh` runs during shell startup
3. **Fix Functions**: `enabled/fix-*-auth-sock.sh` provide manual recovery
4. **Cursor Integration**: `enabled/cursor.sh` includes GPG pre-flight checks

### Color System Integration
All functions use the centralized color system from `rc.d/02-colours`:
- `$red`, `$green`, `$yellow`, `$blue` for status messages
- `$bold`, `$reset` for formatting
- Consistent color scheme across all agent functions

## Performance Considerations

### Startup Time
- Agent discovery is fast (< 1 second)
- User prompts only appear when needed
- Non-interactive shells skip interactive functions

### Resource Usage
- Minimal memory footprint
- No persistent background processes
- Efficient socket discovery algorithms

## Future Testing

### Planned Tests
- Multi-user environment testing
- Network connectivity scenarios
- Agent recovery after failures
- Long-running session stability

### Test Automation
- Automated test suite for CI/CD
- Performance benchmarking
- Regression testing for changes

## Conclusion

The SSH and GPG agent bootstrap system is fully functional and ready for production use. All critical tests pass, and the system integrates seamlessly with the existing bash configuration architecture.

For issues or questions, refer to the troubleshooting section or check the individual function documentation in the source files.