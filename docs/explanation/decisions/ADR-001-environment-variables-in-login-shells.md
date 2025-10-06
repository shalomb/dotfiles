# ADR-001: Environment Variables in Login Shells

## Status
Accepted

## Context
The dotfiles repository was experiencing issues with PATH and environment variables not being properly loaded in new tmux windows and SSH sessions. The problem was that environment variables (PATH, MANPATH, etc.) were being set in `bashrc` instead of `bash_profile`, which caused login shells to not inherit the proper environment.

### The Problem
- New tmux windows had minimal PATH (`/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games`)
- `ghostship` prompt was not available in new windows
- SSH sessions lacked proper environment setup
- Multiple competing PATH sources caused inconsistency

### Bash Startup File Behavior
According to the bash manpage:
- **Login shells** source: `/etc/profile` → `~/.bash_profile` → `~/.bash_login` → `~/.profile` (first one found)
- **Interactive non-login shells** source: `/etc/bash.bashrc` → `~/.bashrc`
- **Non-terminal shells** source: `~/.bashrc` (which should source `bash_profile`)

## Decision
Move environment variables (PATH, MANPATH, etc.) from `bashrc` to `bash_profile` to ensure proper initialization order for all shell types.

### Implementation
1. **Move PATH setup** from `~/.config/bash/bashrc` to `~/.bash_profile`
2. **Keep shell features** (functions, aliases, options) in `bashrc`
3. **Maintain chain**: `bashrc` → `bash_profile` for interactive shells
4. **Add ADR documentation** to both files

### File Structure
```
~/.bash_profile:
  - Environment variables (PATH, MANPATH, etc.)
  - Login shell setup
  - Sources bashrc for shell features

~/.config/bash/bashrc:
  - Shell features (functions, aliases, options)
  - Interactive shell setup
  - Sources bash_profile for environment
```

## Consequences

### Positive
- ✅ **Login shells** get environment from `bash_profile`
- ✅ **Interactive shells** get environment from `bashrc` → `bash_profile`
- ✅ **Non-terminal shells** get environment from `bashrc` → `bash_profile`
- ✅ **Single source of truth** for environment variables
- ✅ **Follows bash manpage best practices**
- ✅ **Fixes tmux new window PATH issues**

### Negative
- ⚠️ **Slight complexity** in understanding the chain
- ⚠️ **Requires careful ordering** to prevent infinite recursion

### Risks
- **Infinite recursion**: Mitigated by `BASH_RC_SOURCED` flag
- **Environment conflicts**: Resolved by single source of truth
- **Backward compatibility**: Maintained through proper chaining

## Implementation Details

### bash_profile Changes
```bash
# Load environment variables (PATH, MANPATH, etc.) for all shell types
if [[ -f ~/.config/bash/rc.d/00-path ]]; then
    source ~/.config/bash/rc.d/00-path
fi

# Prevent infinite recursion
if [[ -n "$BASH_RC_SOURCED" ]]; then
  return 0
fi

# Source bashrc for shell features
if [[ -r ~/.config/bash/bashrc ]]; then
  source ~/.config/bash/bashrc
fi
```

### bashrc Changes
```bash
# Set flag to prevent infinite recursion
export BASH_RC_SOURCED=1

# Note: PATH and other environment variables are now loaded from bash_profile
# This ensures proper initialization order for all shell types
```

## Testing
- ✅ Login shells (`bash -l`) get full PATH
- ✅ Interactive shells (`bash -i`) get full PATH  
- ✅ New tmux windows get full PATH and ghostship prompt
- ✅ SSH sessions get proper environment
- ✅ Non-terminal shells get proper environment

## References
- [Bash Manual - INVOCATION](https://www.gnu.org/software/bash/manual/bash.html#Bash-Startup-Files)
- [Bash Startup Files Best Practices](https://mywiki.wooledge.org/DotFiles)