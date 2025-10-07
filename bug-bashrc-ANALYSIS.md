# Bash Configuration Analysis: Spaghetti Mess Cleanup

## Current State Analysis

### Directory Structure Problems
```
.config/bash/
├── rc.d/           # Core files loaded directly by bashrc
│   ├── 01-functions
│   ├── 02-colours
│   ├── dotfiles
│   └── [8 other core files]
├── enabled/        # EMPTY - should be only source for user tools
├── disabled/       # 74 tools available for enabling
└── tools/          # DELETED - was causing symlink chaos
```

### Loading Mechanism Chaos
The current `bashrc` loads from **multiple sources**:
1. **rc.d/** - Core files (01-functions, 02-colours, etc.)
2. **enabled/** - User tools (currently empty)
3. **Hardcoded paths** - Direct file references

### Problems Identified

#### 1. Multiple Loading Sources
- **rc.d/** contains core files that bashrc loads directly
- **enabled/** is empty but should be the ONLY source for user tools
- **disabled/** has 74 tools but they're not accessible
- **Mixed loading patterns** create confusion

#### 2. Symlink vs Hardlink Inconsistency
- Repository uses **hardlinks** for dotfile management
- But we had **symlinks** in disabled/ pointing to deleted tools/
- **Broken symlinks** were causing function loading failures

#### 3. Directory Purpose Confusion
- **rc.d/** - Core system files (should stay)
- **enabled/** - User tools (should be ONLY source for tools)
- **disabled/** - Available tools (should be source of truth for tools)
- **tools/** - DELETED (was causing chaos)

## Proposed Solution

### Single Source of Truth Architecture
```
.config/bash/
├── rc.d/           # Core system files (01-functions, 02-colours, etc.)
├── enabled/        # User tools (actual files moved from disabled/)
└── disabled/       # Available tools (actual files, source of truth)
```

### Loading Mechanism
**bashrc loads from:**
1. **rc.d/** - Core system files (01-functions, 02-colours, etc.)
2. **enabled/** - User tools (actual files)

### File Management Strategy (ADR-002)
- **disabled/** - Contains actual tool files (source of truth)
- **enabled/** - Contains actual files (moved from disabled/)
- **rc.d/** - Contains core system files (unchanged, ADR-001)
- **No symlinks** - File movement only
- **No tools/ directory** - Completely eliminated

## Implementation Plan

### Phase 1: Fix Directory Structure
1. **Keep rc.d/** - Core system files stay as-is
2. **Fix disabled/** - Ensure all 74 tools are actual files (not symlinks)
3. **Clear enabled/** - Remove any existing files
4. **Remove tools/** - Ensure complete elimination

### Phase 2: Fix Loading Mechanism
1. **Update bashrc** - Remove hardcoded rc.d/ references
2. **Single loading pattern** - Only load from enabled/ for tools
3. **Keep rc.d/ loading** - For core system files only

### Phase 3: Fix Symlinks
1. **Convert symlinks to hardlinks** - Use dotfile manager
2. **Ensure consistency** - All files properly managed
3. **Test deployment** - Verify home directory sync

## Current Git State
- **3 commits staged** - All the tool movement and cleanup
- **Ready for single commit** - All changes prepared
- **Clean slate** - Ready for proper implementation

## Expected Outcome
- **Single loading source** - Only enabled/ for user tools
- **Clean architecture** - rc.d/ for core, enabled/ for tools, disabled/ for storage
- **No symlink chaos** - All files properly managed via hardlinks
- **One clean commit** - All changes in single, well-documented commit

## Key Decisions
1. **rc.d/ stays** - Core system files are essential
2. **enabled/ only** - Single source for user tools
3. **disabled/ storage** - Source of truth for available tools
4. **Hardlinks everywhere** - Consistent with dotfile manager
5. **No tools/ directory** - Completely eliminated