# agentctl GPG Recovery - Technical Specification

## Overview

This document specifies the correct behavior for `agentctl gpg recover` and related GPG key management operations.

## Problem Statement

The current implementation of `agentctl gpg recover` does not accomplish its intended goal:

1. **Current behavior**: Only checks if GPG agent is responding and tests signing
2. **Missing functionality**: Does not actually unlock keys when passphrase is not cached
3. **Root cause**: Uses `--pinentry-mode loopback --batch` which fails when passphrase is not cached

### Error Message

```
gpg: Sorry, we are in batchmode - can't get input
```

This occurs because:
- `--batch` disables interactive input
- `--pinentry-mode loopback` expects passphrase on stdin
- No passphrase is provided on stdin
- GPG cannot prompt for passphrase → operation fails

## Semantic Definitions

### Key Terms

| Term | Definition | Purpose |
|------|------------|---------|
| **check** | Passive test to see if something is working | Diagnostic |
| **test** | Attempt an operation to verify capability | Verification |
| **unlock** | Trigger pinentry to cache passphrase | Active intervention |
| **recover** | Fix broken state by restarting/unlocking | Remediation |
| **restart** | Gracefully stop and start agent | Fresh start |

### Command Hierarchy

```
agentctl gpg recover         (Highest level - fix any issues)
    ├── check if agent responsive
    ├── test if keys unlocked
    ├── unlock keys if locked (trigger pinentry)
    └── restart agent if not responsive

agentctl gpg restart         (Force fresh start)
    ├── cleanup (graceful shutdown)
    └── init (start fresh)

agentctl gpg unlock          (Interactive passphrase caching)
    └── trigger pinentry to cache passphrase

agentctl gpg status          (Passive observation)
    └── report current state
```

## Behavioral Specification

### `agentctl gpg recover`

**Purpose**: Ensure GPG signing capability is available, taking whatever action is necessary.

**Decision Tree**:

```
START
  │
  ├─► Is GPG agent responding?
  │   ├── NO → restart_gpg_agent() → END
  │   └── YES ↓
  │
  ├─► Are keys unlocked (can sign)?
  │   ├── YES → SUCCESS: "GPG agent healthy, keys unlocked" → END
  │   └── NO ↓
  │
  ├─► Is TTY available?
  │   ├── YES → prompt_for_passphrase() → test_signing()
  │   │        ├── SUCCESS → END
  │   │        └── FAIL → restart_gpg_agent() → END
  │   │
  │   └── NO → FAIL: "Cannot unlock keys without TTY" → END
```

**Expected Behavior**:

| Initial State | Action Taken | Expected Result |
|---------------|--------------|-----------------|
| Agent not running | Start agent, prompt for passphrase | Agent running, keys unlocked |
| Agent running, keys cached | No action needed | Success immediately |
| Agent running, keys not cached | Prompt for passphrase | Keys unlocked after passphrase entry |
| Agent hung/unresponsive | Kill processes, restart agent | Agent restarted, prompt for passphrase |
| No TTY available | Report error | Fail with clear message |

### `agentctl gpg unlock`

**Purpose**: Interactively prompt for passphrase to cache keys.

**Requirements**:
- Must have TTY available (interactive context)
- Must trigger pinentry (not use loopback mode)
- Must allow user time to enter passphrase (60s timeout)
- Must use GPG_TTY environment variable

**Expected Behavior**:

```python
def unlock_gpg_agent(self) -> bool:
    """Trigger pinentry to cache GPG key passphrase."""

    # Ensure we have a TTY
    gpg_tty = os.environ.get('GPG_TTY')
    if not gpg_tty or gpg_tty == 'not a tty':
        self.logger.error("Cannot unlock keys: No TTY available")
        return False

    # Trigger pinentry by attempting a sign operation
    # Do NOT use --batch or --pinentry-mode loopback
    result = subprocess.run(
        ['gpg', '--sign', '--armor'],
        input=b'test\n',
        timeout=60,  # Allow time for passphrase entry
        env={**os.environ, 'GPG_TTY': gpg_tty}
    )

    return result.returncode == 0
```

### `agentctl gpg test-signing`

**Purpose**: Passively test if signing works (keys are cached).

**Expected Behavior**:

```python
def test_gpg_signing(self) -> bool:
    """Test if GPG signing works with cached passphrase."""

    # Use loopback mode for non-interactive test
    # This will ONLY succeed if passphrase is already cached
    result = subprocess.run(
        ['gpg', '--pinentry-mode', 'loopback', '--sign', '--batch', '--yes'],
        input=b'test\n',
        capture_output=True,
        timeout=10
    )

    return result.returncode == 0
```

## Success Criteria

### For `agentctl gpg recover`

1. ✅ **If agent is healthy and keys cached**: Returns success immediately (< 1s)
2. ✅ **If agent is healthy but keys not cached**: Prompts for passphrase, returns success after entry
3. ✅ **If agent not responding**: Restarts agent, prompts for passphrase, returns success
4. ✅ **If no TTY available**: Returns failure with clear error message
5. ✅ **Logging**: All actions logged to stderr, results to stdout
6. ✅ **Exit codes**: 0 for success, 1 for failure

### For `agentctl gpg unlock`

1. ✅ **Triggers pinentry**: User sees passphrase prompt
2. ✅ **Caches passphrase**: Subsequent signing operations don't require passphrase
3. ✅ **Respects GPG_TTY**: Uses correct TTY for pinentry
4. ✅ **Timeout handling**: Fails gracefully after 60s if no passphrase entered
5. ✅ **Error messages**: Clear feedback if unlock fails

## Test Scenarios

### Scenario 1: Keys Already Cached
```bash
# Given: GPG agent running, passphrase cached
# When: agentctl gpg recover
# Then: Returns success immediately without prompting
# Expected output: "✅ GPG agent recovered successfully"
# Expected duration: < 1 second
```

### Scenario 2: Keys Not Cached (Interactive)
```bash
# Given: GPG agent running, passphrase NOT cached, TTY available
# When: agentctl gpg recover
# Then: Prompts for passphrase, caches it, returns success
# Expected: Pinentry dialog appears, user enters passphrase
# Expected output: "✅ GPG agent recovered successfully"
```

### Scenario 3: Keys Not Cached (Non-interactive)
```bash
# Given: GPG agent running, passphrase NOT cached, NO TTY
# When: agentctl gpg recover
# Then: Returns failure with clear error
# Expected output: "❌ Failed to recover GPG agent: No TTY available"
# Expected exit code: 1
```

### Scenario 4: Agent Not Responding
```bash
# Given: GPG agent not responding or hung
# When: agentctl gpg recover
# Then: Restarts agent, prompts for passphrase, returns success
# Expected: Agent restarted, pinentry appears, success after passphrase entry
```

## Implementation Requirements

### Logging Strategy

**stdout**: User-facing results and shell export statements
```
✅ GPG agent recovered successfully
❌ Failed to recover GPG agent: No TTY available
```

**stderr**: Diagnostic logging (timestamps, debug info)
```
2025-10-27 10:14:07,896 - INFO - Recovering GPG agent
2025-10-27 10:14:07,896 - INFO - Initializing GPG agent
2025-10-27 10:14:07,915 - INFO - GPG agent running but keys locked, attempting unlock
```

**Critical**: stderr must NOT be redirected to stdout in bash wrapper (fixes `2>&1` bug)

### Environment Requirements

1. **GPG_TTY**: Must be set to actual TTY path (not "not a tty")
2. **XDG_RUNTIME_DIR**: For agent socket location
3. **HOME**: For GPG configuration
4. **PATH**: Must include gpg, gpg-agent, gpg-connect-agent

### Dependencies

- `gpg` (GnuPG) >= 2.2
- `gpg-agent` with pinentry support
- `pinentry-curses` or `pinentry-tty` for TUI environments
- Python >= 3.8

## Configuration Requirements

### gpg-agent.conf

```conf
# Required settings
allow-loopback-pinentry          # Allow batch operations
pinentry-program /usr/bin/pinentry-curses  # TUI pinentry
enable-ssh-support               # SSH agent integration
default-cache-ttl 86400          # 24 hour cache
max-cache-ttl 86400              # Maximum cache time
```

## Security Considerations

1. **Never log passphrases**: Ensure no passphrase data in logs
2. **Secure pinentry**: Use pinentry-curses/tty in terminal environments
3. **Cache timeout**: Respect configured cache timeouts
4. **Audit trail**: Log all unlock/recovery attempts for security monitoring

## Backwards Compatibility

### Breaking Changes

1. **unlock behavior**: Now triggers pinentry instead of failing silently
2. **recover behavior**: Now more aggressive (will prompt for passphrase)
3. **stderr/stdout**: Logging separated (bash wrapper fix)

### Migration Path

Existing users should:
1. Update `agentctl-integration.sh` to remove `2>&1` redirect
2. Ensure GPG_TTY is properly set in their shell
3. Update any automation that depends on old (broken) behavior

## References

- [GnuPG Manual - Agent Configuration](https://www.gnupg.org/documentation/manuals/gnupg/)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
- BDD Scenarios: `docs/tutorials/gpg-bdd-scenarios.md`
- Technical Reference: `docs/technical-reference/cursor-agent-gpg-integration.md`

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-27 | Initial specification based on bug analysis |
