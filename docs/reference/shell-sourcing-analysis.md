# Shell Sourcing Flow Analysis

## Shell Types and Sourcing Behavior

### 1. INTERACTIVE LOGIN SHELL
**Examples**: SSH login, console login, `bash --login`
**Sourcing Order**:
```
1. /etc/profile (system-wide)
2. ~/.bash_profile (symlink to ~/.config/bash/profile)
3. ~/.config/bash/profile sources:
   - ~/.config/profile.d/*.sh (environment variables)
   - ~/.config/bash/rc.d/00-path (PATH setup)
   - ~/.bashrc (symlink to ~/.config/bash/bashrc)
4. ~/.config/bash/bashrc sources:
   - XDG variables setup
   - ~/.config/bash/enabled/*.sh (user tools)
   - ~/.config/bash/rc.d/01-functions (core functions)
   - ~/.config/bash/rc.d/02-colours (colors)
   - ~/.config/bash/aliases (aliases)
   - bash completion
   - ghostship prompt setup
```

### 2. INTERACTIVE NON-LOGIN SHELL
**Examples**: `bash`, `tmux new-window`, terminal emulator
**Sourcing Order**:
```
1. ~/.bashrc (symlink to ~/.config/bash/bashrc)
2. ~/.config/bash/bashrc sources:
   - XDG variables setup
   - ~/.config/bash/enabled/*.sh (user tools)
   - ~/.config/bash/rc.d/01-functions (core functions)
   - ~/.config/bash/rc.d/02-colours (colors)
   - ~/.config/bash/aliases (aliases)
   - bash completion
   - ghostship prompt setup
```

### 3. NON-INTERACTIVE LOGIN SHELL
**Examples**: `bash --login -c "command"`, SSH command execution
**Sourcing Order**:
```
1. /etc/profile (system-wide)
2. ~/.bash_profile (symlink to ~/.config/bash/profile)
3. ~/.config/bash/profile sources:
   - ~/.config/profile.d/*.sh (environment variables)
   - ~/.config/bash/rc.d/00-path (PATH setup)
   - ~/.bashrc (with BASH_PROFILE_SOURCED=1)
4. ~/.config/bash/bashrc sources:
   - XDG variables setup
   - ~/.config/bash/enabled/*.sh (user tools)
   - [SKIPS interactive-only sections due to BASH_PROFILE_SOURCED check]
```

### 4. NON-INTERACTIVE NON-LOGIN SHELL
**Examples**: `bash -c "command"`, script execution
**Sourcing Order**:
```
1. ~/.bashrc (symlink to ~/.config/bash/bashrc)
2. ~/.config/bash/bashrc sources:
   - XDG variables setup
   - ~/.config/bash/enabled/*.sh (user tools)
   - [RETURNS EARLY due to non-interactive check]
```

## Critical Analysis

### ✅ CONSISTENT BEHAVIOR

**1. XDG Variables**: Always set in bashrc (lines 7-17)
- Available in ALL shell types
- Set before interactive check
- Consistent across all contexts

**2. User Tools (enabled/)**: Always loaded (lines 23-33)
- Available in ALL shell types
- Loaded before interactive check
- Consistent tool availability

**3. Environment Variables (PATH)**: Always loaded via profile
- Login shells: via ~/.bash_profile → ~/.config/bash/profile → 00-path
- Non-login shells: via ~/.bashrc → profile sourcing
- Consistent PATH setup

### ✅ INTERACTIVE CHECK LOGIC

**Lines 39-50 in bashrc**:
```bash
case $- in
    *i*) ;;  # Interactive - continue
      *) 
        # Non-interactive - check if sourced from bash_profile
        if [ -n "${BASH_PROFILE_SOURCED:-}" ]; then
            :  # Allow sourcing for login shells
        else
            return  # Exit early for pure non-interactive
        fi
        ;;
esac
```

**This ensures**:
- Interactive shells get full configuration
- Login shells get full configuration (even if non-interactive)
- Pure non-interactive shells get minimal configuration
- No infinite loops or circular dependencies

### ✅ PROFILE SOURCING LOGIC

**Lines 63-67 in profile**:
```bash
if [ -f ~/.bashrc ]; then
    export BASH_PROFILE_SOURCED=1
    . ~/.bashrc
    unset BASH_PROFILE_SOURCED
fi
```

**This ensures**:
- Login shells always source bashrc
- BASH_PROFILE_SOURCED flag prevents early return
- Clean flag management (set/unset)

### ✅ NO CIRCULAR DEPENDENCIES

**Profile**:
- Sources bashrc (line 65)
- Does NOT source itself
- Does NOT source other profile files

**Bashrc**:
- Does NOT source profile
- Does NOT source itself
- Only sources rc.d/ and enabled/ files

### ✅ CONSISTENT TOOL LOADING

**All shell types get**:
1. XDG variables
2. User tools from enabled/
3. Core functions from rc.d/
4. Colors from rc.d/
5. Aliases
6. PATH setup (via profile)

**Only interactive shells get**:
1. Shell options (ignoreeof, histappend)
2. History configuration
3. Ghostship prompt
4. Completion setup
5. Window size checking

## Potential Issues Analysis

### ❌ DUPLICATE COMPLETION LOADING
**Lines 88-95 and 150-157 in bashrc**:
```bash
# First completion block (lines 88-95)
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

# Second completion block (lines 150-157) - DUPLICATE!
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi
```

**Impact**: Completion loaded twice in interactive shells
**Severity**: Low (idempotent, but inefficient)

### ❌ DUPLICATE PS1 SETTING
**Lines 114, 119, and 137 in bashrc**:
```bash
# Line 114 (ghostship fallback)
PS1='\u@\h:\w\$ '

# Line 119 (ghostship not available)
PS1='\u@\h:\w\$ '

# Line 137 (final override)
PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w\$ '
```

**Impact**: PS1 set multiple times, final value wins
**Severity**: Low (functional, but confusing)

### ❌ PROFILE RETURN LOGIC
**Lines 45-47 in profile**:
```bash
if [ -z "${PS1:-}" ] && [ -z "${SSH_CLIENT:-}" ] && [ -z "${SSH_TTY:-}" ]; then
  return 0
fi
```

**Impact**: May skip bashrc sourcing in some non-interactive contexts
**Severity**: Medium (could break tool availability)

## Recommendations

### 1. FIX DUPLICATE COMPLETION LOADING
Remove the second completion block (lines 150-157)

### 2. FIX DUPLICATE PS1 SETTING
Consolidate PS1 setting to one location

### 3. SIMPLIFY PROFILE RETURN LOGIC
Remove the complex return logic, let bashrc handle interactive checks

### 4. ADD SOURCING DEBUG
Add DOTFILES_DEBUG output to show which files are being sourced

## Conclusion

**Overall Assessment**: ✅ **MOSTLY CONSISTENT**

The shell sourcing flow is **fundamentally sound** with:
- ✅ No circular dependencies
- ✅ Consistent tool loading across shell types
- ✅ Proper interactive/non-interactive handling
- ✅ Clean separation of concerns

**Minor Issues**:
- ❌ Duplicate completion loading (inefficient)
- ❌ Duplicate PS1 setting (confusing)
- ❌ Complex profile return logic (unnecessary)

**Recommendation**: Fix the minor issues for cleaner, more maintainable code.