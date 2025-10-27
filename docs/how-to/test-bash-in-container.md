# How To: Test Bash Configuration in OS-Matched Containers

## Overview

This guide explains how to test your bash configuration in a containerized environment that matches your host OS, with interactive tmux integration for exploratory testing.

## Features

- **OS Detection**: Automatically detects host OS and selects matching container image
- **Tmux Integration**: Creates horizontal split pane with interactive container session
- **Exploratory Tests**: Runs comprehensive tests to validate bash config
- **Interactive Shell**: Drops you into container shell for manual exploration
- **Edge Case Detection**: Tests unusual scenarios and boundary conditions

## Quick Start

### Prerequisites

1. **Tmux**: Must be running in a tmux session
2. **Podman**: Container runtime (`podman` command available)
3. **Host OS**: Supported OS (Debian, Ubuntu, Fedora, etc.)

### Run the Tests

```bash
# Start tmux (if not already in tmux)
tmux

# Run container tests (from within tmux)
cd ~/.config/dotfiles
make test-bash-container
```

## What It Does

### 1. OS Detection

The script automatically detects your host OS and version:

```bash
./scripts/detect-container-image.sh
```

**Supported Systems**:
- Debian (trixie, bookworm, bullseye)
- Ubuntu (24.04, 22.04, 20.04)
- Fedora (any version)
- CentOS/RHEL (Stream 9, etc.)
- Arch Linux
- Alpine Linux

### 2. Container Building

Builds a container using the `Containerfile` with your host OS as the base:

```bash
podman build --build-arg "BASE_IMAGE=debian:trixie" -t dotfiles-test:latest .
```

### 3. Tmux Split Creation

Creates a horizontal split in your current tmux window:

```
┌─────────────────────────────────────────┐
│                                         │
│   Original Pane (this script output)   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│   New Pane (container session)         │
│                                         │
└─────────────────────────────────────────┘
```

### 4. Exploratory Tests

Runs comprehensive tests in the container:

**Tests Include**:
1. ✅ Basic Environment Variables (`SHELL`, `HOME`, `USER`)
2. ✅ XDG Base Directory Variables
3. ✅ PATH Components (checks for `.local/bin`, `.cargo/bin`)
4. ✅ Core Functions (`has-cmd`, `@has-cmd`, `defined`, etc.)
5. ✅ Bashrc Variables (`BASHRC_DIR`, `DOTFILES_DIR`)
6. ✅ Alias Availability
7. ✅ Edge Cases (directory-independent resolution, non-interactive shells)
8. ✅ Agent Status (if `agentctl` available)

## Test Output Example

```
╔════════════════════════════════════════════════════════════════╗
║  BASH CONFIG EXPLORATORY TESTING IN CONTAINER                 ║
╚════════════════════════════════════════════════════════════════╝

━━━ 1. Basic Environment Variables ━━━
SHELL: /bin/bash
HOME: /home/unop
USER: unop
PWD: /home/unop

━━━ 2. XDG Base Directory Variables ━━━
XDG_CONFIG_HOME: /home/unop/.config
XDG_DATA_HOME: /home/unop/.local/share
XDG_STATE_HOME: /home/unop/.local/state
XDG_CACHE_HOME: /home/unop/.cache

━━━ 3. PATH Components ━━━
     1	/home/unop/.local/bin
     2	/usr/local/bin
     3	/usr/bin
     4	/bin

Checking for important paths:
✅ .local/bin in PATH
⚠️  .cargo/bin NOT in PATH (expected if cargo not installed)

━━━ 4. Core Functions Availability ━━━
✅ Function available: has-cmd
✅ Function available: @has-cmd
✅ Function available: defined
✅ Function available: @is-interactive
✅ Function available: dotfiles
✅ Function available: call-if-defined

━━━ 7. Edge Case Testing ━━━
Testing @has-cmd with ls: ✅ Works
Testing BASHRC_DIR from /tmp: ✅ Resolves correctly: /home/unop/.config/bash
Testing non-interactive shell behavior: ✅ Functions load in non-interactive

╔════════════════════════════════════════════════════════════════╗
║  EXPLORATORY TESTING COMPLETE                                  ║
║  You now have an interactive shell in the container.          ║
║  Try your own tests or type 'exit' to cleanup.               ║
╚════════════════════════════════════════════════════════════════╝
```

## Manual Exploration

After the automated tests complete, you have an interactive shell in the container. Try:

### Test Command Availability
```bash
@has-cmd bash
@has-cmd nonexistent  # Should return non-zero
```

### Test Function Behavior
```bash
type -t has-cmd        # Should show "function"
defined has-cmd        # Should succeed
@is-interactive        # Test interactive detection
```

### Test Directory Independence
```bash
cd /tmp
source ~/.bashrc
echo $BASHRC_DIR      # Should still resolve correctly
```

### Test Non-Interactive Mode
```bash
bash -c 'source ~/.bashrc && @has-cmd ls'
bash -c 'source ~/.bashrc && echo $XDG_CONFIG_HOME'
```

### Test Aliases
```bash
alias                  # List all aliases
alias e                # Should show editor alias
alias grep             # Should show color alias
```

## Edge Cases to Watch For

### 1. Shell Mode Detection
```bash
# Interactive vs non-interactive
bash -i -c 'source ~/.bashrc && type reload'   # Should exist
bash -c 'source ~/.bashrc && type reload'      # Should NOT exist
```

### 2. Directory Resolution
```bash
# BASHRC_DIR should resolve from any directory
cd /
bash -c 'source ~/.bashrc && echo $BASHRC_DIR'
```

### 3. PATH Contamination
```bash
# Check PATH doesn't have duplicates
echo $PATH | tr ':' '\n' | sort | uniq -d
```

### 4. Function Namespacing
```bash
# Functions with @ prefix should work
type @has-cmd          # Should exist
type @is-interactive   # Should exist
```

### 5. Alias Loading
```bash
# Interactive shells should have aliases
bash -i -c 'alias | wc -l'  # Should be > 50
bash -c 'alias | wc -l'     # Should be < 10
```

## Cleanup

### Exit Container Shell
```bash
exit  # or Ctrl-D
```

### Remove Container
```bash
podman rm -f dotfiles-bash-test-*
```

### List Running Containers
```bash
podman ps
```

## Troubleshooting

### "This script must be run inside a tmux session"
**Solution**: Start tmux first:
```bash
tmux
cd ~/.config/dotfiles
make test-bash-container
```

### "Container build failed"
**Check**:
1. Podman is installed: `which podman`
2. Containerfile exists: `ls -l Containerfile`
3. Build logs for specific errors

### "Failed to start container"
**Check**:
1. Podman service is running
2. No name conflicts: `podman ps -a | grep dotfiles`
3. Remove old containers: `podman rm -f dotfiles-bash-test-*`

### Tests Fail in Container
**Common Issues**:
1. **Missing dotfiles**: Check `.config/` was copied
2. **Symlink broken**: Check `ls -la ~/.bashrc`
3. **Permission issues**: Check `ls -la ~/.config/bash/`

## Advanced Usage

### Test on Different OS Image

Manually specify a different base image:

```bash
# Test on Ubuntu instead of your host OS
podman build --build-arg "BASE_IMAGE=ubuntu:22.04" -t dotfiles-test:latest .
podman run -it --rm dotfiles-test:latest bash
```

### Run Specific Tests

```bash
# Enter container and run custom tests
podman exec -it dotfiles-bash-test-XXX bash
/tmp/test-bash-config.sh
```

### Keep Container for Extended Testing

The container stays running until you:
1. Exit the shell
2. Run `podman rm -f <container-name>`

This allows multiple test sessions without rebuilding.

## Integration with CI/CD

This testing approach can be integrated into CI pipelines:

```yaml
# Example GitHub Actions
test-bash-containers:
  strategy:
    matrix:
      os: [debian:trixie, ubuntu:22.04, fedora:latest]
  steps:
    - name: Build container
      run: |
        podman build --build-arg "BASE_IMAGE=${{ matrix.os }}" \
          -t dotfiles-test:latest .
    - name: Run tests
      run: |
        podman run --rm dotfiles-test:latest \
          /tmp/test-bash-config.sh
```

## Related Documentation

- [Container/Podman Testing](../technical-reference/container-testing.md)
- [Shell Sourcing Tests](../explanation/shell-sourcing-model.md)
- [ADR-008: Goss Infrastructure Testing](../architecture/ADR-008-goss-infrastructure-testing.md)

## Files Involved

```
dotfiles/
├── Containerfile                              # Parameterized container definition
├── Makefile                                   # test-bash-container target
├── scripts/
│   ├── detect-container-image.sh             # OS detection
│   └── test-bash-in-container-tmux.sh        # Main test orchestrator
├── tests/
│   └── shell-sourcing/
│       ├── test-cleanroom-podman.sh          # Original cleanroom tests
│       └── test-simple-cleanroom.sh          # Simple tests
└── docs/
    └── how-to/
        └── test-bash-in-container.md         # This file
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-27 | Initial implementation with OS detection and tmux integration |
