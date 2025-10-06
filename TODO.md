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

# 🚨 CRITICAL: Dotfiles Recovery Plan

## 📋 **Current State Analysis**
- **Internal Quality**: Significant progress on Python dotfile manager, testing framework, and architectural improvements
- **User Experience**: **BROKEN** - Many functions/aliases missing due to restructuring
- **Root Cause**: Files moved around during refactoring, not properly sourced in new structure
- **Impact**: Daily workflow disrupted, essential tools unavailable

## 🎯 **Recovery Goals**
- **Stability**: Restore all missing functions/aliases without breaking new architecture
- **Scalability**: Framework that can evolve without disrupting existing functionality
- **Testing**: Fast, reliable tests that ensure user experience remains intact
- **Quality**: Maintain internal improvements while fixing user-facing issues

## 🔧 **Priority Recovery Plan**

### **Phase 1: Assessment & Inventory (IMMEDIATE)**
- [ ] **Audit missing functions/aliases**: Compare current state vs 2-3 months ago
- [ ] **Identify broken sourcing**: Find files that moved but aren't being loaded
- [ ] **Create function inventory**: Document all expected functions/aliases
- [ ] **Test current functionality**: Run comprehensive shell functionality tests

### **Phase 2: Fix Test Suite (HIGH PRIORITY)**
- [ ] **Fix TUI compatibility**: Make `make test` work in cursor-agent environment
- [ ] **Create fast behavioral tests**: Quick tests for user experience validation
- [ ] **Implement function/alias tests**: Automated detection of missing functionality
- [ ] **Add regression tests**: Prevent future breakage during refactoring

### **Phase 3: Restore Missing Functionality (HIGH PRIORITY)**
- [ ] **Restore missing functions**: Re-enable all essential functions from 2-3 months ago
- [ ] **Fix sourcing issues**: Ensure all moved files are properly sourced
- [ ] **Validate aliases**: Restore all missing aliases and shortcuts
- [ ] **Test user workflows**: Ensure daily tasks work as expected

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

### **1. Function/Alias Audit**
```bash
# Compare current vs historical state
git show 2a5d7d4:.config/bash/rc.d/01-functions > /tmp/old-functions
git show 2a5d7d4:.config/bash/aliases > /tmp/old-aliases
# Compare with current files to identify missing items
```

### **2. Test Suite Fix**
```bash
# Make tests TUI-compatible
make test 2>/dev/null || echo "Tests need TUI fix"
# Create fast behavioral tests
uv run python -m pytest tests/ -v --tb=short
```

### **3. Missing Functionality Detection**
```bash
# Test essential functions
type -t reload || echo "MISSING: reload function"
type -t dotfiles || echo "MISSING: dotfiles function"
# Add more essential function checks
```

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