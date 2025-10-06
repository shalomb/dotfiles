# Agent Context Documentation Standards

## Overview

To prevent misunderstandings and improve agent efficiency, all key configuration files should include lightweight context documentation that explains architectural intent and design patterns.

## Documentation Format

### **Standard Headers**

Add these headers to the top of key files (after shebang if present):

```bash
# AGENT_CONTEXT: Brief description of file purpose and key concepts
# ARCHITECTURE: High-level architectural patterns used
# DESIGN_PATTERN: Specific design patterns or conventions
```

### **Examples**

#### **Dotfiles Command File**
```bash
#!/bin/bash
# AGENT_CONTEXT: dotfiles command with subcommands (enter, list, search, load)
# ARCHITECTURE: enabled/ -> symlinks -> rc.d/ or tools/
# DESIGN_PATTERN: Single command with subcommands, not separate functions
```

#### **Bash Configuration File**
```bash
#!/bin/bash
# AGENT_CONTEXT: Main bash configuration with modular sourcing
# ARCHITECTURE: bashrc -> enabled/ -> symlinks -> rc.d/ or tools/
# DESIGN_PATTERN: Symlink-based modular system for enable/disable functionality
```

#### **Dotfile Manager**
```python
#!/usr/bin/env python3
# AGENT_CONTEXT: Python dotfile manager preserving symlinks
# ARCHITECTURE: Repository -> hardlinks/symlinks -> home directory
# DESIGN_PATTERN: Preserve symlinks for modular architecture
```

## Implementation Guidelines

### **When to Add Context**
- **Configuration files**: bash, tmux, nvim, etc.
- **Scripts**: deployment, management, utility scripts
- **Architecture files**: dotfile manager, build systems
- **Key functions**: complex functions with non-obvious behavior

### **What to Document**
- **Purpose**: What the file does in one sentence
- **Architecture**: Key structural patterns
- **Design patterns**: Important conventions or patterns
- **Agent gotchas**: Common misunderstandings to avoid

### **What NOT to Document**
- Implementation details
- Step-by-step instructions
- Obvious functionality
- Temporary workarounds

## Benefits

1. **Prevents misunderstandings**: Agents immediately understand intent
2. **Reduces investigation time**: Context is available upfront
3. **Maintains consistency**: Clear patterns across files
4. **Improves efficiency**: Less time spent figuring out architecture

## Implementation Plan

1. **Phase 1**: Document the standard (this file)
2. **Phase 2**: Add to AGENTS.md for agent reference
3. **Phase 3**: Low-priority TODO to update all files systematically
4. **Phase 4**: Use as standard for all new files

## Examples of Common Patterns

### **Modular Configuration**
```bash
# AGENT_CONTEXT: Modular configuration with enable/disable
# ARCHITECTURE: enabled/ -> symlinks -> rc.d/ or tools/
# DESIGN_PATTERN: Symlink-based modular system
```

### **Command with Subcommands**
```bash
# AGENT_CONTEXT: Main command with subcommands
# ARCHITECTURE: Single entry point with internal routing
# DESIGN_PATTERN: Command pattern with subcommand dispatch
```

### **Deployment System**
```bash
# AGENT_CONTEXT: File deployment preserving architecture
# ARCHITECTURE: Repository -> home directory with symlink preservation
# DESIGN_PATTERN: Preserve symlinks for modular design
```

## Maintenance

- **Keep it terse**: 1-2 lines per header maximum
- **Update when architecture changes**: Keep context current
- **Remove when obvious**: Don't document self-explanatory code
- **Use consistent keywords**: AGENT_CONTEXT, ARCHITECTURE, DESIGN_PATTERN