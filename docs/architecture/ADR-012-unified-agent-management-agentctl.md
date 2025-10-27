# ADR-012: Unified Agent Management - agentctl

## Status
Accepted

## Context

### Problem Statement

Managing SSH and GPG agents across multiple shell contexts (interactive, tmux, SSH, cursor-agent) is complex and error-prone:

1. **Fragmented Tools**: Separate commands for SSH agent (`ssh-add`, `ssh-agent`) and GPG agent (`gpg-agent`, `gpg-connect-agent`)
2. **Context Confusion**: Different behavior needed in different contexts (tmux vs interactive vs SSH)
3. **State Management**: No unified place to track agent state across shells
4. **Recovery Issues**: When agents fail, no clear recovery mechanism
5. **Shell Integration**: Need to share agent state across multiple shell sessions

### Previous Approaches

**Before agentctl**:
- Manual SSH agent management via shell scripts
- GPG agent started ad-hoc
- No state persistence
- No context detection
- Each shell session might start new agents → resource waste

**Inspiration**: macOS Keychain
- Unified management of credentials and agents
- Single source of truth for agent state
- Context-aware behavior
- Automatic recovery

## Decision

**Implement unified agent management system (`agentctl`) following keychain-inspired architecture.**

### Architecture Components

#### 1. Python Core (`src/agent_management/agentctl.py`)

**Rationale for Python**:
- Better subprocess handling than bash
- Structured logging
- JSON state management
- Cross-platform compatibility
- Easier testing

**Responsibilities**:
- Agent lifecycle (init, status, restart, recover, cleanup)
- State persistence (XDG compliant)
- Context detection
- Logging

#### 2. Bash Wrapper (`.config/bash/enabled/agentctl-integration.sh`)

**Responsibilities**:
- Shell environment integration
- Export shell variables (`eval` integration)
- Automatic initialization on shell startup
- Function availability in all shells

### Key Design Decisions

#### Decision 1: Stdout/Stderr Separation

**Choice**: Strictly separate stdout (results/exports) from stderr (logging)

**Rationale**:
- stdout: Shell export statements for `eval`, user-facing results
- stderr: Logging (timestamps, INFO/ERROR/WARNING)
- **Critical**: Never mix them with `2>&1` in bash wrapper
- Prevents bash from trying to eval log lines → "command not found" errors

**Implementation**:
```bash
# agentctl-integration.sh line 38
# Do NOT use 2>&1
if (cd "$dotfiles_dir" && uv run python -m agent_management.agentctl --shell "$@") > "$temp_file"; then
```

#### Decision 2: GPG Recovery Strategy

**Choice**: Multi-step recovery with TTY checking

**Decision Tree**:
```
1. Check if agent responding → restart if not
2. Check if keys unlocked → success if yes
3. Attempt unlock (trigger pinentry) → success if works
4. Restart as last resort
```

**Rationale**:
- Most operations don't need restart (keys already cached)
- TTY check prevents hanging in non-interactive contexts
- Pinentry approach allows passphrase caching
- Graceful degradation

**Anti-pattern (previous broken implementation)**:
```python
# DON'T: Using --pinentry-mode loopback --batch fails without cached passphrase
subprocess.run(['gpg', '--pinentry-mode', 'loopback', '--sign', '--batch', '--yes'])
# Result: "gpg: Sorry, we are in batchmode - can't get input"
```

**Correct approach**:
```python
# DO: Trigger actual pinentry
subprocess.run(['gpg', '--sign', '--armor'], timeout=60)
# Result: Pinentry appears, user enters passphrase, gets cached
```

#### Decision 3: XDG Base Directory Compliance

**Choice**: Store all state in XDG directories

**Mapping**:
- `$XDG_RUNTIME_DIR/agents/` - Transient state (sockets, PIDs)
- `$XDG_STATE_HOME/agents/` - Persistent state, logs
- `$XDG_CONFIG_HOME/agents/` - Configuration

**Rationale**:
- Standard compliance
- Proper cleanup on logout (runtime dir)
- Persistent state across sessions
- Clear separation of concerns

#### Decision 4: Context Detection

**Contexts**:
- `interactive` - Regular shell session
- `tmux` - Tmux session
- `ssh` - SSH connection
- `cursor-agent` - Claude Code / AI agent

**Implementation**:
```python
def detect_context(self) -> str:
    if os.environ.get('TMUX'):
        return 'tmux'
    if os.environ.get('SSH_CLIENT') or os.environ.get('SSH_TTY'):
        return 'ssh'
    # ... etc
```

**Rationale**:
- Different contexts need different behaviors
- Enables context-specific optimizations
- Debugging and monitoring

#### Decision 5: Semantic Command Hierarchy

**Defined Terms**:
| Command | Meaning | Active/Passive |
|---------|---------|----------------|
| `status` | Report current state | Passive |
| `check` | Test if working | Passive |
| `test` | Verify capability | Passive |
| `unlock` | Trigger pinentry to cache passphrase | Active |
| `recover` | Fix broken state (may unlock or restart) | Active |
| `restart` | Force fresh start | Active |

**Rationale**:
- Clear semantics prevent confusion
- Users know what each command will do
- Consistent with Unix philosophy

## Consequences

### Positive

1. **Unified Interface**: Single command for all agent operations
2. **Consistent Behavior**: Same commands work across contexts
3. **Better Debugging**: Centralized logging
4. **State Persistence**: Agents shared across shells
5. **Automatic Recovery**: Self-healing when agents fail
6. **XDG Compliance**: Follows Linux standards
7. **Testable**: Python allows comprehensive testing

### Negative

1. **Additional Dependency**: Requires Python and `uv`
2. **Complexity**: More code than simple shell scripts
3. **Learning Curve**: Users need to learn new commands
4. **Bootstrap Issue**: Need `uv` available before agentctl works

### Neutral

1. **Performance**: Slightly slower than pure bash (negligible)
2. **Portability**: Linux-focused (macOS/BSD may need adaptation)

## Implementation Details

### Command Structure

```bash
agentctl <global-command>               # init, status, restart, recover, cleanup, context, share
agentctl ssh <ssh-command>              # status, init, recover, keys, restart
agentctl gpg <gpg-command>              # status, init, recover, unlock, keys, restart
```

### State Files

**Runtime** (`$XDG_RUNTIME_DIR/agents/`):
- `ssh-agent.pid` - SSH agent PID
- `ssh-agent.sock` - SSH agent socket path
- `gpg-agent.sock` - GPG agent socket path

**State** (`$XDG_STATE_HOME/agents/`):
- `ssh-agent.json` - Persistent SSH agent info
- `gpg-agent.json` - Persistent GPG agent info
- `context.json` - Shell context information
- `logs/agent-manager.log` - Detailed logs

### Logging Strategy

**Format**:
```
%(asctime)s - %(levelname)s - %(message)s
```

**Destinations**:
- File: `$XDG_STATE_HOME/agents/logs/agent-manager.log`
- Stderr: For real-time visibility

**Important**: NEVER log to stdout (reserved for results/exports)

### Error Handling

1. **Timeouts**: All subprocess calls have timeouts (5-60s)
2. **Missing Commands**: Graceful fallback if `gpg`/`ssh-agent` not found
3. **No TTY**: Clear error messages when TTY required but unavailable
4. **Race Conditions**: Safe concurrent initialization

## Testing

### Test Levels

1. **Unit Tests** (`tests/test_agentctl_gpg_recovery.py`):
   - Python function behavior
   - Mocked subprocess calls
   - Error conditions

2. **Integration Tests** (`tests/test_agent_management.py`):
   - End-to-end workflows
   - XDG compliance
   - Context detection

3. **Bash Tests** (`tests/goss-bash-contexts.yaml`):
   - Function availability
   - Shell integration
   - Context behavior

### BDD Scenarios

Documented in `docs/tutorials/gpg-bdd-scenarios.md`:
- GPG recovery with cached keys
- GPG recovery without TTY
- GPG unlock interactive
- Agent restart
- Pinentry management

## Migration Guide

### From Manual Agent Management

**Before**:
```bash
eval $(ssh-agent -s)
ssh-add ~/.ssh/id_rsa
```

**After**:
```bash
agentctl init           # Starts both SSH and GPG agents
agentctl ssh keys       # List SSH keys
```

### Backward Compatibility

- Standard `$SSH_AUTH_SOCK` still works
- Standard `$GPG_AGENT_INFO` still works
- Can co-exist with manual agent management
- Gradual migration possible

## Security Considerations

1. **Passphrase Handling**:
   - Never log passphrases
   - Use GPG agent's cache mechanism
   - Respect configured cache timeouts

2. **Socket Permissions**:
   - Runtime directory is user-only (`700`)
   - Sockets inherit directory permissions

3. **State File Security**:
   - State files contain PIDs and paths (not secrets)
   - Standard user permissions

## Performance

**Benchmarks** (typical operations):
- `agentctl status`: ~100ms
- `agentctl init`: ~300ms (if agents need starting)
- `agentctl recover`: ~100ms (keys cached) to 60s (user enters passphrase)

**Optimization**:
- Caching in GPG/SSH agents (not in agentctl)
- Quick checks before expensive operations
- Parallel checks where possible

## Future Enhancements

Potential improvements (not in initial implementation):

1. **Web Interface**: Status dashboard for monitoring
2. **Notifications**: Desktop notifications for agent issues
3. **Metrics**: Prometheus-style metrics export
4. **Auto-recovery**: Automatic background recovery
5. **Multi-user**: Support for multiple users on same system

## References

- Technical Spec: `docs/technical-reference/agentctl-gpg-recovery-spec.md`
- BDD Scenarios: `docs/tutorials/gpg-bdd-scenarios.md`
- Implementation: `src/agent_management/agentctl.py`
- Bash Integration: `.config/bash/enabled/agentctl-integration.sh`
- XDG Spec: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html

## Related ADRs

- **ADR-007**: Bashrc restructuring (arrange-act-assert pattern)
- **ADR-009**: Centralize POSIX environment variables
- **ADR-011**: Fail-fast principle

## Validation

```bash
# Test the implementation
make test-bash
python -m pytest tests/test_agentctl_gpg_recovery.py -v

# Manual testing
agentctl status
agentctl gpg status
agentctl gpg recover
```

## Notes

### Bug Fix: Stdout/Stderr Separation

This ADR documents the fix for a critical bug discovered during implementation:

**Bug**: Bash wrapper redirected stderr to stdout (`2>&1`), causing log timestamps to be evaluated as bash commands.

**Symptom**:
```
bash: 2025-10-27: command not found
```

**Root Cause**: Logging format `2025-10-27 10:14:07,896 - INFO - ...` was being sent to stdout, then eval'd by bash wrapper.

**Fix**: Remove `2>&1` from bash wrapper (line 38), maintain strict stdout/stderr separation.

**Lesson**: When designing shell integration with subprocess output, respect Unix convention:
- stdout = data/results for programs
- stderr = diagnostics for humans

## Decision Date

2025-10-27

## Authors

- Shalom Bhooshi (with Claude Code assistance)
