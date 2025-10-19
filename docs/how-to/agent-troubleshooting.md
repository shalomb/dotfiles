# Agent Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting for SSH and GPG agent issues in the bash configuration system. It covers common problems, diagnostic steps, and recovery procedures.

## Quick Diagnostic Commands

### Check Agent Status
```bash
# SSH Agent
ssh-add -l

# GPG Agent
gpg-connect-agent 'keyinfo --list' /bye

# Combined status
show_agent_status
```

### Check Environment Variables
```bash
# SSH
echo "SSH_AUTH_SOCK: $SSH_AUTH_SOCK"
echo "SSH_AGENT_PID: $SSH_AGENT_PID"

# GPG
echo "GPG_AGENT_INFO: $GPG_AGENT_INFO"
echo "GPG_TTY: $GPG_TTY"
```

### Check Socket Files
```bash
# SSH sockets
ls -la /tmp/ssh-*

# GPG socket
ls -la /run/user/*/gnupg/S.gpg-agent
```

## Common Issues and Solutions

### SSH Agent Issues

#### No SSH Agent Running
**Symptoms:**
- `ssh-add -l` returns "Could not open a connection to your authentication agent"
- `SSH_AUTH_SOCK` is empty or points to non-existent socket

**Solutions:**
```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Or use bootstrap function
bootstrap_ssh_agent
```

#### Stale SSH Agent Socket
**Symptoms:**
- `SSH_AUTH_SOCK` points to non-existent socket
- `ssh-add -l` fails with connection error

**Solutions:**
```bash
# Use fix function
fix-ssh-auth-sock

# Or manually discover
discover_ssh_agents
```

#### SSH Keys Not Loaded
**Symptoms:**
- SSH agent running but `ssh-add -l` shows "The agent has no identities"
- Git operations fail with "Permission denied (publickey)"

**Solutions:**
```bash
# Add default key
ssh-add ~/.ssh/id_ed25519

# Add all keys
ssh-add

# List loaded keys
ssh-add -l
```

### GPG Agent Issues

#### No GPG Agent Running
**Symptoms:**
- `gpg-connect-agent 'keyinfo --list' /bye` fails
- `GPG_AGENT_INFO` is empty

**Solutions:**
```bash
# Start GPG agent
gpg-agent --daemon --enable-ssh-support

# Or use bootstrap function
bootstrap_gpg_agent
```

#### GPG Agent Unresponsive
**Symptoms:**
- `gpg-connect-agent` hangs or times out
- GPG operations fail with "No such file or directory"

**Solutions:**
```bash
# Kill existing agent
gpg-connect-agent /bye

# Restart agent
gpg-agent --daemon --enable-ssh-support

# Check agent status
gpg-connect-agent 'keyinfo --list' /bye
```

#### GPG Key Locked
**Symptoms:**
- GPG operations fail with "Operation cancelled"
- Signing tests fail

**Solutions:**
```bash
# Unlock key
gpg --sign --default-key YOUR_KEY < /dev/null

# Or use recovery function
gpg_recover
```

### Environment Variable Issues

#### Readonly Variable Conflicts
**Symptoms:**
- `bash: SSH_AGENT_INFO_FILE: readonly variable`
- `bash: GPG_AGENT_INFO_FILE: readonly variable`

**Solutions:**
```bash
# Check for duplicate declarations
grep -r "readonly.*SSH_AGENT_INFO_FILE" .config/bash/
grep -r "readonly.*GPG_AGENT_INFO_FILE" .config/bash/

# Fix: Use conditional declarations
[[ -z "${SSH_AGENT_INFO_FILE:-}" ]] && readonly SSH_AGENT_INFO_FILE="$HOME/.ssh/agent.info"
```

#### Missing Environment Variables
**Symptoms:**
- `GPG_TTY` is empty
- `SSH_AUTH_SOCK` is not set

**Solutions:**
```bash
# Set GPG_TTY
export GPG_TTY=$(tty)

# Use fix functions
fix-ssh-auth-sock
fix-gpg-auth-sock
```

### Interactive Shell Issues

#### Functions Return Early
**Symptoms:**
- Fix functions return immediately in non-interactive shells
- No output from bootstrap functions

**Solutions:**
```bash
# Use interactive shell for testing
bash -i -c 'source .config/bash/enabled/fix-ssh-auth-sock.sh && fix-ssh-auth-sock'

# Check if shell is interactive
[[ ${-//[!i]/} ]] && echo "Interactive" || echo "Non-interactive"
```

### Tmux Integration Issues

#### Agent Variables Not Passed
**Symptoms:**
- SSH/GPG operations fail in tmux sessions
- Environment variables not available in tmux

**Solutions:**
```bash
# Check tmux environment
tmux show-environment | grep -E "(SSH|GPG)"

# Update tmux environment
tmux set-environment SSH_AUTH_SOCK "$SSH_AUTH_SOCK"
tmux set-environment GPG_AGENT_INFO "$GPG_AGENT_INFO"
```

#### Socket Path Issues
**Symptoms:**
- Socket paths change between tmux sessions
- Hardcoded socket paths in tmux

**Solutions:**
```bash
# Use dynamic discovery
fix-ssh-auth-sock
fix-gpg-auth-sock

# Or update tmux configuration
tmux set-option -g update-environment "SSH_AUTH_SOCK GPG_AGENT_INFO"
```

## Diagnostic Procedures

### Step-by-Step SSH Debugging

1. **Check if SSH agent is running:**
   ```bash
   ps aux | grep ssh-agent
   ```

2. **Check socket files:**
   ```bash
   ls -la /tmp/ssh-*
   ```

3. **Test agent communication:**
   ```bash
   ssh-add -l
   ```

4. **Check environment variables:**
   ```bash
   echo "SSH_AUTH_SOCK: $SSH_AUTH_SOCK"
   echo "SSH_AGENT_PID: $SSH_AGENT_PID"
   ```

5. **Try manual discovery:**
   ```bash
   discover_ssh_agents
   ```

### Step-by-Step GPG Debugging

1. **Check if GPG agent is running:**
   ```bash
   ps aux | grep gpg-agent
   ```

2. **Check socket file:**
   ```bash
   ls -la /run/user/*/gnupg/S.gpg-agent
   ```

3. **Test agent communication:**
   ```bash
   gpg-connect-agent 'keyinfo --list' /bye
   ```

4. **Check environment variables:**
   ```bash
   echo "GPG_AGENT_INFO: $GPG_AGENT_INFO"
   echo "GPG_TTY: $GPG_TTY"
   ```

5. **Test signing:**
   ```bash
   echo 'test' | gpg --clearsign --default-key YOUR_KEY < /dev/null
   ```

## Recovery Procedures

### Complete Agent Reset

#### SSH Agent Reset
```bash
# Kill all SSH agents
pkill ssh-agent

# Clear environment variables
unset SSH_AUTH_SOCK SSH_AGENT_PID

# Start fresh agent
eval "$(ssh-agent -s)"

# Add keys
ssh-add ~/.ssh/id_ed25519
```

#### GPG Agent Reset
```bash
# Kill GPG agent
gpg-connect-agent /bye

# Clear environment variables
unset GPG_AGENT_INFO GPG_TTY

# Start fresh agent
gpg-agent --daemon --enable-ssh-support

# Set environment
export GPG_TTY=$(tty)
```

### Configuration Reset

#### Reset Bash Configuration
```bash
# Reload bash configuration
source ~/.bashrc

# Or restart shell
exec bash
```

#### Reset Git Configuration
```bash
# Check git config
git config --list | grep -E "(user\.|commit\.)"

# Reset signing configuration
git config --global --unset user.signingkey
git config --global --unset commit.gpgsign

# Reconfigure
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
```

## Prevention Strategies

### Regular Maintenance

#### Daily Checks
```bash
# Add to ~/.bashrc for automatic checks
show_agent_status
```

#### Weekly Maintenance
```bash
# Check agent health
ssh-add -l
gpg-connect-agent 'keyinfo --list' /bye

# Update agent info files
bootstrap_agents
```

### Configuration Validation

#### Pre-commit Hooks
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
if ! gpg-connect-agent 'keyinfo --list' /bye >/dev/null 2>&1; then
    echo "❌ GPG agent not available"
    exit 1
fi
```

#### Startup Validation
```bash
# Add to ~/.bashrc
if [[ ${-//[!i]/} ]]; then
    bootstrap_agents_with_prompts
fi
```

## Advanced Troubleshooting

### Network Issues

#### SSH Agent Forwarding
```bash
# Check SSH agent forwarding
ssh -O check user@host

# Enable agent forwarding
ssh -A user@host
```

#### GPG Agent Forwarding
```bash
# Check GPG agent forwarding
gpg-connect-agent 'keyinfo --list' /bye

# Enable agent forwarding in SSH
ssh -R /tmp/gpg-agent:/run/user/*/gnupg/S.gpg-agent user@host
```

### Performance Issues

#### Slow Agent Discovery
```bash
# Check socket discovery time
time discover_ssh_agents

# Optimize discovery
export SSH_AUTH_SOCK="/tmp/ssh-$(whoami)/agent.$(pgrep ssh-agent)"
```

#### Memory Usage
```bash
# Check agent memory usage
ps aux | grep -E "(ssh-agent|gpg-agent)"

# Monitor resource usage
top -p $(pgrep -d, -f "ssh-agent|gpg-agent")
```

## Getting Help

### Log Files

#### SSH Agent Logs
```bash
# Check SSH agent logs
journalctl -u ssh-agent

# Check SSH client logs
ssh -v user@host
```

#### GPG Agent Logs
```bash
# Check GPG agent logs
journalctl -u gpg-agent

# Check GPG debug output
gpg --debug-level 9 --sign < /dev/null
```

### Community Resources

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check the main bash configuration docs
- **Testing Guide**: Use the agent testing guide for validation

### Emergency Recovery

#### Complete System Reset
```bash
# Backup current configuration
cp -r ~/.config/bash ~/.config/bash.backup

# Reset to clean state
git checkout HEAD -- .config/bash/

# Reinstall
make install
```

## Conclusion

This troubleshooting guide covers the most common agent issues and their solutions. For persistent problems, check the logs, validate configuration, and consider a complete reset if necessary.

Remember to test changes in a safe environment and always backup your configuration before making major changes.