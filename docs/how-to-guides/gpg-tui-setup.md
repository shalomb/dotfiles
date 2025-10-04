# How to Set Up GPG Signing in TUI Environments

## Problem Statement

You need GPG signing to work reliably in terminal environments (tmux, SSH, cursor-agent) where traditional pinentry programs fail.

## Solution Overview

Configure GPG agent with TUI-compatible pinentry and ensure cursor-agent integration.

## Prerequisites

- GPG key pair generated
- Terminal environment (tmux, SSH, or cursor-agent)
- Root access for system configuration

## Step-by-Step Setup

### 1. Identify Your GPG Key

```bash
# List your GPG keys
gpg --list-secret-keys --keyid-format=long

# Note the key ID (e.g., 38495CCA2D2EF563)
```

### 2. Configure Git for GPG Signing

```bash
# Set your GPG key
git config --global user.signingkey YOUR_KEY_ID

# Enable GPG signing for all commits
git config --global commit.gpgsign true

# Set GPG program
git config --global gpg.program gpg
```

### 3. Configure GPG Agent for TUI

```bash
# Edit GPG agent configuration
vim ~/.gnupg/gpg-agent.conf
```

Add these settings:

```conf
# GPG Agent Configuration for TUI Environments

# Enable SSH support
enable-ssh-support

# Use TTY-compatible pinentry
pinentry-program /usr/bin/pinentry-tty

# Cache settings for better performance
default-cache-ttl 86400
default-cache-ttl-ssh 86400
max-cache-ttl 86400
max-cache-ttl-ssh 86400

# Remove obsolete options
# use-standard-socket  # Remove this line
```

### 4. Install Required Pinentry Programs

```bash
# Install TTY-compatible pinentry
sudo apt install pinentry-tty

# Alternative: Install curses-based pinentry
sudo apt install pinentry-curses
```

### 5. Set Environment Variables

Add to your shell configuration (`~/.bashrc` or `~/.zshrc`):

```bash
# GPG TTY configuration
export GPG_TTY=$(tty)

# GPG agent socket
export GPG_AGENT_INFO
```

### 6. Restart GPG Agent

```bash
# Kill existing GPG agent
gpgconf --kill gpg-agent

# Start new GPG agent
gpg-agent --daemon --enable-ssh-support

# Verify agent is running
gpg-connect-agent 'keyinfo --list' /bye
```

### 7. Test GPG Signing

```bash
# Test GPG signing
echo "test" | gpg --clearsign --default-key YOUR_KEY_ID

# Test git commit signing
git commit --allow-empty -m "test: GPG signing verification"
```

## Troubleshooting

### Problem: Pinentry Hangs

**Symptoms**: GPG operations hang indefinitely, cursor-agent becomes unresponsive

**Solution**:
```bash
# Check pinentry program
gpg --version | grep pinentry

# Kill hanging processes
pkill -f pinentry
pkill -f gpg-agent

# Restart with TTY pinentry
gpgconf --kill gpg-agent
echo "pinentry-program /usr/bin/pinentry-tty" >> ~/.gnupg/gpg-agent.conf
gpg-agent --daemon --enable-ssh-support
```

### Problem: "not a tty" Errors

**Symptoms**: GPG fails with TTY-related errors

**Solution**:
```bash
# Ensure GPG_TTY is set
export GPG_TTY=$(tty)

# Add to shell configuration
echo 'export GPG_TTY=$(tty)' >> ~/.bashrc
```

### Problem: GPG Agent Not Starting

**Symptoms**: GPG operations fail with agent errors

**Solution**:
```bash
# Check agent status
gpg-connect-agent 'keyinfo --list' /bye

# Restart agent
gpgconf --kill gpg-agent
gpg-agent --daemon --enable-ssh-support

# Verify agent socket
ls -la ~/.gnupg/S.gpg-agent*
```

## Cursor-Agent Integration

### Configure Cursor-Agent for GPG

1. **Environment Setup**: Ensure GPG_TTY is available to cursor-agent
2. **Agent Permissions**: Grant cursor-agent access to GPG agent socket
3. **Testing**: Verify cursor-agent can sign commits

### Cursor-Agent GPG Test

```bash
# Test cursor-agent GPG capability
cursor-agent test-gpg-signing

# Expected output: GPG signing successful
```

## Validation Checklist

- [ ] GPG key configured in git
- [ ] GPG agent running with TTY pinentry
- [ ] GPG_TTY environment variable set
- [ ] Test commit signing works
- [ ] Cursor-agent can sign commits
- [ ] No pinentry hanging in tmux/SSH

## Advanced Configuration

### Multiple Pinentry Programs

Configure fallback pinentry programs:

```conf
# In gpg-agent.conf
pinentry-program /usr/bin/pinentry-tty
# fallback-pinentry-program /usr/bin/pinentry-curses
```

### Hardware Token Support

For YubiKey or other hardware tokens:

```bash
# Install hardware token support
sudo apt install scdaemon

# Configure for hardware tokens
echo "card-timeout 30" >> ~/.gnupg/scdaemon.conf
```

## Maintenance

### Regular Tasks

1. **Monitor GPG Agent**: Check agent status weekly
2. **Update Pinentry**: Keep pinentry programs updated
3. **Test Signing**: Verify signing works after system updates
4. **Cleanup**: Remove old GPG agent sockets if needed

### Monitoring Commands

```bash
# Check GPG agent status
gpg-connect-agent 'keyinfo --list' /bye

# Test signing performance
time echo "test" | gpg --clearsign

# Monitor agent processes
ps aux | grep gpg-agent
```