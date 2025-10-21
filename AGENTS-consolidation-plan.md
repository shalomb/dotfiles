# Agent Script Consolidation Plan

## Current State Analysis

### **Scripts to DELETE (replaced by unified agent system):**

1. **`.config/bash/disabled/agent-bootstrap.sh`** ❌ DELETE
   - **Reason**: Replaced by `unified-agent-bootstrap.sh`
   - **Functionality**: Old fragmented bootstrap system

2. **`.config/bash/disabled/ssh-agent-bootstrap.sh`** ❌ DELETE  
   - **Reason**: Replaced by unified agent system
   - **Functionality**: Old SSH-only bootstrap

3. **`.config/bash/rc.d/bootstrap-agents.sh.old`** ❌ DELETE
   - **Reason**: Old backup, no longer needed
   - **Functionality**: Legacy bootstrap system

4. **`.config/bash/enabled/update_ssh_agent.sh`** ❌ DELETE
   - **Reason**: Replaced by unified agent system
   - **Functionality**: Legacy SSH agent management

### **Scripts to RENAME (better names):**

1. **`.config/bash/enabled/fix-ssh-auth-sock.sh`** → **`.config/bash/enabled/ssh-socket-recovery.sh`**
   - **Reason**: More descriptive name
   - **Functionality**: SSH socket recovery function

2. **`.config/bash/enabled/fix-gpg-auth-sock.sh`** → **`.config/bash/enabled/gpg-socket-recovery.sh`**
   - **Reason**: More descriptive name  
   - **Functionality**: GPG socket recovery function

3. **`.config/bash/enabled/gpg-recovery.sh`** → **`.config/bash/enabled/gpg-troubleshooting.sh`**
   - **Reason**: More descriptive name
   - **Functionality**: GPG troubleshooting and recovery

4. **`.config/bash/rc.d/unified-agent-bootstrap.sh`** → **`.config/bash/rc.d/agent-bootstrap.sh`**
   - **Reason**: Cleaner name, no "unified" prefix needed
   - **Functionality**: Main agent bootstrap system

### **Scripts to KEEP (still needed):**

1. **`.config/bash/enabled/ssh.sh`** ✅ KEEP
   - **Reason**: SSH connection utilities (list-ssh-connections)
   - **Functionality**: SSH connection management

2. **`.config/bash/enabled/ssh_hostkey_management.sh`** ✅ KEEP
   - **Reason**: SSH hostkey management utilities
   - **Functionality**: SSH hostkey operations

3. **`.config/bash/rc.d/agent-commands`** ✅ KEEP
   - **Reason**: Agent workflow commands (next, agent-status)
   - **Functionality**: Agent-specific workflow functions

## Consolidation Benefits

### **Before (9 scripts):**
- `agent-bootstrap.sh` (disabled)
- `ssh-agent-bootstrap.sh` (disabled) 
- `bootstrap-agents.sh.old` (old)
- `update_ssh_agent.sh` (enabled)
- `fix-ssh-auth-sock.sh` (enabled)
- `fix-gpg-auth-sock.sh` (enabled)
- `gpg-recovery.sh` (enabled)
- `unified-agent-bootstrap.sh` (rc.d)
- `agent-commands` (rc.d)

### **After (5 scripts):**
- `agent-bootstrap.sh` (rc.d) - Main bootstrap
- `ssh-socket-recovery.sh` (enabled) - SSH recovery
- `gpg-socket-recovery.sh` (enabled) - GPG recovery  
- `gpg-troubleshooting.sh` (enabled) - GPG troubleshooting
- `agent-commands` (rc.d) - Workflow commands

**Reduction: 9 → 5 scripts (44% reduction)**

## Implementation Plan

1. **Delete** 4 obsolete scripts
2. **Rename** 4 scripts with better names
3. **Update** references in bashrc and other scripts
4. **Test** all functionality still works
5. **Document** new script purposes

## New Script Hierarchy

```
.config/bash/
├── rc.d/
│   ├── agent-bootstrap.sh          # Main agent bootstrap (renamed)
│   └── agent-commands              # Workflow commands (unchanged)
└── enabled/
    ├── ssh-socket-recovery.sh      # SSH socket recovery (renamed)
    ├── gpg-socket-recovery.sh      # GPG socket recovery (renamed)
    ├── gpg-troubleshooting.sh      # GPG troubleshooting (renamed)
    ├── ssh.sh                      # SSH utilities (unchanged)
    └── ssh_hostkey_management.sh   # SSH hostkey management (unchanged)
```