# ADR-002: Tmuxie Script Replacement

## Status
Accepted

## Context
The original `tmuxie` was a Go binary that provided tmux session management functionality. However, it had several issues:

### Problems with Go Binary
- **Terminal compatibility issues**: "open terminal failed: not a terminal" errors in SSH contexts
- **Limited fzf integration**: Basic functionality without advanced previews
- **Hard to customize**: Required Go compilation for changes
- **PATH issues**: Not finding tools in popup environments
- **Session management bugs**: Incorrect tmux command usage (`attach-client` vs `attach-session`)

### Requirements
- **Enhanced fzf integration**: README previews, git status, directory stats
- **SSH compatibility**: Work reliably in SSH contexts
- **Session management**: Proper create/attach/switch logic
- **Customizable**: Easy to modify and extend
- **Reliable**: Handle edge cases and error conditions

## Decision
Replace the Go binary `tmuxie` with a custom bash script that provides enhanced functionality and better integration with the shell environment.

### Implementation
1. **Create bash script** at `~/.local/bin/tmuxie`
2. **Enhanced fzf integration** with README previews
3. **Proper session management** with correct tmux commands
4. **SSH compatibility** with appropriate error handling
5. **Remove Go binary** to avoid conflicts

### Script Features
- **Project selection** (`tmuxie -s`): Uses `gum projects` + fzf with README preview
- **Session selection** (`tmuxie -l`): Lists existing sessions with pane preview
- **Interactive mode** (`tmuxie -i`): Choose between projects or sessions
- **Direct session creation** (`tmuxie session-name`): Create/attach to named session
- **SSH compatibility**: Graceful handling of terminal context issues

## Consequences

### Positive
- ✅ **Enhanced fzf integration**: README previews, better UX
- ✅ **SSH compatibility**: Works reliably in SSH contexts
- ✅ **Easy customization**: Bash script is easy to modify
- ✅ **Better error handling**: Proper session existence checking
- ✅ **Correct tmux commands**: Uses `attach-session` instead of `attach-client`
- ✅ **No compilation required**: Pure bash script

### Negative
- ⚠️ **Performance**: Slightly slower than compiled Go binary
- ⚠️ **Dependencies**: Relies on bash, fzf, gum, tmux

### Risks
- **Script complexity**: Mitigated by modular function design
- **Error handling**: Addressed with proper conditionals and error messages
- **SSH compatibility**: Tested and working in SSH contexts

## Implementation Details

### Core Functions
```bash
function sessionize() {
  # Create or attach to session with proper directory handling
}

function tmux-attach() {
  # Attach to existing session with SSH compatibility
}

function select_projects() {
  # Enhanced fzf integration with README preview
}

function select_sessions() {
  # Session selection with pane preview
}
```

### Session Management Logic
1. **Check if session exists**: Use `tmux has-session`
2. **Create detached session**: Use `tmux new-session -d`
3. **Attach appropriately**: Handle in-tmux vs outside-tmux contexts
4. **SSH compatibility**: Show helpful messages instead of failing

### fzf Integration
- **README preview**: Show project README.md content
- **Session preview**: Show current pane content
- **Keyboard shortcuts**: Ctrl+/ to toggle preview
- **Clean display**: Strip `~/` from paths for better readability

## Testing
- ✅ **Project selection**: Works with fzf and README preview
- ✅ **Session management**: Proper create/attach/switch
- ✅ **SSH compatibility**: Works in SSH contexts
- ✅ **Error handling**: Graceful handling of edge cases
- ✅ **tmux integration**: Proper popup display and session switching

## Migration
1. **Remove Go binary**: `rm ~/.local/share/go/bin/tmuxie`
2. **Deploy bash script**: Copy to `~/.local/bin/tmuxie`
3. **Update tmux bindings**: Use new script in key bindings
4. **Test functionality**: Verify all features work correctly

## References
- [Tmux Manual](https://man.openbsd.org/tmux)
- [fzf Documentation](https://github.com/junegunn/fzf)
- [Bash Scripting Best Practices](https://google.github.io/styleguide/shellguide.html)