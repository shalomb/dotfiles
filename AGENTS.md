# Dotfiles Repository - Agent Documentation

## 🚨 MANDATORY: Read Documentation First

**REQUIRED AT SESSION START**: Before making any changes, read:

1. **Architecture Decision Records**: `docs/architecture/ADR-*.md`
   - Core architectural decisions and patterns
   - Mandatory workflows and requirements
   - Non-negotiable standards

2. **Key Documentation**: `docs/README.md`
   - Documentation structure and organization
   - Where to find specific information
   - Diataxis framework navigation

3. **End-State**: `docs/explanation/end-state-evolution.md`
   - Current state and goals
   - Evolution and discovery process
   - Success criteria

**Why This Matters**: These documents prevent you from:
- Breaking established patterns
- Skipping mandatory validation steps
- Making decisions that have already been decided
- Repeating past mistakes

## Overview

This repository manages dotfiles using a **hardlink-based deployment system** that maintains configuration files in version control while keeping them actively used in the home directory. Changes to files in either location are immediately reflected in both places.

## Repository Structure

```
dotfiles/
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

**MANDATORY: Test Before Deploy** (See ADR-005)

```bash
# 1. Edit a configuration file
vim .config/bash/bashrc

# 2. REQUIRED: Run tests
make test-bash

# 3. ONLY IF TESTS PASS: Deploy ENTIRE bash directory
uv run python -m dotfile_manager export .config/bash/

# 4. Test in current shell
source ~/.bashrc

# 5. Commit changes
git add .config/bash/
git commit -m "bash: description of change"
```

**NO EXCEPTIONS**: 
- Never skip `make test-bash` for bash configuration changes
- **ALWAYS export the entire `.config/bash/` directory**, not individual files
- This ensures all bash components (bashrc, rc.d/, enabled/, disabled/) are synchronized

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

**Current (Python + uv):**
```bash
uv run python -m dotfile_manager export <files>
uv run python -m dotfile_manager import <files>
uv run python -m dotfile_manager status <files>
uv run python -m dotfile_manager diff <files>
uv run python -m dotfile_manager export <files> --backup  # Only if backup needed
```

### Key Features
- **Hard Links**: Files exist in both locations simultaneously
- **Selective Management**: Only manages files tracked by the repository
- **Safe Deployment**: Preserves unmanaged files in target directories
- **Force Mode**: Overwrites managed files when needed
- **Git-First Philosophy**: No automatic backups (git is source of truth)

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
- **All critical bugs fixed**: Python implementation resolves directory removal issues

### Planned Improvements
- **Python rewrite**: ✅ Modern, type-safe implementation (IN PROGRESS)
- **uv integration**: ✅ Full Python dependency management (COMPLETE)
- **Selective deployment**: ✅ Only touch managed files (COMPLETE)
- **Better error handling**: ✅ Robust error messages and recovery (COMPLETE)
- **Makefile integration**: `make install <target>` support (IN PROGRESS)

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

## Tmux Configuration Workflow

### Symlink Chain Architecture

The tmux configuration uses a **symlink chain** for proper dotfile management:

```
~/.tmux.conf → ~/.config/tmux.conf → ~/.config/dotfiles/.config/tmux.conf
```

**Source of truth**: `~/.config/dotfiles/.config/tmux.conf` (in repository)

### Development Workflow

#### 1. Making Changes
```bash
# Edit the tmux configuration in the repository
vim ~/.config/dotfiles/.config/tmux.conf

# Or edit directly (changes are immediately reflected)
vim ~/.config/tmux.conf
```

#### 2. Deploying Changes
```bash
# Deploy using the modern Python dotfile manager (RECOMMENDED)
cd ~/.config/dotfiles
uv run python -m dotfile_manager export .config/tmux.conf

# Or using make (when implemented)
make install TARGET=.config/tmux.conf

# Legacy method removed - use Python manager
```

#### 3. Reloading tmux Configuration
```bash
# Reload tmux configuration
tmux source-file ~/.tmux.conf

# Or use the reload popup (C-a r)
# This shows a visual confirmation popup
```

#### 4. Testing New Bindings
```bash
# Test that new bindings are active
tmux list-keys | grep "C-i"  # Check specific binding
tmux list-keys | grep "bind-key.*r"  # Check reload binding
```

### Key Bindings

- **`C-a r`**: Reload tmux configuration with visual popup
- **`C-a C-o`**: Project selection (tmuxie -s)
- **`C-a C-u`**: Session selection (tmuxie -l)  
- **`C-a C-i`**: Interactive mode (tmuxie -i)

### Troubleshooting

#### Binding Not Working
1. **Check if binding exists**: `tmux list-keys | grep "C-i"`
2. **Reload config**: `tmux source-file ~/.tmux.conf`
3. **Verify symlinks**: `ls -la ~/.tmux.conf ~/.config/tmux.conf`

#### Popup Not Showing
1. **Test popup directly**: `tmux display-popup -E -w 50% -h 30% "echo 'test'"`
2. **Check TERM variable**: Should not be `dumb` for popups
3. **Verify tmux version**: `tmux -V` (popups require tmux 3.2+)

#### Configuration Not Loading
1. **Check symlink chain**: `ls -la ~/.tmux.conf ~/.config/tmux.conf`
2. **Redeploy**: `uv run python -m dotfile_manager export .config/tmux.conf`
3. **Force reload**: `tmux source-file ~/.tmux.conf`

### Best Practices

1. **Always test bindings** after making changes
2. **Use the reload popup** (`C-a r`) for visual confirmation
3. **Keep symlink chain intact** - don't break the dotfile management
4. **Commit changes** to the repository after testing
5. **Document new bindings** in this file

## Core Development Principles

### **MANDATORY: Test Before Export (ADR-005)**

**REQUIREMENT**: Before ANY export of bash configuration files:

1. **Run `make test-bash`** - Always, no exceptions
2. **Wait for completion** - Don't skip this step
3. **Check results** - Tests must pass (exit code 0)
4. **ONLY if tests pass** - Proceed with export
5. **If tests fail** - Fix the issue, don't skip testing

**Files requiring bash testing:**
- `.config/bash/bashrc`
- `.config/bash/profile`
- `.config/bash/rc.d/*`
- `.config/bash/enabled/*`
- `.config/bash/aliases`

**Workflow:**
```bash
make test-bash                # MANDATORY first step
make test-bash && uv run python -m dotfile_manager export .config/bash/
```

**MANDATORY EXPORT PROTOCOL**:
- **ALWAYS export the entire `.config/bash/` directory** (not individual files)
- This ensures all bash components are synchronized: bashrc, rc.d/, enabled/, disabled/, aliases, profile
- Prevents issues where rc.d/ functions are missing in home directory

**NO EXCEPTIONS**: This is not optional. This is not a suggestion. This is a **REQUIREMENT**.

See `docs/architecture/ADR-005-mandatory-testing-before-export.md` for full details.

### **Use Correct Conventions, Processes, and Interfaces**

This is the **fundamental principle** for all development and testing in this repository. Always:

1. **Follow established workflows**: Use the documented processes for each component
2. **Use proper deployment tools**: Don't manually copy files - use the dotfile management system
3. **Respect the architecture**: Maintain symlink chains, hardlink systems, and submodule integrity
4. **Test through official interfaces**: Use the provided testing and validation tools
5. **Document changes**: Update documentation when adding new workflows or processes

### **Definition of Done: Test-Driven Development + Documentation**

**MANDATORY REQUIREMENT**: Every task MUST pass `make test` AND meet documentation standards before being marked complete. No exceptions.

**Testing Requirements:**
- **Test-First Development**: Run `make test` before starting any work
- **Continuous Validation**: Run `make test` after each significant change
- **Completion Gate**: `make test` must pass before marking any task as complete
- **Fast Feedback**: Tests must complete in < 30 seconds for rapid iteration
- **TUI Compatibility**: Tests must work in cursor-agent environment without breaking TUI

**Documentation Requirements:**
- **Diataxis Compliance**: All documentation must follow proper categorization (tutorials, how-to, reference, explanation)
- **Agent Context Headers**: Key configuration files must include AGENT_CONTEXT, ARCHITECTURE, DESIGN_PATTERN headers
- **Accurate Signposting**: READMEs must reflect actual content, not placeholders
- **Living Documentation**: Update docs when architecture or processes change
- **Reference Updates**: Fix all references when files are moved or restructured

**Process:**
1. **Before starting**: Run `make test` to establish baseline
2. **During development**: Run `make test` after each change
3. **Documentation check**: Ensure docs reflect changes and follow standards
4. **Before completion**: Run `make test` to validate final state
5. **Mark complete**: Only after `make test` passes AND documentation is updated

**Test Suite Requirements:**
- **Shellcheck validation**: All bash files must pass shellcheck
- **Functionality tests**: Core functions must work as expected
- **Architecture tests**: Symlink/hardlink integrity maintained
- **Performance tests**: Shell startup and function execution times

**Documentation Standards:**
- **Diataxis framework**: Proper categorization by user need
- **Agent context**: Prevent misunderstandings with clear headers
- **Accurate references**: All links and references must work
- **Consistency**: Follow established patterns and conventions
- **Regression tests**: Prevent breaking existing functionality

### **Component-Specific Workflows**

Each component has its own established workflow:

- **tmux**: Symlink chain → Python dotfile_manager → reload popup
- **nvim**: Submodule management → plugin updates → config reload
- **bash**: Profile management → shell reload → function testing
- **gum**: Go build → install → cache refresh → integration testing

**Never bypass these workflows** - they ensure consistency, reliability, and proper integration.

## Agent Integration

When working with this repository:

1. **Understand the hardlink system**: Files exist in both repo and home directory
2. **Use selective deployment**: Only deploy what you've changed
3. **Respect the submodule system**: Don't manually modify submodule directories
4. **Follow the Makefile patterns**: Use existing targets when possible
5. **Test deployments**: Run `make test` to verify functionality before committing
6. **Run integration tests**: Use `make test-integration` for comprehensive validation
7. **Follow component workflows**: Use the documented processes for each component
8. **Maintain architectural integrity**: Don't break symlink chains or hardlink systems

### **Agent Context Documentation**

**IMPORTANT**: All key configuration files include lightweight context documentation to prevent misunderstandings:

- **AGENT_CONTEXT**: Brief description of file purpose and key concepts
- **ARCHITECTURE**: High-level architectural patterns used  
- **DESIGN_PATTERN**: Specific design patterns or conventions

**Example:**
```bash
# AGENT_CONTEXT: dotfiles command with subcommands (enter, list, search, load)
# ARCHITECTURE: enabled/ -> symlinks -> rc.d/ or tools/
# DESIGN_PATTERN: Single command with subcommands, not separate functions
```

**Reference**: See `docs/technical-reference/agent-context-documentation.md` for full standards and examples.

### **Development Workflow Checklist**

Before making any changes:

- [ ] **Check current end-state** (read `docs/explanation/end-state-evolution.md`)
- [ ] **Assess current state** (discover what's working and what's not)
- [ ] **Recalculate plans** (update TODO.md based on current end-state)
- [ ] **Identify the component** (tmux, nvim, bash, gum, etc.)
- [ ] **Review the workflow** for that component
- [ ] **Use the correct tools** (dotfile_stash, make targets, etc.)
- [ ] **Test through official interfaces** (reload popups, validation commands)
- [ ] **Document any new processes** in this file
- [ ] **Update end-state docs** if making significant changes
- [ ] **Commit changes** after validation

### **Agent Workflow Commands**

- **`next`** - Quick refresh of AGENTS.md and get back on track (shows current status and next priority)
- **`agent-status`** - Comprehensive agent workflow status check

The repository is designed for **incremental updates** - you can deploy individual files or directories without affecting the entire system, but always through the proper channels.

## Commit Convention

**STRICT REQUIREMENT**: All commits MUST follow the component-based convention:

### **Format: `<component>: <description>`**

### **Components:**
- **`bash:`** - Bash configuration, scripts, and shell-related changes
- **`nvim:`** - Neovim configuration, plugins, and editor-related changes  
- **`tmux:`** - Tmux configuration, bindings, and session management
- **`git:`** - Git configuration, hooks, and repository-related changes
- **`vim:`** - Vim configuration and editor-related changes
- **`zsh:`** - Zsh configuration and shell-related changes
- **`fish:`** - Fish shell configuration and related changes
- **`alacritty:`** - Alacritty terminal configuration
- **`i3:`** - i3 window manager configuration
- **`rofi:`** - Rofi launcher configuration
- **`ranger:`** - Ranger file manager configuration
- **`fzf:`** - fzf fuzzy finder configuration
- **`gum:`** - Gum CLI tool configuration
- **`ghostship:`** - Ghostship prompt manager
- **`tmuxie:`** - Tmuxie session manager
- **`feat:`** - New features and functionality
- **`fix:`** - Bug fixes and corrections
- **`cleanup:`** - Code cleanup and refactoring
- **`deprecate:`** - Removing deprecated features
- **`loadenv:`** - Environment loading and variables
- **`docs:`** - Documentation updates
- **`test:`** - Testing-related changes
- **`make:`** - Makefile and build system changes
- **`python:`** - Python tools and scripts
- **`uv:`** - uv package manager configuration

### **Examples:**
```bash
bash: Use ghostship to manage PS1 if available
nvim: Add fzf integration for file selection
tmux: Disable visual-bell to stop annoying popups
test: Add comprehensive pytest-based acceptance testing framework
tmuxie: Resolve SSH attachment bug
cleanup: Remove deprecated tools and fix installer output
nvim: Remove markview plugin due to treesitter conflicts
loadenv: Source secrets/vars for current dir from pass vaults
```

### **Rules:**
1. **Always use lowercase** for component names
2. **Use descriptive descriptions** that explain what changed
3. **Keep descriptions concise** but informative
4. **Use present tense** for descriptions
5. **No action verbs** in the description (the component implies the action)

### **Prohibited Formats:**
- ❌ `Add debug output to troubleshoot file creation`
- ❌ `Update ob/tips script: add fzf integration`
- ❌ `Fix unbound variable error when no arguments provided`
- ❌ `Implement enabled/disabled directory system`

### **Required Format:**
- ✅ `ob: Add debug output to troubleshoot file creation`
- ✅ `ob: Add fzf integration and file creation`
- ✅ `ob: Fix unbound variable error when no arguments provided`
- ✅ `bash: Implement enabled/disabled directory system`

### **Atomic Commits Policy**
**MANDATORY REQUIREMENT**: All commits MUST be atomic and focused on a single concern.

#### **What Makes a Commit Atomic:**
- **Single Purpose**: Each commit addresses exactly one logical change
- **Complete Change**: The commit fully implements or fixes one specific thing
- **Self-Contained**: The commit can be understood, reviewed, and reverted independently
- **Minimal Scope**: Includes only the files necessary for that specific change

#### **Atomic Commit Examples:**
```bash
# ✅ GOOD: Single focused change
bash: Remove individual interactive checks from enabled scripts
test: Add comprehensive bash function loading tests
make: Integrate bash function loading tests

# ❌ BAD: Multiple concerns mixed together
bash: Fix interactive checks and add tests and update makefile
```

#### **When to Split Commits:**
- **Different Components**: Changes to bash, nvim, tmux, etc. should be separate
- **Different Concerns**: Bug fix vs feature addition vs cleanup
- **Different Files**: Changes to unrelated files should be separate
- **Different Purposes**: Implementation vs testing vs documentation

#### **Commit Splitting Workflow:**
```bash
# 1. Make all changes
git add .

# 2. Reset and commit atomically
git reset
git add .config/bash/enabled/agentctl-integration.sh
git commit -m "bash: Remove interactive check from agentctl script"

git add .config/bash/bashrc
git commit -m "bash: Centralize interactive logic in bashrc"

git add tests/bash-function-loading.sh
git commit -m "test: Add comprehensive bash function loading tests"
```

#### **Benefits of Atomic Commits:**
- **Clear History**: Each commit has a single, focused purpose
- **Easy Review**: Changes can be reviewed individually
- **Safe Rollback**: Can revert specific changes without affecting others
- **Better Debugging**: Can bisect to find which change caused issues
- **Cleaner Git Log**: Each commit message clearly describes what changed

#### **Anti-Patterns to Avoid:**
- ❌ **Massive Commits**: "Fix everything and add tests and update docs"
- ❌ **Mixed Concerns**: "Fix bug in bash and add nvim plugin"
- ❌ **Unrelated Changes**: "Update tmux config and fix typo in README"
- ❌ **Incomplete Changes**: "Start implementing feature" (without finishing)

## Agent Preferences

### **GPG Signing Policy**
**MANDATORY REQUIREMENT**: All commits MUST be GPG signed. No exceptions.

- **No unsigned commits**: Every commit must be cryptographically signed
- **Agent capability**: AI agents must be able to sign commits autonomously
- **TUI compatibility**: GPG signing must work in terminal environments (tmux, SSH, cursor-agent)
- **Recovery mechanisms**: Automatic GPG agent recovery when signing fails
- **Documentation**: Comprehensive GPG setup and troubleshooting documentation

**CRITICAL: GPG Configuration Modification Policy**
- **NO GPG CONFIG CHANGES**: If GPG key is locked/unavailable, agents MUST NOT modify `~/.gnupg/gpg.conf` or `~/.gnupg/gpg-agent.conf`
- **STOP AND REQUEST UNLOCK**: When GPG signing fails, agents must STOP all work and request the user to unlock the key
- **No workarounds**: Do not attempt to bypass GPG signing requirements or modify GPG configuration
- **User responsibility**: Only the user can unlock GPG keys - agents cannot and must not try

**CRITICAL: GPG Configuration Modification Policy**
- **NO GPG CONFIG CHANGES**: If GPG key is locked/unavailable, agents MUST NOT modify `~/.gnupg/gpg.conf` or `~/.gnupg/gpg-agent.conf`
- **STOP AND REQUEST UNLOCK**: When GPG signing fails, agents must STOP all work and request the user to unlock the key
- **No workarounds**: Do not attempt to bypass GPG signing requirements or modify GPG configuration
- **User responsibility**: Only the user can unlock GPG keys - agents cannot and must not try

### **Dotfile Manager Enforcement**
**MANDATORY REQUIREMENT**: All file deployments MUST use the dotfile manager. No exceptions.

- **No manual file operations**: Never use `cp`, `mv`, `rm` on managed files
- **Always use dotfile manager**: Use `uv run python -m dotfile_manager export <files>`
- **Consistency validation**: Pre-commit hooks validate hardlink integrity
- **Home directory sync**: Repository changes must be deployed via dotfile manager
- **Orphaned file detection**: Automated checks prevent broken hardlinks
- **Enforcement**: Commits are blocked if home directory is inconsistent

### **Discussion Format**
When user types "discuss" or requests analysis of complex topics, use this structured format:

## **Current State**
- [Bullet points describing what exists now]

## **Identified Issues** 
- [Bullet points describing problems or gaps]

## **Potential Solutions**
- [Bullet points describing possible approaches or improvements]

## **Yes/No Summary**
- [Clear recommendation with rationale]

This format ensures systematic analysis and actionable outcomes for complex technical discussions.

### **Script Naming Convention**
- **Executable scripts**: No `.sh` suffix (e.g., `gpg-agent-recover`, `ssh-retry`)
- **Sourceable scripts**: Use `.sh` suffix (e.g., `update_ssh_agent.sh`, `cursor.sh`)
- **Location**: Executable scripts go in `~/.local/bin/`, sourceable scripts in `.config/bash/tools/`

### **Manpage Format**
When presenting manpage-style documentation, use this compact inverted format:

```
# COMMAND(1)
- **-h, --help** - Help
- **-d, --debug** - Debug logging
- **-c, --config** - Config file (~/.config/command/config.toml)
```bash
command init bash
command prompt --status $? --cmd-duration $DURATION
command colors
```
## EXPLICATION
Shell command providing terminal functionality via letters/numbers.
## DESCRIPTION
- **version** - Show version
- **character/time** - Print timing info
- **completion** - Generate shell completions
- **colors** - Show color table
- **config** - Configure window shortcuts  
- **prompt** - Generate prompt with status
- **init** - Initialize shell integration
## COMMANDS
```
command [command] [flags]
command init [bash|zsh]
command prompt --status $? --cmd-duration $DURATION
```
## SYNOPSIS
command - shell command with window shortcuts
## NAME
```

**Key principles:**
- **Inverted order**: NAME → SYNOPSIS → COMMANDS → DESCRIPTION → EXPLICATION
- **No blank lines** after section headings
- **Compact format** with minimal vertical space
- **Consistent indentation** for readability
- **Include only essential sections**: NAME, SYNOPSIS, COMMANDS, DESCRIPTION, EXPLICATION