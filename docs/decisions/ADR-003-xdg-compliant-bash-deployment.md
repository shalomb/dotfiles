# ADR-003: XDG-Compliant Bash Configuration Deployment

## Status
**ACCEPTED** - Implemented and tested

## Context

The bash configuration deployment system had several pain points:

1. **Mixed deployment strategies**: Repository used symlinks, home directory used hard links
2. **XDG non-compliance**: Bash doesn't natively support `.config/bash/` paths
3. **Symlink chain fragility**: Hard links worked but symlinks would break during sync
4. **Deployment complexity**: Need to maintain different link types across systems

### Current State Analysis

**Repository Structure (XDG-Compliant)**:
```
~/.config/dotfiles/.bashrc → symlink → .config/bash/bashrc
~/.config/dotfiles/.bash_profile → symlink → .config/bash/profile
```

**Home Directory Structure (Mixed)**:
```
~/.bashrc → hard link → ~/.config/dotfiles/.config/bash/bashrc
~/.bash_profile → hard link → ~/.config/dotfiles/.config/bash/profile
```

## Decision

We will implement a **hybrid XDG-compliant approach** that:

1. **Standardizes on symlinks** for home directory deployment
2. **Maintains XDG compliance** in the repository structure
3. **Provides deployment tools** for consistent symlink creation
4. **Ensures backward compatibility** with existing configurations

### Implementation Strategy

1. **Create enhanced deployment script** (`scripts/deploy-bash-xdg.sh`)
2. **Convert hard links to symlinks** in home directory
3. **Maintain XDG-compliant paths** in repository
4. **Provide verification tools** for deployment status

## Rationale

### Why Symlinks Over Hard Links

1. **XDG Compliance**: Symlinks maintain the XDG Base Directory specification
2. **Cross-filesystem compatibility**: Symlinks work across different filesystems
3. **Repository consistency**: Repository already uses symlinks internally
4. **Easier debugging**: Symlinks are easier to inspect and understand

### Why XDG-Compliant Paths

1. **Standard compliance**: Follows XDG Base Directory specification
2. **Tool compatibility**: Many tools expect XDG-compliant paths
3. **Clean organization**: Separates configuration from home directory clutter
4. **Future-proofing**: Aligns with modern configuration management practices

### Why Hybrid Approach

1. **Backward compatibility**: Existing configurations continue to work
2. **Gradual migration**: Can be implemented incrementally
3. **Flexibility**: Supports both symlinks and hard links as needed
4. **Error handling**: Provides fallback mechanisms

## Consequences

### Positive

- ✅ **XDG compliance**: Full compliance with XDG Base Directory specification
- ✅ **Consistent deployment**: All systems use the same symlink approach
- ✅ **Easier maintenance**: Symlinks are easier to manage than hard links
- ✅ **Cross-platform compatibility**: Works across different filesystems
- ✅ **Better debugging**: Clear symlink chains for troubleshooting

### Negative

- ❌ **Symlink fragility**: Symlinks can break if target files move
- ❌ **Permission complexity**: Symlinks may have different permission handling
- ❌ **Tool compatibility**: Some tools may not handle symlinks properly

### Neutral

- 🔄 **Migration effort**: Requires converting existing hard links to symlinks
- 🔄 **Documentation updates**: Need to update deployment documentation

## Implementation Details

### Deployment Script

Created `scripts/deploy-bash-xdg.sh` with:

- **Symlink creation**: Creates symlinks instead of hard links
- **Error handling**: Robust error handling and logging
- **Verification**: Status checking and validation
- **Force mode**: Safe overwriting of existing files

### File Structure

**Repository (XDG-Compliant)**:
```
~/.config/dotfiles/
├── .bashrc → .config/bash/bashrc
├── .bash_profile → .config/bash/profile
├── .logout → .config/bash/logout
└── .config/bash/
    ├── bashrc
    ├── profile
    └── logout
```

**Home Directory (Symlinks)**:
```
~/
├── .bashrc → ~/.config/dotfiles/.config/bash/bashrc
├── .bash_profile → ~/.config/dotfiles/.config/bash/profile
└── .logout → ~/.config/dotfiles/.config/bash/logout
```

### Usage

```bash
# Deploy bash configurations with XDG compliance
./scripts/deploy-bash-xdg.sh deploy

# Verify deployment status
./scripts/deploy-bash-xdg.sh status

# Check specific configuration
./scripts/deploy-bash-xdg.sh verify
```

## Testing

### Verification Commands

```bash
# Check symlink status
ls -la ~/.bashrc ~/.bash_profile ~/.logout

# Verify symlink targets
readlink ~/.bashrc ~/.bash_profile ~/.logout

# Test bash configuration
bash -c "source ~/.bashrc && echo 'PATH: $PATH'"
```

### Test Results

- ✅ All bash configuration files deployed as symlinks
- ✅ Symlinks point to XDG-compliant paths
- ✅ Bash configuration loads correctly
- ✅ PATH and environment variables work properly

## Alternatives Considered

### 1. Pure Hard Links
- **Pros**: Simple, works across filesystems
- **Cons**: Not XDG-compliant, harder to debug

### 2. Copy Deployment
- **Pros**: No link fragility
- **Cons**: No synchronization, duplication

### 3. Environment Variable Approach
- **Pros**: Flexible, XDG-compliant
- **Cons**: Complex setup, tool compatibility issues

### 4. Wrapper Scripts
- **Pros**: Clean separation
- **Cons**: Extra indirection, maintenance overhead

## References

- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
- [Bash Startup Files Documentation](https://www.gnu.org/software/bash/manual/html_node/Bash-Startup-Files.html)
- [Symlink vs Hard Link Comparison](https://en.wikipedia.org/wiki/Symbolic_link#Hard_links)

## Related ADRs

- [ADR-001: Environment Variables in Login Shells](ADR-001-environment-variables-in-login-shells.md)
- [ADR-002: Tmuxie Script Replacement](ADR-002-tmuxie-script-replacement.md)

---

*This ADR was created to address the bash configuration deployment pain points and establish a consistent, XDG-compliant approach for managing bash startup files.*