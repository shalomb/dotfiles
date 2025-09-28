# Dotfiles Repository - Agent Documentation

## Overview

This repository manages dotfiles using a **hardlink-based deployment system** that maintains configuration files in version control while keeping them actively used in the home directory. Changes to files in either location are immediately reflected in both places.

## Repository Structure

```
dotfiles/
├── dotfile_stash              # Legacy Perl deployment script (to be replaced)
├── Makefile                   # Build system and deployment orchestration
├── pyproject.toml            # Python project configuration (uv + ruff)
├── root/                     # System-wide configuration files
│   └── etc/                  # /etc/ configuration files
├── .config/                  # User configuration files
│   ├── submodules/           # Git submodules management
│   ├── nvim/                 # Neovim configuration
│   ├── tmux/                 # Tmux configuration
│   ├── bash/                 # Bash configuration
│   └── [other tools]/        # Various tool configurations
└── AGENTS.md                 # This documentation
```

## Core Workflows

### 1. Full System Installation

```bash
# Complete dotfiles setup
make install
```

**What this does:**
- Runs all INIT scripts (package installation)
- Initializes and updates git submodules
- Deploys all dotfiles via `refresh` target
- Sets up cron jobs

### 2. Individual File/Directory Deployment

```bash
# Deploy specific configuration using make
make install TARGET=.bashrc
make install TARGET=.config/nvim/
make install TARGET=.config/tmux/

# Or using the Python tool directly
uv run python -m dotfile_manager export .bashrc
uv run python -m dotfile_manager export .config/nvim/
```

### 3. Development Workflow

```bash
# Edit a configuration file
vim .bashrc

# Deploy just that file (planned)
uv run python -m dotfile_manager export .bashrc

# Or deploy entire directory
uv run python -m dotfile_manager export .config/nvim/
```

## Submodules Management

The repository uses git submodules for external dependencies:

### Current Submodules
- **tmux-plugins/tpm**: Tmux plugin manager
- **shalomb/octo**: Custom CLI tools (`cwds-list`, `projects-list`, `vim-fru`)
- **shalomb/fetch-me**: System information tool
- **lazy.nvim**: Neovim plugin manager (replaced deprecated packer.nvim)

### Submodule Operations

```bash
# Initialize submodules
make submodules
# or
.config/submodules/INIT

# Update all submodules to latest
.config/submodules/UPDATE
```

**Submodule Update Process:**
1. Updates all submodules to their main/master branch
2. Runs in parallel (16 processes) for speed
3. Fetches, checks out, and resets to origin
4. Shows final status

## Package Management

### APT Packages
```bash
make apt                    # Install all apt packages
make apt-clean             # Clean apt cache and unused packages
```

**Package Categories:**
- Core system packages
- Desktop environment packages
- Development tools
- Custom repositories (Docker, GitHub CLI, etc.)

### Language-Specific Tools

```bash
# Python tools
make python-tools
make python-cleanup

# Go tools  
make go-tools
make go-cleanup

# Rust tools
make rust-tools
make cargo-cleanup

# Node.js tools
make npm-tools
make npm-cleanup
```

## Configuration Management

### File Deployment System

**Current (Legacy Perl):**
```bash
./dotfile_stash export <files>    # Deploy files to home directory
./dotfile_stash import <files>   # Import files from home directory
./dotfile_stash status <files>   # Check git status
./dotfile_stash diff <files>     # Compare repo vs home
```

**Planned (Python + uv):**
```bash
uv run python -m dotfile_manager export <files>
uv run python -m dotfile_manager import <files>
uv run python -m dotfile_manager status <files>
uv run python -m dotfile_manager diff <files>
```

### Key Features
- **Hard Links**: Files exist in both locations simultaneously
- **Selective Management**: Only manages files tracked by the repository
- **Safe Deployment**: Preserves unmanaged files in target directories
- **Force Mode**: Overwrites managed files when needed

## Tool-Specific Configurations

### Neovim
```bash
make nvim                    # Setup Neovim with dependencies
make nvim-cleanup           # Clean Neovim caches and logs
make nvim-clear-locks       # Remove lock files
```

### Tmux
- Uses TPM (Tmux Plugin Manager) via submodule
- Configuration in `.config/tmux/`

### Bash
- Extensive bash configuration in `.config/bash/`
- Custom functions and aliases
- Profile management

## Maintenance Tasks

### System Cleanup
```bash
make clean                  # Clean all tool caches
make apt-clean             # Clean apt packages
make nvim-cleanup          # Clean Neovim
make cargo-cleanup         # Clean Rust
make go-cleanup            # Clean Go
make npm-cleanup           # Clean Node.js
make python-cleanup        # Clean Python
```

### Updates
```bash
make update                # Update all components
make submodules            # Update git submodules
```

## Development Notes

### Current Issues
- **dotfile_stash bug**: Removes entire target directories during export
- **Legacy Perl**: Script is old and needs modernization

### Planned Improvements
- **Python rewrite**: Modern, type-safe implementation
- **uv integration**: Full Python dependency management
- **Selective deployment**: Only touch managed files
- **Better error handling**: Robust error messages and recovery
- **Makefile integration**: `make install <target>` support

### File Management Philosophy
- **Hard links**: Maintain single file in both locations
- **Git tracking**: All changes visible in repository
- **Selective management**: Only manage explicitly tracked files
- **Safe operations**: Preserve unmanaged files and directories

## Troubleshooting

### Common Issues

1. **Hard link failures**: Repository must be on same filesystem as home directory
2. **Permission errors**: Some operations require sudo (apt packages, system configs)
3. **Submodule issues**: Run `make submodules` to reinitialize
4. **Cache problems**: Use appropriate cleanup targets

### Recovery Commands
```bash
# Reinitialize everything
make install

# Fix submodules
make submodules

# Clean and reinstall
make clean && make install
```

## Testing

### Behavioral Testing

The repository includes comprehensive behavioral tests that verify the actual functionality rather than implementation details:

```bash
# Run pytest-based behavioral tests
make test

# Run integration tests with real file operations
make test-integration
```

**Test Coverage:**
- **Single file export**: Verifies hard links are created correctly
- **Directory export**: Ensures unmanaged files are preserved (fixes the original bug)
- **Force mode**: Confirms existing files are overwritten when requested
- **Parent directory creation**: Tests that nested paths work correctly
- **Makefile integration**: Validates `make install TARGET=<file>` works
- **Import functionality**: Tests importing files from home to repo

**Key Test**: The most important test verifies that when exporting a directory, **unmanaged files in the target directory are preserved**. This was the critical bug in the original Perl script.

### Test Philosophy

Tests focus on **behavior** not **implementation**:
- ✅ Tests verify files are created in the right locations
- ✅ Tests verify content is correct
- ✅ Tests verify unmanaged files are preserved
- ✅ Tests verify hard links work correctly
- ❌ Tests don't care about internal function names or class structure

## Agent Integration

When working with this repository:

1. **Understand the hardlink system**: Files exist in both repo and home directory
2. **Use selective deployment**: Only deploy what you've changed
3. **Respect the submodule system**: Don't manually modify submodule directories
4. **Follow the Makefile patterns**: Use existing targets when possible
5. **Test deployments**: Run `make test` to verify functionality before committing
6. **Run integration tests**: Use `make test-integration` for comprehensive validation

The repository is designed for **incremental updates** - you can deploy individual files or directories without affecting the entire system.