# Cursor-Agent GPG Integration Technical Reference

## Overview

Technical specification for integrating GPG signing capabilities into cursor-agent workflows.

## Architecture

### Component Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cursor-Agent  │    │   GPG Agent     │    │   Pinentry     │
│                 │    │                 │    │   (TTY)         │
│  ┌─────────────┐│    │  ┌─────────────┐│    │  ┌─────────────┐│
│  │ Git Client  ││    │  │ Key Cache   ││    │  │ Passphrase  ││
│  │             ││    │  │             ││    │  │ Input       ││
│  └─────────────┘│    │  └─────────────┘│    │  └─────────────┘│
│  ┌─────────────┐│    │  ┌─────────────┐│    │                 │
│  │ GPG Client  ││◄──►│  │ Socket      ││    │                 │
│  │             ││    │  │ Interface   ││    │                 │
│  └─────────────┘│    │  └─────────────┘│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Commit Request**: cursor-agent initiates git commit
2. **GPG Signing**: Git triggers GPG signing via GPG agent
3. **Pinentry Interaction**: GPG agent requests passphrase via pinentry
4. **TTY Pinentry**: Pinentry program handles passphrase input
5. **Signed Commit**: GPG agent returns signed commit to git
6. **Completion**: cursor-agent receives signed commit

## Configuration Requirements

### Environment Variables

```bash
# Required for GPG TTY operations
export GPG_TTY=$(tty)

# GPG agent socket location
export GPG_AGENT_INFO

# Optional: GPG program path
export GPG_PROGRAM=gpg
```

### GPG Agent Configuration

```conf
# ~/.gnupg/gpg-agent.conf
enable-ssh-support
pinentry-program /usr/bin/pinentry-tty
default-cache-ttl 86400
default-cache-ttl-ssh 86400
max-cache-ttl 86400
max-cache-ttl-ssh 86400
```

### Git Configuration

```bash
# GPG signing configuration
git config --global user.signingkey 38495CCA2D2EF563
git config --global commit.gpgsign true
git config --global gpg.program gpg
```

## API Specification

### Cursor-Agent GPG Interface

#### `cursor-agent gpg-status`

**Purpose**: Check GPG agent status and signing capability

**Output**:
```json
{
  "status": "healthy|degraded|failed",
  "agent_running": true,
  "keys_loaded": ["38495CCA2D2EF563"],
  "pinentry_type": "tty",
  "signing_capable": true,
  "last_check": "2024-01-15T10:30:00Z"
}
```

#### `cursor-agent gpg-test-signing`

**Purpose**: Test GPG signing capability

**Output**:
```json
{
  "success": true,
  "signing_time_ms": 1500,
  "key_used": "38495CCA2D2EF563",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `cursor-agent gpg-recover`

**Purpose**: Trigger GPG agent recovery

**Output**:
```json
{
  "recovery_attempted": true,
  "recovery_successful": true,
  "actions_taken": [
    "killed_hanging_pinentry",
    "restarted_gpg_agent",
    "verified_signing_capability"
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Implementation Details

### GPG Agent Socket Communication

```python
import socket
import json

class GPGAgentClient:
    def __init__(self, socket_path=None):
        self.socket_path = socket_path or os.path.expanduser("~/.gnupg/S.gpg-agent")
    
    def send_command(self, command):
        """Send command to GPG agent via socket"""
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
            sock.connect(self.socket_path)
            sock.send(command.encode())
            response = sock.recv(4096).decode()
            return response
    
    def get_keyinfo(self):
        """Get information about loaded keys"""
        return self.send_command("KEYINFO --list")
    
    def test_signing(self):
        """Test signing capability"""
        return self.send_command("SIGKEY 38495CCA2D2EF563")
```

### Pinentry Management

```python
import subprocess
import os

class PinentryManager:
    def __init__(self):
        self.pinentry_program = "/usr/bin/pinentry-tty"
    
    def test_pinentry(self):
        """Test pinentry program functionality"""
        try:
            result = subprocess.run(
                [self.pinentry_program, "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            return False
    
    def kill_hanging_pinentry(self):
        """Kill hanging pinentry processes"""
        subprocess.run(["pkill", "-f", "pinentry"], check=False)
```

### GPG Agent Recovery

```python
import subprocess
import time

class GPGAgentRecovery:
    def __init__(self):
        self.gpg_agent_path = "gpg-agent"
        self.config_path = os.path.expanduser("~/.gnupg/gpg-agent.conf")
    
    def recover_agent(self):
        """Perform GPG agent recovery"""
        actions = []
        
        # Kill hanging processes
        self._kill_hanging_processes()
        actions.append("killed_hanging_processes")
        
        # Restart GPG agent
        self._restart_gpg_agent()
        actions.append("restarted_gpg_agent")
        
        # Verify functionality
        if self._verify_signing():
            actions.append("verified_signing_capability")
            return True, actions
        else:
            return False, actions
    
    def _kill_hanging_processes(self):
        """Kill hanging GPG and pinentry processes"""
        subprocess.run(["pkill", "-f", "gpg-agent"], check=False)
        subprocess.run(["pkill", "-f", "pinentry"], check=False)
        time.sleep(1)
    
    def _restart_gpg_agent(self):
        """Restart GPG agent with proper configuration"""
        subprocess.run([
            self.gpg_agent_path,
            "--daemon",
            "--enable-ssh-support"
        ], check=True)
        time.sleep(2)
    
    def _verify_signing(self):
        """Verify GPG signing capability"""
        try:
            result = subprocess.run([
                "gpg", "--sign", "--default-key", "38495CCA2D2EF563",
                "--output", "/dev/null", "/dev/null"
            ], capture_output=True, timeout=10)
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            return False
```

## Error Handling

### Common Error Scenarios

#### GPG Agent Not Running
```python
class GPGAgentError(Exception):
    pass

def handle_agent_not_running():
    """Handle GPG agent not running error"""
    try:
        # Attempt to start GPG agent
        subprocess.run(["gpg-agent", "--daemon"], check=True)
        return True
    except subprocess.CalledProcessError:
        raise GPGAgentError("Failed to start GPG agent")
```

#### Pinentry Blocking
```python
def handle_pinentry_blocking():
    """Handle pinentry blocking error"""
    # Kill hanging pinentry processes
    subprocess.run(["pkill", "-f", "pinentry"], check=False)
    
    # Restart GPG agent with TTY pinentry
    subprocess.run([
        "gpg-agent", "--daemon",
        "--pinentry-program", "/usr/bin/pinentry-tty"
    ], check=True)
```

#### Signing Timeout
```python
def handle_signing_timeout():
    """Handle GPG signing timeout"""
    # Implement timeout handling
    signal.alarm(10)  # 10 second timeout
    try:
        # Perform signing operation
        result = perform_signing()
        signal.alarm(0)  # Cancel timeout
        return result
    except TimeoutError:
        # Trigger recovery
        return trigger_recovery()
```

## Monitoring and Observability

### Metrics Collection

```python
class GPGMetrics:
    def __init__(self):
        self.signing_attempts = 0
        self.signing_successes = 0
        self.signing_failures = 0
        self.recovery_attempts = 0
        self.recovery_successes = 0
    
    def record_signing_attempt(self, success, duration_ms):
        """Record signing attempt metrics"""
        self.signing_attempts += 1
        if success:
            self.signing_successes += 1
        else:
            self.signing_failures += 1
        
        # Log metrics
        self._log_metrics({
            "event": "signing_attempt",
            "success": success,
            "duration_ms": duration_ms,
            "timestamp": time.time()
        })
    
    def record_recovery_attempt(self, success):
        """Record recovery attempt metrics"""
        self.recovery_attempts += 1
        if success:
            self.recovery_successes += 1
        
        # Log metrics
        self._log_metrics({
            "event": "recovery_attempt",
            "success": success,
            "timestamp": time.time()
        })
```

### Health Checks

```python
class GPGHealthCheck:
    def __init__(self):
        self.metrics = GPGMetrics()
    
    def perform_health_check(self):
        """Perform comprehensive GPG health check"""
        health_status = {
            "overall_status": "healthy",
            "components": {},
            "timestamp": time.time()
        }
        
        # Check GPG agent
        health_status["components"]["gpg_agent"] = self._check_gpg_agent()
        
        # Check pinentry
        health_status["components"]["pinentry"] = self._check_pinentry()
        
        # Check signing capability
        health_status["components"]["signing"] = self._check_signing()
        
        # Determine overall status
        if any(comp["status"] != "healthy" for comp in health_status["components"].values()):
            health_status["overall_status"] = "degraded"
        
        return health_status
```

## Security Considerations

### Key Management
- GPG keys should be stored securely
- Key passphrases should not be cached indefinitely
- Regular key rotation should be supported

### Agent Security
- GPG agent socket should have proper permissions
- Agent should only accept connections from authorized processes
- Agent should log all operations for audit purposes

### Pinentry Security
- Pinentry should use secure input methods
- Passphrase should not be logged or cached
- Pinentry should validate input before processing

## Performance Requirements

### Signing Performance
- Signing operations should complete within 2 seconds
- Agent should handle concurrent signing requests
- Key caching should minimize passphrase prompts

### Recovery Performance
- Recovery operations should complete within 5 seconds
- Recovery should not block other operations
- Recovery should be automatic and transparent

## Testing Requirements

### Unit Tests
- GPG agent communication
- Pinentry management
- Recovery mechanisms
- Error handling

### Integration Tests
- End-to-end signing workflow
- Multi-environment compatibility
- Performance under load
- Recovery scenarios

### Acceptance Tests
- BDD scenario validation
- User workflow testing
- Agent integration testing
- Monitoring and observability validation