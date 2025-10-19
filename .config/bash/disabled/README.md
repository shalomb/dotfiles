# disabled/ - Disabled Bash Scripts

## Purpose
This directory contains **disabled startup scripts** that are not loaded during bash initialization but are kept for reference, testing, or future use.

## Usage
Scripts in this directory are **ignored** by the bash startup process. They are not sourced and do not affect the shell environment.

## Common Use Cases

### Temporary Disabling
- **Testing**: Disable scripts while testing changes
- **Debugging**: Isolate issues by disabling specific functionality
- **Performance**: Disable heavy scripts during development

### Deprecated Scripts
- **Legacy code**: Scripts that are no longer needed but kept for reference
- **Alternative implementations**: Old versions of scripts before refactoring
- **Documentation**: Examples of how things used to work

### Experimental Scripts
- **Work in progress**: Scripts under development
- **Beta features**: New functionality not ready for production
- **Personal experiments**: Custom modifications not ready to share

## File Naming Convention
- **Original name preserved**: Keep the same name as when it was in `enabled/`
- **Add .disabled suffix**: Optionally add `.disabled` to make it clear
- **Add reason comment**: Include comment explaining why it's disabled

## Example Structure
```
disabled/
├── old-tool.sh.disabled          # Deprecated tool script
├── experimental-feature.sh       # Work in progress
├── heavy-script.sh               # Temporarily disabled for performance
└── README.md                     # This file
```

## Re-enabling Scripts
To re-enable a script:
1. **Move to enabled/**: `mv disabled/script.sh enabled/`
2. **Test functionality**: Ensure it works with current setup
3. **Update if needed**: Fix any compatibility issues
4. **Document changes**: Update any relevant documentation

## Agent Development Guidelines

### When to Disable Scripts
- **Breaking changes**: Script causes errors or conflicts
- **Performance issues**: Script is too slow or resource-intensive
- **Dependency problems**: Required tools or libraries are missing
- **Testing isolation**: Need to test without specific functionality

### When to Keep Disabled Scripts
- **Temporary issues**: Problems that will be fixed soon
- **Reference value**: Scripts that show how things work
- **Alternative approaches**: Different ways to solve the same problem
- **Historical context**: Understanding how the system evolved

### Cleanup Guidelines
- **Regular review**: Periodically check if disabled scripts are still needed
- **Remove obsolete**: Delete scripts that are no longer relevant
- **Archive important**: Move historically important scripts to docs/
- **Document decisions**: Keep notes on why scripts were disabled

## Agent Context
**AGENT_CONTEXT**: Disabled scripts that don't run during bash startup
**ARCHITECTURE**: Exclusion pattern - scripts are explicitly not loaded
**DESIGN_PATTERN**: Safe storage for non-active but potentially useful code