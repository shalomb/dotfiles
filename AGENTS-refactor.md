# Agent Management Refactor: Keychain-Inspired Architecture

## 🎯 **Vision: Unified Agent Management System**

Transform our fragmented SSH/GPG agent management into a **keychain-inspired architecture** that provides consistent, reliable agent management across all shell contexts.

## 🔍 **Current State Problems**

### **Fragmented Tools (9 different scripts!)**
- `agent-bootstrap.sh` - General agent bootstrap
- `fix-gpg-auth-sock.sh` - GPG agent recovery
- `fix-ssh-auth-sock.sh` - SSH agent recovery  
- `gpg-recovery.sh` - GPG recovery
- `ssh-agent-bootstrap.sh` - SSH-specific bootstrap
- `ssh.sh` - SSH configuration
- `update_ssh_agent.sh` - SSH agent updates
- `bootstrap-agents.sh` - RC bootstrap
- `agent-commands` - Agent command definitions

### **Inconsistent Behavior**
- Different scripts handle same functionality
- No shared state discovery mechanism
- Context detection is scattered
- Recovery mechanisms are duplicated
- No standardized agent lifecycle management

### **Context Confusion**
- tmux vs SSH vs interactive shells handled differently
- Agent discovery fails across contexts
- TTY issues in non-interactive environments
- GPG signing fails in cursor-agent

## 🏗️ **Keychain-Inspired Architecture**

### **Core Principles**

1. **Each Shell Ensures Agent Operability**
   - Every shell startup validates agent availability
   - If agent missing/broken, shell creates/fixes it
   - Shell stores agent info for other shells to discover

2. **Shared State Discovery**
   - XDG-compliant locations for agent state
   - Runtime files in `$XDG_RUNTIME_DIR/agents/` (sockets, PIDs)
   - Persistent state in `$XDG_STATE_HOME/agents/` (logs, context)
   - Consistent file format for agent information
   - Cross-shell agent discovery and validation

3. **Consistent Toolkit**
   - Single `agent` command with subcommands
   - Standardized recovery mechanisms
   - Unified context detection and handling

4. **Graceful Degradation**
   - Works when agents die or become unavailable
   - Automatic recovery and resurrection
   - Fallback mechanisms for different contexts

### **Proposed Structure (XDG Compliant)**

```
# Runtime files (temporary, session-specific)
$XDG_RUNTIME_DIR/agents/
├── ssh-agent.sock
├── ssh-agent.pid
├── gpg-agent.sock
└── gpg-agent.pid

# Persistent state (logs, context)
$XDG_STATE_HOME/agents/
├── context.json
└── logs/
    ├── ssh-agent.log
    └── gpg-agent.log

# Configuration (optional settings)
$XDG_CONFIG_HOME/agents/
├── config.toml
└── recovery/
    ├── ssh-recovery.sh
    └── gpg-recovery.sh
```

**XDG Directory Mapping:**
- `$XDG_RUNTIME_DIR` → `/run/user/$UID` (sockets, PIDs)
- `$XDG_STATE_HOME` → `~/.local/state` (logs, persistent state)
- `$XDG_CONFIG_HOME` → `~/.config` (configuration files)

### **Unified `agent` Command**

```bash
agent init          # Initialize agents for current context
agent status        # Show agent status and health
agent restart       # Restart agents
agent recover       # Recover from agent failures
agent cleanup       # Clean up dead agents
agent context       # Show current context (tmux/ssh/interactive)
agent share         # Share agent info with other shells
```

### **Context-Aware Behavior**

| Context | SSH Agent | GPG Agent | TTY Handling |
|---------|-----------|-----------|--------------|
| **Interactive** | Full startup | Full startup | Normal TTY |
| **tmux** | Reuse existing | Reuse existing | tmux TTY |
| **SSH** | Reuse existing | Reuse existing | SSH TTY |
| **cursor-agent** | Reuse existing | Reuse existing | No TTY fallback |

## 🔧 **Implementation Strategy**

### **Phase 1: Consolidation**
- [ ] **Audit existing scripts** - understand current functionality
- [ ] **Identify core patterns** - extract common behaviors
- [ ] **Design unified interface** - single `agent` command
- [ ] **Create state management** - standardized agent state storage

### **Phase 2: Core Implementation**
- [ ] **Implement `agent` command** - unified interface
- [ ] **Create state discovery** - cross-shell agent sharing
- [ ] **Build context detection** - tmux/SSH/interactive awareness
- [ ] **Implement recovery** - automatic agent resurrection

### **Phase 3: Integration**
- [ ] **Replace existing scripts** - migrate to new system
- [ ] **Update bashrc integration** - single bootstrap call
- [ ] **Test across contexts** - tmux, SSH, cursor-agent
- [ ] **Documentation** - usage and troubleshooting

### **Phase 4: Polish**
- [ ] **Performance optimization** - fast agent discovery
- [ ] **Error handling** - comprehensive error recovery
- [ ] **Logging** - detailed agent lifecycle logs
- [ ] **Testing** - comprehensive test suite

## 🎯 **Success Criteria**

### **Functional Requirements**
- [ ] **Single command interface** - `agent` command handles all agent management
- [ ] **Cross-shell sharing** - agents work across tmux, SSH, interactive shells
- [ ] **Automatic recovery** - agents resurrect when they die
- [ ] **Context awareness** - different behavior for different contexts
- [ ] **GPG signing works** - commits work in all contexts

### **Quality Requirements**
- [ ] **Consistent behavior** - same experience across all contexts
- [ ] **Fast startup** - minimal overhead for shell startup
- [ ] **Reliable recovery** - agents recover from all failure modes
- [ ] **Clear error messages** - easy troubleshooting when things go wrong
- [ ] **Comprehensive logging** - detailed logs for debugging

### **Integration Requirements**
- [ ] **Backward compatibility** - existing workflows continue to work
- [ ] **Easy migration** - simple path from current system
- [ ] **Documentation** - clear usage and troubleshooting guides
- [ ] **Testing** - comprehensive test coverage

## 🚀 **Benefits**

### **For Users**
- **Reliable agent management** - agents work consistently across contexts
- **Simple interface** - single `agent` command for all agent operations
- **Automatic recovery** - no manual intervention when agents fail
- **Clear error messages** - easy to troubleshoot when things go wrong

### **For Developers**
- **Unified codebase** - single system instead of 9 different scripts
- **Consistent patterns** - same approach for SSH and GPG agents
- **Easy testing** - centralized logic is easier to test
- **Clear architecture** - well-defined responsibilities and interfaces

### **For Maintenance**
- **Single point of truth** - all agent logic in one place
- **Easier debugging** - centralized logging and error handling
- **Simpler updates** - changes in one place affect all contexts
- **Better documentation** - single system to document

## 📋 **Migration Plan**

### **Pre-Migration**
- [ ] **Audit current usage** - understand how existing scripts are used
- [ ] **Create compatibility layer** - ensure existing scripts continue to work
- [ ] **Build new system** - implement keychain-inspired architecture
- [ ] **Test thoroughly** - ensure new system works in all contexts

### **Migration**
- [ ] **Deploy new system** - install `agent` command and state management
- [ ] **Update bashrc** - replace multiple script calls with single `agent init`
- [ ] **Test across contexts** - verify tmux, SSH, cursor-agent all work
- [ ] **Monitor for issues** - watch for any problems during transition

### **Post-Migration**
- [ ] **Remove old scripts** - clean up fragmented agent management
- [ ] **Update documentation** - reflect new unified system
- [ ] **Optimize performance** - fine-tune based on real usage
- [ ] **Gather feedback** - collect user experience and improve

## 🔧 **Implementation Considerations**

### **Security & Permissions**
- **Runtime files**: `$XDG_RUNTIME_DIR/agents/` automatically has correct permissions (700)
- **State files**: Use strict permissions (600) for sensitive state files  
- **Socket files**: System handles socket permissions automatically
- **Lock files**: Use appropriate permissions for coordination files

### **Race Conditions**
- **Atomic operations**: Use `mv` for atomic file updates
- **Locking mechanism**: Implement file locking for state updates
- **Process coordination**: Multiple shells should coordinate agent creation
- **Timeout handling**: Prevent indefinite waits on locks

### **XDG Compliance Benefits**
- **Automatic cleanup**: `$XDG_RUNTIME_DIR` is cleaned on reboot
- **Proper separation**: Runtime vs persistent vs configuration data
- **System integration**: Works with systemd, desktop environments
- **Portability**: Follows Linux standards across distributions

## 🎯 **Next Steps**

1. **Review this proposal** - validate the architectural approach
2. **Audit existing scripts** - understand current functionality in detail
3. **Design detailed interface** - specify exact `agent` command behavior
4. **Create implementation plan** - break down into specific tasks
5. **Begin Phase 1** - start with consolidation and auditing

## 📚 **References**

- **keychain project**: https://github.com/funtoo/keychain
- **SSH agent best practices**: https://www.ssh.com/academy/ssh/agent
- **GPG agent documentation**: https://www.gnupg.org/documentation/manuals/gnupg/Invoking-GPG_002dAGENT.html
- **Current agent scripts**: `.config/bash/enabled/*agent*.sh`

---

**This refactor transforms our fragmented agent management into a unified, keychain-inspired system that provides reliable, consistent agent management across all shell contexts.**