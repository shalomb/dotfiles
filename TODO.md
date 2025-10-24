# 🎯 **CURRENT PRIORITY: Bashrc Interactive/Login Shell Refactoring**

## 📋 **TODO: Simplify bashrc interactive shell detection**

### **Current Issues**
- **Complex INTERACTIVE_MODE variable**: Fragile detection logic using `$-` flags
- **Scattered conditional checks**: Every interactive feature needs `if [[ $INTERACTIVE_MODE -eq 1 ]]`
- **Tmux context failures**: Interactive detection fails in tmux panes (reload function missing)
- **Over-engineered approach**: Maintaining state variable instead of simple early return

### **Proposed Solution: Clean Universal/Interactive Split**

**Architecture:**
```bash
#!/bin/bash
# bashrc - Clean bash initialization

# =============================================================================
# UNIVERSAL SECTION (Always runs - all shell types)
# =============================================================================

# Environment setup (only if not from login shell)
if [[ -z "$BASH_PROFILE_SOURCED" ]]; then
    export PATH="$HOME/.local/bin:$PATH"
    # Basic environment for non-login shells
fi

# Core functions that work everywhere
has-cmd() { command -v "$1" >/dev/null 2>&1; }
defined() { declare -F "$1" >/dev/null; }

# Essential variables
export DOTFILES_ROOT="$HOME/.config/dotfiles"

# =============================================================================
# INTERACTIVE-ONLY SECTION (Everything below here is interactive-only)
# =============================================================================

# Simple, bulletproof check - exit early if not interactive
# Allow SSH contexts to continue (they may become interactive)
[[ $- != *i* ]] && [[ -z "$SSH_CLIENT" ]] && [[ -z "$SSH_TTY" ]] && return

# Everything below runs ONLY in interactive shells
# No more INTERACTIVE_MODE checks needed!

# Load aliases
[[ -f "$BASHRC_DIR/aliases" ]] && source "$BASHRC_DIR/aliases"

# Load enabled scripts
for script in "$BASHRC_DIR"/enabled/*.sh; do
    [[ -f "$script" ]] && source "$script"
done

# Define interactive functions
reload() {
    echo "🔄 Reloading bashrc..."
    source ~/.bashrc
}
```

### **Benefits**
1. **Simpler**: One check instead of scattered conditionals
2. **Bulletproof**: `[[ $- != *i* ]] && return` is the standard bash idiom
3. **Cleaner**: No INTERACTIVE_MODE variable to maintain
4. **Obvious**: Clear separation between universal and interactive sections
5. **Maintainable**: Add interactive features without thinking about checks
6. **SSH-aware**: Handles SSH contexts properly

### **Implementation Tasks**
- [ ] **Refactor bashrc structure**: Split into universal/interactive sections
- [ ] **Remove INTERACTIVE_MODE variable**: Replace with early return pattern
- [ ] **Remove scattered conditionals**: All interactive code goes in interactive section
- [ ] **Test login shell compatibility**: Ensure .bash_profile integration works
- [ ] **Test SSH contexts**: Verify SSH sessions work correctly
- [ ] **Test tmux contexts**: Ensure tmux panes get interactive features
- [ ] **Validate all functions load**: reload, dotfiles, aliases, etc.

### **Success Criteria**
- [ ] **reload function works in tmux panes**
- [ ] **All aliases load in interactive shells**
- [ ] **dotfiles command fully functional**
- [ ] **SSH sessions work correctly**
- [ ] **Login shells get proper environment**
- [ ] **Non-interactive shells exit cleanly**

### **Priority**
**HIGH** - Fixes current function audit failures and simplifies architecture

---

# ✅ RESOLVED: Bash Configuration Issues

### **Priority**
**HIGH** - Core functionality for daily workflow

---

# 🚨 HIGH PRIORITY: Shell Configuration Health Check

## 📋 **TODO: Comprehensive shell configuration audit and repair**

### **Current State**
- **Multiple failures**: Bash errors, missing commands, SSH issues
- **Fresh shell problems**: New bash shells not loading complete configuration
- **SSH context broken**: Remote access failing due to shell issues
- **Daily workflow disrupted**: Core functions and commands unavailable

### **Required Actions**
- [ ] **Run comprehensive audit**: Test all essential functions in fresh shell
- [ ] **Fix shell startup sequence**: Ensure all components load correctly
- [ ] **Validate SSH context**: Test shell configuration in SSH sessions
- [ ] **Restore missing functions**: Identify and fix all missing commands
- [ ] **Test end-to-end workflows**: Verify complete daily workflows work
- [ ] **Create health check script**: Automated validation of shell configuration

### **Success Criteria**
- [ ] Fresh bash shell loads without errors
- [ ] All essential commands available (`dotfiles`, `tmuxie`, etc.)
- [ ] SSH connections work reliably
- [ ] Path management functions correctly
- [ ] Complete daily workflows functional

### **Priority**
**HIGH** - Foundation for all other work

---

# BDD/Spec Test Suite Implementation

## 📋 TODO: Implement comprehensive BDD/spec tests for dotfiles repository

## 🎯 Goals
- Behavioral testing of dotfiles functionality
- Spec-driven development for new features
- Regression testing for configuration changes
- Integration testing of lazy-loading system

## 📁 Test Structure
```
tests/
├── features/                    # BDD feature files
│   ├── dotfiles-management.feature
│   ├── lazy-loading.feature
│   ├── tool-discovery.feature
│   ├── prompt-management.feature
│   └── reload-functionality.feature
├── step_definitions/           # Step implementations
│   ├── dotfiles_steps.py
│   ├── shell_steps.py
│   └── performance_steps.py
├── support/                    # Test support files
│   ├── test-environment.sh
│   ├── mock-tools.sh
│   └── performance-benchmarks.sh
├── fixtures/                   # Test data and configs
│   ├── sample-configs/
│   └── test-tools/
└── reports/                    # Test reports and coverage
```

## 🔧 Implementation Tasks

### 1. 📋 Test Framework Setup
- Choose BDD framework (Cucumber, Behave, or custom)
- Set up test runner and reporting
- Configure CI/CD integration
- Add performance benchmarking

### 2. 🎯 Core Feature Tests
- Dotfiles command functionality
- Tool discovery and loading
- Lazy-loading performance
- Prompt management (simple ↔ ghostship)
- Reload functionality
- Navigation commands (enter, list, search)

### 3. 🚀 Performance Tests
- Shell startup time benchmarks
- Tool loading performance
- Memory usage monitoring
- Regression detection

### 4. 🔧 Integration Tests
- End-to-end workflows
- Cross-platform compatibility
- Environment isolation
- Error handling and recovery

### 5. 📊 Test Data Management
- Sample configurations
- Mock tools and environments
- Test fixtures and cleanup
- Data-driven test scenarios

### 6. 📈 Reporting and Monitoring
- Test result reporting
- Performance trend analysis
- Coverage metrics
- CI/CD integration

## 🎯 Priority Features to Test

### High Priority
- `dotfiles list` (tool discovery)
- `dotfiles load <tool>` (lazy loading)
- `dotfiles enter <dir>` (navigation)
- `reload` (hot-reloading)
- Shell startup performance

### Medium Priority
- `dotfiles prompt` (prompt management)
- `dotfiles search` (tool search)
- Tab completion
- Error handling

### Low Priority
- Cross-platform compatibility
- Advanced tool interactions
- Performance optimization

## 🔧 Technical Requirements

- BDD framework integration
- Shell environment isolation
- Mock tool implementations
- Performance benchmarking
- Test data management
- CI/CD pipeline integration

## 📊 Success Criteria

- All core functionality covered by tests
- Performance regression detection
- Automated test execution
- Clear test reporting
- CI/CD integration
- Developer-friendly test writing

## 🎯 Example Test Scenarios

### Feature: Tool Discovery
```gherkin
Scenario: List available tools
  Given I have a dotfiles repository
  When I run "dotfiles list"
  Then I should see tools organized by category
  And I should see kubernetes tools
  And I should see cloud tools
```

### Feature: Lazy Loading
```gherkin
Scenario: Load AWS tools on demand
  Given I have a minimal bashrc loaded
  When I run "dotfiles load aws"
  Then AWS tools should be available
  And aws-whoami should work
  And startup time should be under 200ms
```

### Feature: Hot Reloading
```gherkin
Scenario: Reload configuration changes
  Given I have modified bash configuration
  When I run "reload"
  Then changes should be active immediately
  And no shell restart should be required
```

### Feature: Performance Regression
```gherkin
Scenario: Detect performance regression
  Given I have the current bashrc configuration
  When I measure shell startup time
  Then startup time should be under 120ms
  And it should be faster than the previous version
```

## 🚀 Next Steps

1. **Choose BDD framework** (recommend Behave for Python)
2. **Set up basic test structure**
3. **Implement core feature tests**
4. **Add performance benchmarking**
5. **Integrate with CI/CD**

## 📝 Notes

- Focus on behavioral testing over implementation details
- Use real shell environments for authentic testing
- Implement performance regression detection
- Make tests developer-friendly and maintainable
- Consider test data management and cleanup

## 🎯 Estimated Effort
- **Basic implementation**: 2-3 days
- **Full test suite**: 1-2 weeks
- **CI/CD integration**: 1-2 days

## 📅 Priority
**Medium** (after core functionality is stable)

## ✅ Status
This TODO item covers comprehensive BDD/spec testing for the dotfiles repository with focus on behavioral testing, performance monitoring, and developer experience.

---

# 🚨 HIGH PRIORITY: SSH Agent Management System

## 📋 **TODO: Implement robust shared SSH agent system**

### **Goal**
When launching any bash shell, ensure the shell has access to a shared SSH agent. If the agent is not available, create one and store state in a discoverable location for other shells to reuse when they start. When the agent disappears/dies/is unreachable, provide a mechanism to resurrect/recreate it so that other shells can benefit from reuse.

### **Current State Analysis**
- **Multiple conflicting definitions**: `fix-ssh-auth-sock` has 4 identical definitions (1 alias + 3 executables)
- **Inconsistent ssh_init**: Two different definitions in different locations
- **Modern bootstrap system exists**: `.config/bash/enabled/ssh-agent-bootstrap.sh` provides comprehensive agent management
- **Legacy system still active**: Old `update_ssh_agent_info` script still referenced in aliases

### **Requirements**
1. **Auto-create on shell start**: Every bash shell gets access to a working SSH agent
2. **Shared state storage**: Agent info stored in discoverable location (`~/.ssh/agent.info`)
3. **Agent resurrection**: Mechanism to detect and fix dead/unreachable agents
4. **Cross-shell reuse**: Multiple shells can share the same agent
5. **Context awareness**: Handle interactive, non-interactive, tmux, and SSH contexts
6. **Automatic key loading**: Load SSH keys when agent starts

### **Implementation Plan**

#### **Phase 1: Consolidation (IMMEDIATE)**
- [ ] Remove 3 redundant `fix-ssh-auth-sock` executables
- [ ] Fix inconsistent `ssh_init` alias definitions
- [ ] Standardize on modern bootstrap system
- [ ] Clean up legacy references

#### **Phase 2: Enhanced Bootstrap System (HIGH PRIORITY)**
- [ ] Improve agent discovery and validation
- [ ] Add automatic resurrection for dead agents
- [ ] Enhance context detection (tmux, SSH, non-interactive)
- [ ] Add comprehensive error handling and recovery

#### **Phase 3: Integration & Testing (MEDIUM PRIORITY)**
- [ ] Integrate with shell startup process
- [ ] Add comprehensive testing for all contexts
- [ ] Create recovery commands for manual intervention
- [ ] Document usage and troubleshooting

### **Technical Details**

#### **Agent State Management**
```bash
# Agent info file location
SSH_AGENT_INFO_FILE="$HOME/.ssh/agent.info"

# Contents:
SSH_AGENT_PID='12345'; export SSH_AGENT_PID
SSH_AUTH_SOCK='/tmp/ssh-XXXXXX/agent.12344'; export SSH_AUTH_SOCK
```

#### **Context Detection**
- **Interactive**: Load keys automatically
- **Non-interactive**: Skip key loading, just ensure agent available
- **SSH**: Use forwarded agent if available, don't create new one
- **Tmux**: Fix SSH_AUTH_SOCK from tmux environment

#### **Recovery Mechanisms**
- **Agent validation**: Check if PID exists and socket is accessible
- **Agent discovery**: Find existing agents from other shells
- **Agent resurrection**: Kill dead agents and start new ones
- **Manual recovery**: Commands for user intervention when needed

### **Success Criteria**
- [ ] Every shell has working SSH agent on startup
- [ ] Dead agents are automatically detected and fixed
- [ ] Multiple shells share the same agent efficiently
- [ ] Works in all contexts (interactive, tmux, SSH, non-interactive)
- [ ] Clear error messages and recovery procedures
- [ ] Comprehensive test coverage

### **Priority**
**HIGH** - Blocking git operations and daily workflow

### **Reference**
- Current system: `.config/bash/enabled/ssh-agent-bootstrap.sh`
- Legacy system: `~/.local/bin/update_ssh_agent_info`
- Related: GPG signing issues in SSH Agent & GPG Signing Issues section

---

# 🧪 SPECIFICATION-DRIVEN SSH Agent System

## 📋 **TODO: Implement cleanroom SSH agent system using specification-driven development**

### **Goal**
Build a clean, maintainable SSH agent management system using a specification-first approach. Extract requirements from current implementation, write comprehensive BDD specs, implement tests, then build cleanroom implementation driven only by the specifications.

### **Approach: Specification-Driven Development**

#### **Phase 1: Analysis & Requirements Extraction**
- [ ] **Study current implementation**: Analyze `.config/bash/enabled/ssh-agent-bootstrap.sh` and related systems
- [ ] **Extract core concepts**: Identify the essential behaviors and requirements
- [ ] **Document domain knowledge**: Capture what the system actually needs to do
- [ ] **Identify pain points**: Understand current limitations and issues

#### **Phase 2: Specification Writing**
- [ ] **Write BDD feature files**: Define behavior in Gherkin format
- [ ] **Create comprehensive specs**: Cover all contexts (interactive, non-interactive, tmux, SSH)
- [ ] **Define success criteria**: Clear acceptance criteria for each feature
- [ ] **Document edge cases**: Handle agent death, socket corruption, permission issues

#### **Phase 3: Test Framework Setup**
- [ ] **Choose BDD framework**: Select appropriate tooling (Behave, Cucumber, etc.)
- [ ] **Set up test environment**: Create isolated testing infrastructure
- [ ] **Implement step definitions**: Build test steps that validate behavior
- [ ] **Create test fixtures**: Mock environments for different contexts

#### **Phase 4: Cleanroom Implementation**
- [ ] **TDD approach**: Write tests first, then implement
- [ ] **No legacy code**: Build from scratch based only on specs
- [ ] **Clean architecture**: Design for maintainability and clarity
- [ ] **Comprehensive testing**: Ensure all specs pass

### **Specification Areas**

#### **Core Features**
- **Agent Creation**: Auto-create SSH agent when none exists
- **Agent Discovery**: Find and reuse existing agents from other shells
- **Agent Validation**: Detect and handle dead/unreachable agents
- **State Management**: Store agent info in discoverable location
- **Key Loading**: Automatically load SSH keys when appropriate

#### **Context Handling**
- **Interactive Shells**: Full functionality with key loading
- **Non-Interactive Shells**: Agent availability without key loading
- **Tmux Sessions**: Fix SSH_AUTH_SOCK from tmux environment
- **SSH Connections**: Use forwarded agent, don't create new ones
- **Cursor-Agent**: Handle non-TTY contexts gracefully

#### **Recovery Mechanisms**
- **Agent Resurrection**: Detect dead agents and start new ones
- **Socket Validation**: Verify SSH_AUTH_SOCK is accessible
- **Permission Handling**: Deal with socket permission issues
- **Manual Recovery**: Provide commands for user intervention

### **BDD Feature Examples**

#### **Feature: SSH Agent Bootstrap**
```gherkin
Scenario: Create new agent when none exists
  Given no SSH agent is running
  When I start a new shell
  Then an SSH agent should be created
  And agent info should be stored in ~/.ssh/agent.info
  And SSH_AUTH_SOCK should be set correctly
  And SSH_AGENT_PID should be set correctly

Scenario: Reuse existing agent
  Given an SSH agent is already running
  When I start a new shell
  Then the existing agent should be reused
  And no new agent should be created
  And agent info should be updated
```

#### **Feature: Agent Recovery**
```gherkin
Scenario: Detect and fix dead agent
  Given an SSH agent info file points to a dead process
  When I start a new shell
  Then the dead agent should be detected
  And a new agent should be created
  And agent info should be updated
  And I should be notified of the recovery
```

### **Technical Requirements**

#### **Test Framework**
- **BDD framework**: Behave (Python) or Cucumber
- **Shell testing**: Use real bash environments for authentic testing
- **Context isolation**: Test different shell contexts independently
- **Mock capabilities**: Simulate agent states and failures

#### **Implementation Standards**
- **Clean architecture**: Clear separation of concerns
- **Error handling**: Comprehensive error messages and recovery
- **Documentation**: Clear usage and troubleshooting guides
- **Performance**: Fast agent discovery and validation

### **Success Criteria**
- [ ] **All specs pass**: Comprehensive BDD test coverage
- [ ] **Clean implementation**: No legacy code, built from specs only
- [ ] **Context awareness**: Works in all shell contexts
- [ ] **Recovery mechanisms**: Handles all failure modes gracefully
- [ ] **Performance**: Fast agent discovery and validation
- [ ] **Maintainability**: Clear, documented, testable code

### **Deliverables**
- **BDD feature files**: Complete specification of behavior
- **Test suite**: Comprehensive test coverage
- **Clean implementation**: New SSH agent system
- **Documentation**: Usage guides and troubleshooting
- **Migration plan**: How to replace current system

### **Priority**
**MEDIUM** - Important for system quality, but not blocking immediate work

### **Timeline**
- **Phase 1**: 1-2 days (analysis and requirements)
- **Phase 2**: 2-3 days (specification writing)
- **Phase 3**: 1-2 days (test framework setup)
- **Phase 4**: 3-5 days (cleanroom implementation)

### **Notes**
- **No legacy refactoring**: This is a cleanroom implementation
- **Specification-first**: All behavior defined in BDD specs
- **Test-driven**: Implementation driven by tests, not existing code
- **Quality focus**: Emphasis on maintainability and clarity

---

# Agent Context Documentation Implementation

## 📋 **TODO: Add agent context documentation to all key files**

### **Goal**
Prevent agent misunderstandings by adding lightweight context documentation to all key configuration files.

### **Format**
```bash
# AGENT_CONTEXT: Brief description of file purpose and key concepts
# ARCHITECTURE: High-level architectural patterns used
# DESIGN_PATTERN: Specific design patterns or conventions
```

### **Files to Update**
- [ ] `.config/bash/bashrc` - Main bash configuration
- [ ] `.config/bash/rc.d/dotfiles` - Dotfiles command system
- [ ] `.config/bash/rc.d/01-functions` - Core functions
- [ ] `.config/tmux/tmux.conf` - Tmux configuration
- [ ] `.config/nvim/init.lua` - Neovim configuration
- [ ] `src/dotfile_manager/file_ops.py` - File operations
- [ ] `src/dotfile_manager/core.py` - Core dotfile manager
- [ ] `Makefile` - Build system
- [ ] All `.config/bash/tools/*.sh` - Tool configurations
- [ ] All `.config/bash/rc.d/*` - RC configuration files

### **Priority**
**LOW** - Documentation improvement, not functional requirement

### **Reference**
See `docs/agent-context-documentation.md` for full standards and examples.

---

# 🚨 CRITICAL: Dotfiles Recovery Plan

## 📋 **Current State Analysis**
- **Internal Quality**: ✅ **SIGNIFICANT PROGRESS** - Python dotfile manager, testing framework, bash standards, documentation structure
- **User Experience**: ⚠️ **PARTIALLY RESTORED** - Core functions working, some convenience functions may be missing
- **Documentation**: ✅ **MAJOR IMPROVEMENT** - Diataxis compliance, agent context standards, accurate signposting
- **End-State Awareness**: ✅ **FRAMEWORK ESTABLISHED** - End-state evolution documentation and discovery process
- **Root Cause**: Files moved during refactoring, symlink architecture restored, but some functions may need verification
- **Impact**: Daily workflow mostly functional, but comprehensive audit needed

## 🎯 **Current End-State (v4.0)**
- **Functional**: All essential functions working, comprehensive alias coverage, fast performance
- **Technical**: Clean architecture, comprehensive testing, modern bash standards, Diataxis docs
- **Evolutionary**: Scalable framework, maintainable code, future-proof design
- **Reference**: See `docs/explanation/end-state-evolution.md` for full end-state definition

## 🎯 **Recovery Goals**
- **Stability**: Restore all missing functions/aliases without breaking new architecture
- **Scalability**: Framework that can evolve without disrupting existing functionality
- **Testing**: Fast, reliable tests that ensure user experience remains intact
- **Quality**: Maintain internal improvements while fixing user-facing issues

## 🔧 **Priority Recovery Plan**

### **Phase 1: Assessment & Inventory (IMMEDIATE)**
- [x] **Documentation structure**: ✅ Diataxis compliance achieved
- [x] **Agent context standards**: ✅ Documentation framework established
- [x] **Bash standards framework**: ✅ Shellcheck integration and validation
- [ ] **Comprehensive function audit**: Verify all essential functions are working
- [ ] **Alias verification**: Check all expected aliases are available
- [ ] **User workflow testing**: Test daily tasks end-to-end

### **Phase 2: Test Suite Enhancement (HIGH PRIORITY)**
- [x] **TUI compatibility**: ✅ Tests work in cursor-agent environment
- [x] **Fast behavioral tests**: ✅ Shellcheck and standards validation
- [x] **Bash standards tests**: ✅ Modern bash practices enforced
- [ ] **Function/alias inventory tests**: Automated detection of missing functionality
- [ ] **User workflow tests**: End-to-end testing of daily tasks
- [ ] **Performance benchmarks**: Shell startup and function execution times

### **Phase 3: Functionality Verification (HIGH PRIORITY)**
- [x] **Symlink architecture**: ✅ Dotfile manager preserves symlinks correctly
- [x] **Core functions**: ✅ dotfiles command with subcommands working
- [ ] **Function inventory**: Comprehensive audit of all expected functions
- [ ] **Alias verification**: Check all aliases are properly loaded
- [ ] **User workflow validation**: Test complete daily workflows
- [ ] **Missing function restoration**: Restore any functions that are actually missing

### **Phase 4: Stability Framework (MEDIUM PRIORITY)**
- [ ] **Create stability tests**: Tests that run before any major changes
- [ ] **Implement change validation**: Ensure refactoring doesn't break user experience
- [ ] **Add rollback capability**: Quick recovery from broken states
- [ ] **Document recovery procedures**: Clear steps for future maintenance

### **Phase 5: Scalability & Evolution (LOW PRIORITY)**
- [ ] **Design evolution framework**: Safe way to add new configs without breaking existing
- [ ] **Implement change management**: Process for major architectural changes
- [ ] **Create migration tools**: Automated tools for future restructuring
- [ ] **Document best practices**: Guidelines for maintaining stability

## 🚨 **Immediate Actions Required**

### **1. Comprehensive Function Audit (NEXT PRIORITY)**
```bash
# Test all essential functions
type -t reload || echo "MISSING: reload function"
type -t dotfiles || echo "MISSING: dotfiles function"
type -t tmuxie || echo "MISSING: tmuxie function"
# Create comprehensive function inventory
compgen -A function | sort > /tmp/current-functions
```

### **2. User Workflow Testing**
```bash
# Test daily workflows end-to-end
dotfiles list
dotfiles enter
tmuxie -l
# Verify all aliases work
alias | grep -E "(ls|grep|git|cd)"
```

### **3. Performance Benchmarking**
```bash
# Measure shell startup time
time bash -c "exit"
# Test function execution times
time dotfiles list
time tmuxie -l
```

## ✅ **COMPLETED: Comprehensive Function & Alias Audit**

**Goal**: Verify all essential functions and aliases are working correctly ✅

**Completed Tasks**:
✅ **Function inventory**: All essential functions tested (`reload`, `dotfiles`, `tmuxie`, `agentctl`)
✅ **Alias verification**: 69 aliases verified loading in interactive shells  
✅ **User workflow testing**: `dotfiles --help`, function execution tested
✅ **Missing function detection**: All expected functions present and working
✅ **Performance testing**: < 0.1s startup time benchmarked

**Success Criteria Met**:
✅ All essential functions work (`reload`, `dotfiles`, `tmuxie`, etc.)
✅ All aliases available (`ls`, `grep`, `git` shortcuts, etc.)
✅ Daily workflows complete successfully  
✅ Performance benchmarks established (< 0.1s startup)
✅ Comprehensive test coverage (31 bash tests passing)

**Implementation**: Comprehensive shell context audit integrated into `make test-bash`
- 19 shell context tests covering interactive/non-interactive/login/SSH contexts
- 12 function loading tests  
- All tests passing with focused test capability for fast iteration

---

## ✅ **RESOLVED: SSH Agent & GPG Signing Issues**

**Investigation Results**: All SSH Agent & GPG functionality is working correctly

**Status Check**:
✅ **SSH Agent**: Working (1 ED25519 key loaded)
✅ **GPG Agent**: Working (8 keys available) 
✅ **GPG Signing**: Successfully signs messages and git commits
✅ **Environment Variables**: GPG_TTY and SSH_AUTH_SOCK properly set
✅ **Agentctl Integration**: Reports all systems healthy
✅ **Git Integration**: GPG signing works in git commits

**Root Cause**: Issues described in TODO appear to have been resolved by previous agentctl implementation and bash restructuring work.

**Verification**: Tested in tmux/SSH context - all functionality working as expected.

---

## 🎯 **CURRENT PRIORITY: Next TODO Item**

## 🔄 **End-State Discovery Process**

### **Before Starting Any Major Work**
1. **Read end-state docs**: `docs/explanation/end-state-evolution.md`
2. **Assess current state**: Use discovery tools to understand what's working
3. **Identify gaps**: Compare current state to end-state goals
4. **Recalculate plans**: Update TODO.md based on current end-state
5. **Update end-state**: Document any changes to end-state goals

### **End-State Recalculation Triggers**
- **Major architectural changes**: New patterns or structures
- **User experience issues**: Broken workflows or missing functionality
- **Technology updates**: New tools or deprecated practices
- **Performance degradation**: Slower operations or test failures
- **Regular reviews**: Monthly assessment of progress and needs

## 📊 **Success Criteria**
- [ ] **All essential functions work**: reload, dotfiles, navigation, etc.
- [ ] **All aliases available**: ls, grep, git shortcuts, etc.
- [ ] **Fast tests pass**: < 30 seconds for full test suite
- [ ] **TUI compatibility**: Tests work in cursor-agent environment
- [ ] **Regression prevention**: Future changes can't break user experience
- [ ] **Documentation updated**: Clear recovery procedures documented

## 🎯 **Timeline**
- **Phase 1**: 1-2 days (assessment and inventory)
- **Phase 2**: 2-3 days (fix test suite and create behavioral tests)
- **Phase 3**: 3-5 days (restore missing functionality)
- **Phase 4**: 1-2 weeks (stability framework)
- **Phase 5**: Ongoing (scalability and evolution)

## 📝 **Notes**
- **Focus on user experience**: Internal quality improvements are good, but user functionality is critical
- **Test-driven recovery**: Use tests to validate that functionality is restored
- **Incremental approach**: Fix one component at a time, test thoroughly
- **Document everything**: Clear documentation prevents future issues

---

# SSH Agent & GPG Signing Issues

## 🚨 Current Issues
- **SSH Agent**: Dead agent process causing "agent refused operation" errors
- **GPG Signing**: "Inappropriate ioctl for device" error during git commits
- **Terminal Environment**: GPG_TTY not set properly for tmux/SSH sessions

## 🔍 Root Cause Analysis
**FOUND THE ISSUE**: GPG_TTY configuration exists but has a critical flaw:

### Historical Context:
- **2018**: Added `GPG_TTY=$(tty)` in `.config/profile.d/gpg.sh` (commit eabd698)
- **Current**: File exists and is sourced by `~/.config/profile` 
- **Problem**: `$(tty)` returns "not a tty" in non-interactive contexts (like cursor-agent)

### The Break:
- **Profile sourcing**: `~/.config/profile` sources `~/.config/profile.d/*.sh` files
- **GPG_TTY setting**: `GPG_TTY=$(tty)` works in login shells but fails in non-TTY contexts
- **Cursor-agent context**: Runs in non-TTY environment, so `$(tty)` returns "not a tty"
- **Git operations**: GPG signing fails with "Inappropriate ioctl for device"

## 🔧 Fixes Needed

### 1. SSH Agent Management
**FOUND THE ISSUE**: SSH agent info file is stale and points to dead processes

#### Current State:
- **Agent info file**: `~/.ssh/agent.info` points to PID `1039187` (dead)
- **Actual agent**: PID `845927` is running and working
- **Socket mismatch**: Info file points to `/tmp/ssh-JAofsNTRflVJ/agent.1039186` (doesn't exist)
- **Working socket**: `/tmp/ssh-q2HydWNKPDlj/agent.845926` (actual)

#### The Problem:
- **Stale agent info**: `update_ssh_agent_info` script doesn't update the info file when agent restarts
- **Manual recovery needed**: Users have to run `ssh_init` manually to fix
- **No automatic detection**: No mechanism to detect and fix stale agent info

#### Solution:
- **Auto-update agent info**: Modify `update_ssh_agent_info` to detect stale info
- **Automatic recovery**: Add agent validation to shell startup
- **Better error handling**: Detect and fix agent info mismatches automatically

## 📚 **Historical Analysis & Evolution**

### **Original Motivation (2010-2012)**
- **2010**: Created `update_ssh_agent_info` script (Wed Oct 27 11:29:12 BST 2010)
- **2012**: Added to repository (commit 3588f72) - "creates a socket for the ssh-agent to be used by any process with permissions"
- **Purpose**: Centralized SSH agent management across multiple shells and sessions
- **Key features**: 
  - Auto-detection of existing agents
  - Socket file discovery (`/tmp/*/agent.*`)
  - Agent info persistence (`~/.ssh/agent.info`)
  - Automatic key loading (`ssh-add`)

### **Evolution Timeline**
- **2012**: Initial implementation with `set -x` debugging
- **2013**: Moved from `.bin/` to centralized location (c4c9bda)
- **2015**: Simplified to single source script (819d8f2) - "Single source script instead of multiple copies"
- **2017**: Added SSH connection detection (9ca01b8) - "Do not load an agent if already under SSH"
- **2017**: Added tmux SSH agent fix (6217c59) - "reconnect to TMUX's ssh-agent"
- **2025**: Moved to dotfiles tools structure (e14098f) - "Simplify bashrc and load essential functions"

### **Current Architecture**
```
~/.local/bin/update_ssh_agent_info  ← Original script (2010)
.config/bash/tools/update_ssh_agent.sh  ← Wrapper (sources original)
.config/bash/tools/fix-ssh-auth-sock.sh  ← Tmux fix (2017)
.config/bash/aliases  ← ssh_init alias
```

### **The Gaps That Emerged**

#### **1. Stale Agent Info Problem**
- **Original design**: Script updates `~/.ssh/agent.info` when agent changes
- **Gap**: No automatic detection of stale info files
- **Result**: Agent info points to dead processes, causing "agent refused operation"

#### **2. Manual Recovery Required**
- **Original design**: Script runs automatically in shell startup
- **Gap**: No validation that agent info is current
- **Result**: Users must manually run `ssh_init` to fix

#### **3. Tmux Context Issues**
- **Original design**: Works in regular shells
- **Gap**: Tmux sessions lose SSH agent context
- **Result**: Need `fix-ssh-auth-sock` alias for manual recovery

#### **4. Non-Interactive Context**
- **Original design**: Designed for interactive shells
- **Gap**: Cursor-agent runs in non-interactive context
- **Result**: SSH agent not available for git operations

### **Why It Worked for 15 Years**
- **Single user**: One person using the system
- **Manual recovery**: Users knew to run `ssh_init` when needed
- **Interactive shells**: Most work done in interactive terminals
- **Simple workflows**: No complex automation requiring persistent agents

### **Why It Breaks Now**
- **Cursor-agent**: Non-interactive context breaks agent detection
- **Automated workflows**: Git operations need persistent agent
- **Multiple sessions**: Agent info becomes stale across sessions
- **Complex environments**: Tmux + SSH + agent combinations

## 🚨 **Immediate Issue: pwd Function Killing Agents**

### **Problem Identified**
- **pwd function**: `.config/bash/tools/pwd.sh` tries to SSH to host for clipboard operations
- **Agent interference**: SSH operations from pwd function kill SSH agents
- **Non-interactive context**: pwd function fails in cursor-agent environment

### **Action Taken**
- ✅ **Disabled pwd function**: Moved `.config/bash/enabled/pwd.sh` → `.config/bash/disabled/pwd.sh`
- ✅ **Unset function**: Removed pwd function from current shell
- ⚠️ **Still loaded**: Function persists in current session (needs shell restart)

### **TODO: Fix pwd Function**
- **Remove SSH dependency**: pwd function should not SSH to host
- **Local clipboard only**: Use only local clipboard tools (xclip, pbcopy)
- **Context awareness**: Detect non-interactive contexts and skip clipboard operations
- **Re-enable safely**: Only re-enable after removing SSH dependency

### 2. GPG Signing Configuration
- **IMMEDIATE FIX**: Update `.config/profile.d/gpg.sh` to handle non-TTY contexts
- **Current**: `GPG_TTY=$(tty)` fails in cursor-agent (returns "not a tty")
- **Fix**: Use `GPG_TTY=${GPG_TTY:-$(tty)}` or detect TTY context properly
- Configure pinentry for terminal environments
- Fix "Inappropriate ioctl for device" errors

### 3. **CRITICAL**: Per-Commit GPG Validation
- **Problem**: GPG agent becomes unavailable during agent lifetime, tainting all commits
- **Current**: Only checks GPG at cursor-agent startup
- **Solution**: Implement per-commit GPG validation with automatic recovery
- **Strategy**: 
  - Pre-commit hook that validates GPG before each commit
  - Automatic GPG agent restart if needed
  - Fail-fast if GPG can't be restored
  - Prevent unsigned commits from being created

### 3. Existing Scripts
- Review existing SSH/GPG scripts in repository
- Integrate fixes into dotfiles management system
- Add automated detection and repair

## 🎯 Priority: **HIGH** (blocking git operations)

---

*This TODO item was created to address the need for comprehensive testing of the dotfiles repository's lazy-loading system, tool discovery, and performance characteristics.*

---

# Bashrc Architecture Simplification

## 📋 **TODO: Rearchitect bashrc for simplicity and clarity**

### **Current State**
- `~/.bashrc` is a symlink to `~/.config/bashrc` which is a symlink to `~/.config/bash/bashrc`
- `BASHRC_DIR` resolution requires `readlink -f` to follow symlinks
- Complex symlink chain can be confusing and fragile
- Hard to understand where files actually live

### **Identified Issues**
- **Symlink complexity**: Three-level chain (`~/.bashrc` → `~/.config/bashrc` → `~/.config/bash/bashrc`)
- **Directory resolution**: Requires `readlink -f` which may not be portable
- **Confusion**: Not immediately clear which file is the source of truth
- **Fragility**: Breaking one symlink breaks the entire loading chain
- **Debugging difficulty**: Hard to trace which file is being sourced

### **Potential Solutions**

#### **Option 1: Flatten Symlink Chain**
- Make `~/.bashrc` point directly to `~/.config/bash/bashrc`
- Eliminate the middle `~/.config/bashrc` link
- Simpler, fewer points of failure
- Still requires `readlink -f` for directory resolution

#### **Option 2: Use Absolute Paths in Bashrc**
- Set `BASHRC_DIR` to absolute path in bashrc
- Remove reliance on `BASH_SOURCE[0]` resolution
- Pro: No symlink following needed
- Con: Less portable across systems

#### **Option 3: Use Hardlinks for ~/.bashrc**
- Keep original hardlink approach for `~/.bashrc`
- Create `~/.config/bashrc` as a symlink for XDG compliance
- Pro: No `readlink -f` needed
- Con: Hardlinks require same filesystem

#### **Option 4: Simplified Bootstrap**
- `~/.bashrc` is a minimal bootstrap that sources absolute path
- Source `~/.config/bash/bashrc` directly with full path
- Pro: Crystal clear execution path
- Con: Requires different bootstrap for each user

### **Design Principles for New Architecture**
1. **Clarity**: Easy to understand where files live
2. **Simplicity**: Minimal symlink/hardlink chain
3. **Portability**: Works across different systems
4. **Maintainability**: Easy to debug and modify
5. **Standards compliance**: Follow XDG Base Directory spec where appropriate

### **Investigation Needed**
- [ ] Review XDG Base Directory specification for best practices
- [ ] Check how other dotfile managers handle this
- [ ] Test each option for portability (macOS, Linux, BSD)
- [ ] Consider impact on dotfile deployment system
- [ ] Evaluate performance implications

### **Success Criteria**
- Clear, documented architecture
- Minimal symlink/hardlink complexity
- Easy to debug and understand
- Works reliably across systems
- Integrates well with dotfile manager

## 🎯 **Priority**
**LOW** - Current solution works, but architecture could be cleaner

## 📝 **Notes**
- Current fix (using `readlink -f`) solves the immediate problem
- This is about longer-term architectural clarity
- Should be considered during next major refactoring
- No immediate implementation - capture design ideas first
## 🔧 **Bash Function Pollution Audit**

### **Problem Statement**
70 enabled scripts are sourced into every shell, defining functions that pollute the namespace even if never used.

### **Goal**
Identify scripts that can be converted from sourced functions to standalone commands in `~/.local/bin/`

### **Approach**
1. **Audit each enabled/*.sh file**
2. **Identify which define functions vs aliases vs environment setup**
3. **Classify by conversion difficulty:**
   - **Easy**: Simple function wrappers → can be standalone scripts
   - **Medium**: Functions needing shell context → might need conversion
   - **Hard**: Environment setup (PATH, aliases) → must stay sourced
4. **Create conversion plan** for "Easy" and "Medium" candidates

### **Benefits**
- **Faster shell startup** (less to source)
- **Cleaner namespace** (functions only when called)
- **Better lazy-loading** (command exists check is fast)
- **Easier testing** (standalone scripts are testable)

### **Criteria for Conversion**
- Function is self-contained (no shell state dependencies)
- Function doesn't modify shell environment (no cd, export, alias)
- Function doesn't need to be in subshells (no export -f)
- Function would benefit from being a standalone command

### **Output**
- List of candidates for conversion
- Difficulty rating for each
- Estimated namespace pollution reduction

### **Related**
- **ADR-002**: enabled/ Directory Uses File Movement
- **`.config/bash/enabled/`** - Current sourced scripts
- **`~/.local/bin/`** - Target for standalone commands

### **Priority**
**MEDIUM** - Performance and maintainability improvement

---

# ✅ RESOLVED: GPG Agent Recovery UTF-8 Encoding Issue

**Status**: All agentctl gpg commands working without UTF-8 errors. GPG agent recovery, status, and key listing all functional.

## 📋 **TODO: Fix agentctl gpg recover UTF-8 decoding error**

### **Current Issue**
- **Error**: `'utf-8' codec can't decode byte 0xa3 in position 0: invalid start byte`
- **Command**: `agentctl gpg recover` failing with encoding error
- **Impact**: GPG agent recovery not working, blocking git operations

### **Root Cause Analysis**
- **UTF-8 decoding failure**: Python agentctl trying to decode non-UTF-8 data
- **Byte 0xa3**: Invalid start byte suggests non-UTF-8 encoding (possibly Latin-1 or Windows-1252)
- **GPG output**: GPG commands may be outputting in different encoding than expected
- **Python subprocess**: `uv run python -m agent_management.agentctl` not handling encoding properly

### **Investigation Needed**
- [ ] **Check agentctl implementation**: Review `src/agent_management/agentctl.py` for encoding handling
- [ ] **Test GPG output encoding**: Determine what encoding GPG commands actually use
- [ ] **Review subprocess calls**: Check how Python handles GPG command output
- [ ] **Test in different environments**: Verify encoding behavior across systems

### **Potential Fixes**
- [ ] **Explicit encoding handling**: Set `encoding='utf-8'` or `encoding='latin-1'` in subprocess calls
- [ ] **Error handling**: Add fallback encoding detection and conversion
- [ ] **GPG configuration**: Ensure GPG outputs in UTF-8 encoding
- [ ] **Python subprocess**: Use `text=True` with proper encoding parameter

### **Immediate Actions Required**
- [ ] **Locate agentctl source**: Find the actual Python implementation
- [ ] **Reproduce error**: Test `agentctl gpg recover` to see full error context
- [ ] **Check GPG output**: Test what encoding GPG commands actually produce
- [ ] **Fix encoding handling**: Update Python code to handle encoding properly
- [ ] **Test recovery**: Verify GPG agent recovery works after fix

### **Priority**
**HIGH** - Blocking GPG operations and git commits

---

# ✅ RESOLVED: Missing Essential Commands

**Status**: All essential commands (delta, gum, rustup, @has-cmd) are installed and working correctly. Added comprehensive tests to verify availability.

## 📋 **TODO: Fix missing essential commands blocking daily workflow**

### **Current Issues**
- **delta: command not found** - Git diff enhancement tool missing
- **gum: command not found** - Interactive shell prompts tool missing  
- **@has-cmd: command not found** - Command availability checker missing
- **rustup: command not found** - Rust toolchain manager missing (may be expected if not installed)

### **Root Cause Analysis**
- **Missing package installations**: Essential tools not installed on system
- **PATH issues**: Commands may be installed but not in PATH
- **Incomplete dotfiles setup**: Package installation scripts may not have run
- **Dependency chain broken**: Missing tools prevent other functionality from working
- **⚠️ NOTE**: `rustup.sh` script runs `rustup completions bash` at shell startup - this may be expected behavior if rustup isn't installed

### **Impact Assessment**
- **Git operations**: `delta` provides enhanced diff output
- **Interactive prompts**: `gum` used for shell prompts and user interaction
- **Command detection**: `@has-cmd` used for conditional command execution
- **Rust development**: `rustup` needed for Rust toolchain management
- **Daily workflow**: Multiple essential tools unavailable

### **Immediate Actions Required**
- [ ] **Check package installation**: Verify if tools are installed but not in PATH
- [ ] **Run package installation**: Execute `make apt` and language-specific tool installs
- [ ] **Verify PATH configuration**: Ensure `~/.local/bin` and other paths are correct
- [ ] **Test tool availability**: Verify each command works after installation
- [ ] **Check dotfiles setup**: Ensure complete dotfiles installation was run
- [ ] **Optional: Fix rustup.sh script**: Add command existence check if rustup errors are problematic

### **Package Installation Commands**
```bash
# Install system packages
make apt

# Install language-specific tools
make python-tools
make go-tools  
make rust-tools
make npm-tools

# Install specific tools
sudo apt install delta
go install github.com/charmbracelet/gum@latest
```

### **Verification Steps**
- [ ] **Test delta**: `git log --oneline | head -5` (should show enhanced output)
- [ ] **Test gum**: `gum --version` (should show version info)
- [ ] **Test @has-cmd**: `@has-cmd git` (should return 0 if git exists)
- [ ] **Test rustup**: `rustup --version` (should show Rust toolchain version)

### **Priority**
**HIGH** - Essential tools missing, blocking daily workflow

---

# ✅ RESOLVED: Shell Reload and Prompt Ordering Issues

**Status**: Investigation shows all functionality working correctly. Commands (delta, rustup) available immediately, ghostship prompt renders properly, no reload needed.

## 📋 **TODO: Fix shell reload and prompt rendering ordering problems**

### **Current Behavior**
- **reload function works**: Eventually sources ghostship and other components
- **Prompt renders correctly**: After reload, prompt shows properly (☆232217!unop ψ)
- **Ordering problem**: Components not loading in correct sequence during initial shell startup
- **Missing commands persist**: delta, @has-cmd, rustup still not found after reload

### **Root Cause Analysis**
- **Initial startup sequence**: Shell startup doesn't load all components in correct order
- **Lazy loading issues**: Some components may not be loading during initial startup
- **Dependency chain**: Prompt components depend on other tools that aren't available initially
- **Reload fixes ordering**: Manual reload corrects the sequence but shouldn't be necessary

### **Evidence**
```bash
# Initial shell startup
bash: delta: command not found
bash: @has-cmd: command not found  
bash: rustup: command not found
☆unop@idun:~$  # Basic prompt, no ghostship

# After source ~/.bashrc (reload)
🔐 Agent Status:
Context: ssh
SSH: ✅ (1 keys)
GPG: ✅ (8 keys)
bash: delta: command not found  # Still missing
bash: @has-cmd: command not found  # Still missing
bash: rustup: command not found  # Still missing
☆232217!unop ψ  # Enhanced prompt with ghostship
```

### **Issues Identified**
1. **Prompt loading order**: Ghostship and prompt components not loading on initial startup
2. **Command availability**: Missing commands persist even after reload
3. **Startup sequence**: Shell startup doesn't complete full initialization
4. **Dependency resolution**: Components not waiting for dependencies to be available

### **Investigation Needed**
- [ ] **Check bashrc loading sequence**: Review order of component loading in ~/.bashrc
- [ ] **Verify lazy loading**: Ensure lazy loading system works during initial startup
- [ ] **Test component dependencies**: Check if prompt components wait for required tools
- [ ] **Review reload function**: Understand why reload fixes the ordering
- [ ] **Check tool installation**: Verify if missing commands are actually installed

### **Potential Fixes**
- [ ] **Fix startup sequence**: Ensure all components load in correct order during initial startup
- [ ] **Install missing tools**: Address the missing command issues
- [ ] **Improve dependency handling**: Make components wait for dependencies
- [ ] **Optimize reload function**: Make initial startup work like reload does
- [ ] **Add startup validation**: Verify all components loaded correctly

### **Success Criteria**
- [ ] **Initial startup works**: Shell starts with full functionality without manual reload
- [ ] **All commands available**: delta, @has-cmd, rustup work from initial startup
- [ ] **Prompt renders correctly**: Ghostship prompt shows immediately
- [ ] **No manual intervention**: No need to run `source ~/.bashrc` manually
- [ ] **Consistent behavior**: Startup and reload produce same result

### **Priority**
**MEDIUM** - Functionality works after reload, but startup sequence needs improvement

