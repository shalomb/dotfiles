# Dotfiles Repository Snapshot - BEFORE (July 13, 2025)

## Overview
State of the repository approximately 3 months ago (commit `8c854ac`).

## Repository Structure

### Directory Layout
```
.config/bash/
├── aliases          # 294 lines, 54 alias definitions
├── bashrc           # Main bash configuration (119 lines)
├── profile          # Login shell configuration
├── core/            # 5 core scripts
│   ├── bootstrap-agents.sh
│   ├── completion.sh
│   ├── environment.sh
│   ├── history.sh
│   └── prompt.sh
├── rc.d/            # 78 files (functions, tools, completions)
│   ├── 01-functions
│   ├── 02-colours
│   ├── dotfiles
│   ├── loadenv
│   ├── prompt_command
│   ├── ps1
│   └── [72 tool-specific files]
├── tests/           # Test scripts
└── README

.local/bin/          # 2 local scripts
```

### Configuration Files
- **bashrc**: 119 lines, sources profile, aliases, completion
- **profile**: Login shell environment setup
- **aliases**: 54 alias definitions across 294 lines
- **dircolors**: Color configuration for ls

## Components Breakdown

### 1. Functions (153 total in rc.d/)

**Core Functions** (rc.d/01-functions):
- `@is-interactive()` - Check if shell is interactive
- `@has-cmd()` - Check if command exists
- `warn()` - Print warning messages
- `die()` - Print error and return
- `set-title()` - Set terminal title
- `chpwd()` - Called on directory change
- `bell-alert()` - Terminal bell with tmux integration
- `defined()` - Check if function/command is defined
- `call-if-defined()` - Call function if it exists
- `reload()` - Source configuration files

**Tool-Specific Functions** (in rc.d/):
- AWS: `aws-login`, `aws-sso`, `aws-sts-mfa-session`
- Git: `git-bar` (git repository browser)
- FZF: `fzf-utils` (fuzzy finding utilities)
- CD: Enhanced cd with history and bookmarks
- Kubectl: Kubernetes shortcuts
- Terraform: Terraform helpers
- And ~70 more tool-specific function collections

### 2. Aliases (54 definitions)

**Categories**:
- File operations: `ls`, `ll`, `la`, `grep`, `egrep`, `fgrep`
- Navigation: `..`, `...`, `....`, `cd-`, `back`
- Git shortcuts: `g`, `ga`, `gc`, `gd`, `gl`, `gp`
- System: `df`, `du`, `free`, `ps`
- Safety: `rm`, `cp`, `mv` (with confirmation)
- Clipboard: `pbcopy`, `pbpaste`
- Utilities: `calc`, `weather`, `myip`

### 3. Scripts

**Core Scripts** (.config/bash/core/):
- `bootstrap-agents.sh` - Initialize shell agents (ssh, gpg)
- `completion.sh` - Bash completion setup
- `environment.sh` - Environment variable configuration
- `history.sh` - History management
- `prompt.sh` - Prompt configuration

**Local Scripts** (.local/bin/):
- 2 user-specific scripts

### 4. Environment Variables

**Key Variables** (from bashrc):
- `FCEDIT` - Editor for fc command
- `IGNOREEOF` - Prevent Ctrl+D exit (5 times)
- `TIMEFORMAT` - Time command output format
- `screen_session` - Screen session info
- `CDPATH` - CD search path

**Shell Options**:
- `cdable_vars`, `cdspell`, `checkhash`, `checkwinsize`
- `cmdhist`, `extglob`, `histappend`, `histreedit`
- `no_empty_cmd_completion`, `sourcepath`, `progcomp`
- Vi mode enabled (`set -o vi`)

### 5. Configuration Management

**Sourcing Pattern**:
```bash
# bashrc sources:
1. ~/.config/profile
2. ~/.config/bash/completion
3. ~/.config/bash/aliases
4. Individual rc.d/ files (implicit via profile)
```

**Loading Mechanism**:
- `reload()` function for re-sourcing files
- `source()` wrapper with optional tracing (`TRACE_SOURCE`)
- Selective loading based on file type and readability

### 6. Tool Integration

**78 Tool Files in rc.d/**:
- **Cloud**: aws, gcloud, terraform, eksctl
- **Kubernetes**: kubectl, k9s, k3s, helm, kustomize, minikube
- **Languages**: python, go, cargo, npm, nvm, perl6, rbenv, rustup, rye, uv
- **Git**: git, gh, gitlab, git-bar, git-flow-completion
- **Utilities**: fzf, fd, bat, delta, jq, yq, tldr, cheat.sh
- **Editors**: vim, vimrc
- **System**: ssh, history, workspace, loadenv
- **Completion**: bash-completion, shuttle-completion, vpnd-completion

### 7. Deployment System

**Method**: Perl script `dotfile_stash`
- Export files from repo to home directory
- Import files from home directory to repo
- Status checking and diff comparison
- Hardlink-based deployment

## Architecture Characteristics

### Strengths
1. **Comprehensive**: 78 tool integrations covering wide range of use cases
2. **Organized**: Clear separation between core, tools, and configuration
3. **Flexible**: Reload function allows dynamic reconfiguration
4. **Integrated**: Tools work together (fzf, git, cd, etc.)

### Pain Points
1. **Monolithic**: All 78 rc.d/ files sourced on every shell startup
2. **No Lazy Loading**: All functions loaded whether used or not
3. **Namespace Pollution**: 153+ functions in every shell
4. **Slow Startup**: Loading 78 files takes time
5. **No Enable/Disable**: Can't selectively enable tools
6. **Organic Growth**: Some duplication and inconsistency

### Loading Model
- **All-or-nothing**: Every rc.d/ file loaded on startup
- **No categorization**: No distinction between essential and optional
- **No performance optimization**: No measurement or optimization
- **Manual management**: No automated tool discovery

## Statistics

| Category | Count |
|----------|-------|
| **Functions** | 153+ |
| **Aliases** | 54 |
| **rc.d/ Files** | 78 |
| **Core Scripts** | 5 |
| **Local Scripts** | 2 |
| **bashrc Lines** | 119 |
| **aliases Lines** | 294 |
| **Tool Integrations** | 78 |

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `.config/bash/bashrc` | Main configuration | 119 |
| `.config/bash/aliases` | Alias definitions | 294 |
| `.config/bash/rc.d/01-functions` | Core functions | ~50 |
| `.config/bash/rc.d/dotfiles` | Dotfiles management | Unknown |
| `.config/bash/core/environment.sh` | Environment setup | Unknown |
| `.config/bash/core/prompt.sh` | Prompt configuration | Unknown |

## Workflow

### Daily Usage
1. Open shell → All 78 rc.d/ files sourced
2. All 153+ functions available immediately
3. All 54 aliases active
4. Full tool integration ready

### Configuration Changes
1. Edit file in repo
2. Run `dotfile_stash export <file>`
3. Reload shell or source file
4. Test changes

### Adding New Tools
1. Create file in rc.d/
2. Add functions/aliases
3. Export to home directory
4. Automatically loaded on next shell

## Notes

- **Working State**: System was functional but had organic growth
- **Performance**: No measurement, but likely slow startup
- **Maintenance**: Manual, no automated tool management
- **Testing**: Minimal, mostly manual testing
- **Documentation**: Basic README, no comprehensive docs
