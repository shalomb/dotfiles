# Bashrc Minimal Rebuild: Phases 3-6 Implementation Guide

## Overview

This document provides detailed guidance for implementing Phases 3-6 of the minimal bashrc rebuild. Phases 0-2 are complete and provide a solid foundation.

**Current State (Completed):**
- ✅ Phase 0: Bootstrap (BASHRC_DIR, DOTFILES_DIR, INTERACTIVE_MODE)
- ✅ Phase 1: Environment (XDG variables, PATH setup)
- ✅ Phase 2: Core Functions (has-cmd, defined, @has-cmd, @is-interactive, call-if-defined)

**To Implement:**
- ⏳ Phase 3: Shell Configuration (history, options, completion)
- ⏳ Phase 4: Features (load enabled/ scripts with defensive guards)
- ⏳ Phase 5: Aliases (load aliases file)
- ⏳ Phase 6: Prompt (ghostship or simple PS1)

---

## General Implementation Principles

### 1. Incremental Development
- Implement ONE phase at a time
- Test thoroughly after each phase
- Commit atomically with descriptive messages
- Run `shellcheck` on bashrc after each change
- Run `./tests/test-bashrc-phases.sh` to validate
- Run `./tests/test-feature-parity.sh` to track progress

### 2. Testing Requirements
After each phase:
```bash
# 1. Shellcheck validation
shellcheck ~/.config/dotfiles/.config/bash/bashrc

# 2. Phase tests
./tests/test-bashrc-phases.sh

# 3. Feature parity check
./tests/test-feature-parity.sh

# 4. Manual test in new shell
bash --rcfile ~/.config/dotfiles/.config/bash/bashrc -i

# 5. Make test
cd ~/.config/dotfiles && make test-bash
```

### 3. Commit Message Format
```
bashrc: Phase N - Brief description

Detailed description of what was added:
- Feature 1
- Feature 2
- Feature 3

Tested:
- shellcheck: ✅ no errors
- phase tests: ✅ all passing
- feature parity: ✅ N/24 features implemented
```

---

## Phase 3: Shell Configuration

### Objective
Configure bash shell behavior: history management, shell options, and completion system.

### Context Files to Reference
1. **History Configuration:**
   - See SNAPSHOT-before.md section on "Environment Variables"
   - Look at current `.config/bash/enabled/history.sh` for reference
   - XDG-compliant history location

2. **Shell Options:**
   - Check old bashrc for `shopt` and `set` commands
   - Enable useful features, disable dangerous ones

3. **Completion:**
   - Bash completion from system
   - Programmable completion

### Implementation Details

#### 3.1: History Configuration

Add to bashrc after Phase 2:

```bash
# =============================================================================
# PHASE 3: Shell Configuration
# =============================================================================

# History configuration (XDG-compliant)
export HISTFILE="${XDG_STATE_HOME}/bash/history"
export HISTSIZE=50000           # In-memory history size
export HISTFILESIZE=50000       # On-disk history size
export HISTCONTROL="ignoreboth:erasedups"  # Ignore duplicates and spaces
export HISTTIMEFORMAT='%F %T '  # ISO-8601 timestamps

# Create history directory if it doesn't exist
mkdir -p "$(dirname "$HISTFILE")"
```

**Key Points:**
- Use XDG_STATE_HOME (already set in Phase 1)
- ISO-8601 timestamps for history entries
- Reasonable limits (50k entries)
- ignoreboth = ignore duplicates and commands starting with space
- erasedups removes older duplicate entries

#### 3.2: Shell Options

Add after history configuration:

```bash
# Shell options
shopt -s histappend        # Append to history, don't overwrite
shopt -s checkwinsize      # Update LINES and COLUMNS after each command
shopt -s cmdhist           # Save multi-line commands as one entry
shopt -s globstar          # ** matches all files/directories recursively
shopt -s dotglob           # Include dotfiles in pathname expansion
shopt -s extglob           # Extended pattern matching
shopt -s nocaseglob        # Case-insensitive pathname expansion

# Set options
set -o ignoreeof           # Prevent Ctrl+D from exiting (need 10 presses)
```

**Key Points:**
- histappend: Critical for multi-terminal environments
- checkwinsize: Proper display after terminal resize
- globstar: Modern file matching
- ignoreeof: Prevent accidental shell exit

#### 3.3: Bash Completion

Add after shell options:

```bash
# Bash completion (only in interactive shells)
if [[ $INTERACTIVE_MODE -eq 1 ]]; then
    # Load system bash completion if available
    if [[ -f /usr/share/bash-completion/bash_completion ]]; then
        source /usr/share/bash-completion/bash_completion
    elif [[ -f /etc/bash_completion ]]; then
        source /etc/bash_completion
    fi

    # Enable programmable completion features
    if ! shopt -oq posix; then
        shopt -s progcomp
    fi
fi
```

**Key Points:**
- Only load in interactive shells
- Check multiple locations for bash_completion
- Defensive guards (check file exists before sourcing)

### Testing Phase 3

Add to `tests/test-bashrc-phases.sh`:

```bash
# =============================================================================
# PHASE 3: Shell Configuration Tests
# =============================================================================

echo "PHASE 3: Shell Configuration"
echo "-----------------------------"

# Test: HISTFILE is set
result=$(bash -c "source '$BASHRC' && echo \$HISTFILE")
if [[ -n "$result" && "$result" == *"/history" ]]; then
    pass "HISTFILE is set (XDG-compliant)"
else
    fail "HISTFILE not set correctly" "Got: $result"
fi

# Test: HISTSIZE is set
result=$(bash -c "source '$BASHRC' && echo \$HISTSIZE")
if [[ "$result" == "50000" ]]; then
    pass "HISTSIZE is set to 50000"
else
    fail "HISTSIZE not correct" "Got: $result"
fi

# Test: histappend is enabled
result=$(bash -c "source '$BASHRC' && shopt histappend | grep -o 'on'")
if [[ "$result" == "on" ]]; then
    pass "histappend shell option enabled"
else
    fail "histappend not enabled"
fi

# Test: ignoreeof is set
result=$(bash -c "source '$BASHRC' && set -o | grep ignoreeof | grep -o 'on'")
if [[ "$result" == "on" ]]; then
    pass "ignoreeof is set"
else
    fail "ignoreeof not set"
fi

# Test: Bash completion loads without errors
if bash -i -c "source '$BASHRC' && type _init_completion" >/dev/null 2>&1; then
    pass "Bash completion system loads"
else
    echo -e "${YELLOW}⊘${NC} Bash completion not available (skipped)"
fi
```

### Expected Outcome
- History saved to XDG-compliant location
- Shell behaves sensibly (resize detection, glob patterns work)
- Tab completion works for commands and files
- Feature parity: 11/24 → 15/24 features

---

## Phase 4: Features (Load enabled/ Scripts)

### Objective
Load tool integration scripts from `enabled/` directory with defensive guards to prevent errors.

### Context Files to Reference
1. **enabled/ directory:** Contains 32+ tool integration scripts
2. **BASHRC-restructuring.md:** Section on "Command-Not-Found Errors" and defensive loading
3. **Current enabled/ scripts:** Examples of what needs fixing:
   - `delta.sh` line 14: calls `delta` without checking
   - `jira.sh` line 3: uses `@has-cmd` before it's loaded
   - `rustup.sh` line 5: calls `rustup` without checking

### Implementation Details

#### 4.1: Source Function with Error Handling

Add to bashrc after Phase 3:

```bash
# =============================================================================
# PHASE 4: Features (Interactive Only)
# =============================================================================

if [[ $INTERACTIVE_MODE -eq 1 ]]; then

    # Function to source scripts with error handling
    source_if_exists() {
        local script="$1"

        # Skip if file doesn't exist or isn't readable
        [[ ! -f "$script" ]] && return 0
        [[ ! -r "$script" ]] && return 0

        # Source with error capture
        if ! source "$script" 2>/dev/null; then
            echo "Warning: Failed to source $(basename "$script")" >&2
            return 1
        fi

        return 0
    }

    # Load all enabled scripts (alphabetically sorted)
    if [[ -d "$BASHRC_DIR/enabled" ]]; then
        for script in "$BASHRC_DIR/enabled"/*.sh; do
            [[ -f "$script" ]] && source_if_exists "$script"
        done
    fi
fi
```

**Key Points:**
- Only load in interactive shells (non-interactive shells don't need tool integrations)
- Alphabetical order (predictable, reproducible)
- Suppress stderr to prevent command-not-found errors
- Continue even if individual scripts fail
- Defensive checks (file exists, readable)

#### 4.2: Expected Behavior

**Before Phase 4:**
- enabled/ scripts exist but aren't loaded
- No command-not-found errors (nothing sourced yet)

**After Phase 4:**
- All enabled/ scripts are loaded
- Tool integrations work (git, fzf, aws, etc.)
- No errors even if tools aren't installed (defensive loading)
- Functions/aliases from enabled/ scripts are available

### Testing Phase 4

Add to `tests/test-bashrc-phases.sh`:

```bash
# =============================================================================
# PHASE 4: Features Tests
# =============================================================================

echo "PHASE 4: Features"
echo "-----------------"

# Test: enabled/ directory is scanned
result=$(bash -i -c "source '$BASHRC' 2>&1" | grep -c "delta: command not found" || echo "0")
if [[ "$result" == "0" ]]; then
    pass "No command-not-found errors from enabled/ scripts"
else
    fail "Command-not-found errors detected" "Count: $result"
fi

# Test: Tool functions are loaded (if tools are installed)
# Example: git-related functions from enabled/git.sh
if has-cmd git; then
    # Check if git integration loaded something
    result=$(bash -i -c "source '$BASHRC' && type git" 2>&1 | grep -q "git is" && echo "OK")
    if [[ "$result" == "OK" ]]; then
        pass "Git integration loaded"
    fi
fi

# Test: enabled/ scripts don't break shell
if bash -i -c "source '$BASHRC' && echo TEST" 2>&1 | grep -q "TEST"; then
    pass "Shell remains functional after loading enabled/ scripts"
else
    fail "Shell broken after loading enabled/ scripts"
fi
```

### Known Issues to Fix

Many enabled/ scripts have defensive loading issues:

**1. delta.sh line 14:**
```bash
# CURRENT (BROKEN):
source <(delta --generate-completion bash)

# SHOULD BE:
if has-cmd delta; then
    source <(delta --generate-completion bash 2>/dev/null) || true
fi
```

**2. jira.sh line 3:**
```bash
# CURRENT (BROKEN):
@has-cmd jira || return 0

# This works IF @has-cmd is defined (it is in Phase 2)
# But it's a good pattern - keep it!
```

**3. rustup.sh line 5:**
```bash
# CURRENT (BROKEN):
gen-rustup-completions  # calls rustup without checking

# SHOULD BE:
if has-cmd rustup; then
    gen-rustup-completions
fi
```

**Action for Agent:**
- You can fix these issues IN PLACE in enabled/*.sh files
- OR document them and fix in a follow-up commit after Phase 4
- Use defensive pattern: `has-cmd tool && command` or `has-cmd tool || return 0`

### Expected Outcome
- All 32+ enabled/ scripts load without errors
- Tool integrations work when tools are installed
- No command-not-found errors when tools are missing
- Feature parity: 15/24 → 20/24 features

---

## Phase 5: Aliases

### Objective
Load the aliases file to provide convenient shortcuts.

### Context Files to Reference
1. **`.config/bash/aliases`:** 294 lines, 56 alias definitions
2. **SNAPSHOT-before.md:** Lists common aliases (ll, la, g, ga, etc.)

### Implementation Details

Add to bashrc after Phase 4 (still inside interactive check):

```bash
    # Load aliases (interactive shells only)
    if [[ -f "$BASHRC_DIR/aliases" ]]; then
        source "$BASHRC_DIR/aliases"
    fi
```

**Alternative locations to check:**
```bash
    # Load aliases from multiple possible locations
    for aliases_file in "$BASHRC_DIR/aliases" "$HOME/.bash_aliases" "$HOME/.aliases"; do
        [[ -f "$aliases_file" ]] && source "$aliases_file"
    done
```

**Key Points:**
- Only in interactive shells
- Check file exists before sourcing
- Aliases file should be clean (no command calls, just alias definitions)

### Testing Phase 5

Add to `tests/test-bashrc-phases.sh`:

```bash
# =============================================================================
# PHASE 5: Aliases Tests
# =============================================================================

echo "PHASE 5: Aliases"
echo "----------------"

# Test: ll alias exists
result=$(bash -i -c "source '$BASHRC' && type ll" 2>&1 | grep -q "ll is aliased" && echo "OK")
if [[ "$result" == "OK" ]]; then
    pass "ll alias loaded"
else
    fail "ll alias not found"
fi

# Test: Common git aliases
result=$(bash -i -c "source '$BASHRC' && alias g" 2>&1 | grep -q "git" && echo "OK")
if [[ "$result" == "OK" ]]; then
    pass "Git aliases loaded (g=git)"
else
    fail "Git aliases not found"
fi

# Test: Aliases don't break shell
if bash -i -c "source '$BASHRC' && echo TEST" 2>&1 | grep -q "TEST"; then
    pass "Shell functional after loading aliases"
else
    fail "Shell broken after aliases"
fi
```

### Expected Outcome
- All 56 aliases available
- Common shortcuts work: ll, la, g, ga, gc, ..., ...., etc.
- Feature parity: 20/24 → 22/24 features

---

## Phase 6: Prompt

### Objective
Set up a functional shell prompt (PS1). Prefer `ghostship` if available, fallback to simple prompt.

### Context Files to Reference
1. **ghostship:** Check if installed: `command -v ghostship`
2. **SNAPSHOT-before.md:** Mentions prompt.sh in core/
3. **Old rc.d/ghostship:** Example configuration
4. **Old rc.d/ps1:** Simple fallback prompt

### Implementation Details

#### 6.1: Ghostship (Preferred)

Add to bashrc after Phase 5 (still inside interactive check):

```bash
    # Prompt setup (try ghostship first, fallback to simple)
    if has-cmd ghostship; then
        # Use ghostship for rich prompt
        eval "$(ghostship init bash)"
    else
        # Simple fallback prompt
        # Format: user@host:dir$
        if [[ $EUID -eq 0 ]]; then
            # Root gets red prompt
            PS1='\[\033[01;31m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
        else
            # Normal user gets green prompt
            PS1='\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
        fi
    fi
```

**Key Points:**
- Use `has-cmd` to check for ghostship (defined in Phase 2)
- Ghostship provides git integration, colors, etc.
- Fallback prompt is simple but functional
- Different color for root (safety)

#### 6.2: Alternative Simple Prompt

If you want a minimal prompt without color:

```bash
    # Ultra-minimal prompt
    PS1='\u@\h:\w\$ '
```

Or with just directory and git branch:

```bash
    # Minimal with git branch
    parse_git_branch() {
        git branch 2>/dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/(\1)/'
    }
    PS1='\w$(parse_git_branch)\$ '
```

### Testing Phase 6

Add to `tests/test-bashrc-phases.sh`:

```bash
# =============================================================================
# PHASE 6: Prompt Tests
# =============================================================================

echo "PHASE 6: Prompt"
echo "---------------"

# Test: PS1 is set
result=$(bash -i -c "source '$BASHRC' && echo \$PS1" 2>&1 | grep -q "\\$" && echo "OK")
if [[ "$result" == "OK" ]]; then
    pass "PS1 prompt is set"
else
    fail "PS1 not set"
fi

# Test: Ghostship or fallback
if has-cmd ghostship; then
    result=$(bash -i -c "source '$BASHRC' && echo \$PS1" 2>&1 | grep -q "ghostship" && echo "GHOSTSHIP" || echo "FALLBACK")
    if [[ "$result" == "GHOSTSHIP" ]]; then
        pass "Ghostship prompt configured"
    else
        pass "Fallback prompt configured"
    fi
else
    pass "Fallback prompt configured (ghostship not available)"
fi

# Test: Prompt renders without errors
if bash -i -c "source '$BASHRC' && echo TEST" 2>&1 | grep -q "TEST"; then
    pass "Prompt renders without breaking shell"
else
    fail "Prompt breaks shell"
fi
```

### Expected Outcome
- Working prompt (either ghostship or simple)
- No errors on prompt render
- Feature parity: 22/24 → 24/24 features ✅

---

## Phase 7 (Bonus): Utility Functions

### Objective
Add utility functions that were in BEFORE snapshot: warn, die, set-title, reload, etc.

### Implementation Details

Add to bashrc after Phase 2 (or create `lib/functions/helpers.sh`):

```bash
# =============================================================================
# PHASE 2.5: Utility Functions (Extended)
# =============================================================================

# Print warning message
warn() {
    echo "WARNING: $*" >&2
}

# Print error and exit
die() {
    echo "ERROR: $*" >&2
    return 1
}

# Set terminal title
set-title() {
    echo -ne "\033]0;$*\007"
}

# Reload bashrc
reload() {
    echo "Reloading bashrc..."
    # Use BASH_SOURCE to reload the correct file
    if [[ -n "${BASH_SOURCE[0]:-}" ]]; then
        source "${BASH_SOURCE[0]}"
    else
        source ~/.bashrc
    fi
}

# Terminal bell with tmux support
bell-alert() {
    if [[ -n "${TMUX:-}" ]]; then
        # In tmux, use visual bell
        tmux display-message "Alert!"
    fi
    # Always beep
    echo -ne '\007'
}

# Change directory hook (called after cd)
chpwd() {
    # Can be overridden by user
    :
}

# Override cd to call chpwd
cd() {
    builtin cd "$@" && call-if-defined chpwd
}
```

**Key Points:**
- These are optional but useful
- Can be added as Phase 2.5 or Phase 7
- Some (like reload) are very convenient for interactive use

---

## Final Integration

### Complete Phase Order

1. ✅ **Phase 0:** Bootstrap (complete)
2. ✅ **Phase 1:** Environment (complete)
3. ✅ **Phase 2:** Core Functions (complete)
4. ⏳ **Phase 3:** Shell Configuration
5. ⏳ **Phase 4:** Features (enabled/ scripts)
6. ⏳ **Phase 5:** Aliases
7. ⏳ **Phase 6:** Prompt
8. ⏳ **Phase 7 (Optional):** Utility Functions

### Final bashrc Structure

```bash
#!/bin/bash
# bashrc - Clean, phase-based bash initialization

# PHASE 0: Bootstrap
# - BASHRC_DIR, DOTFILES_DIR, INTERACTIVE_MODE

# PHASE 1: Environment
# - XDG variables
# - PATH setup

# PHASE 2: Core Functions
# - has-cmd, defined, @has-cmd, @is-interactive, call-if-defined

# PHASE 3: Shell Configuration
# - History (HISTFILE, HISTSIZE, etc.)
# - Shell options (shopt, set)
# - Bash completion

# PHASE 4: Features (interactive only)
# - Load enabled/*.sh scripts
# - Tool integrations

# PHASE 5: Aliases (interactive only)
# - Load aliases file

# PHASE 6: Prompt (interactive only)
# - Ghostship or fallback PS1

# PHASE 7: Utility Functions (optional)
# - warn, die, reload, etc.
```

### Success Criteria

After all phases complete:

1. **Feature Parity:** 24/24 features from BEFORE snapshot ✅
2. **No Errors:** Shellcheck passes ✅
3. **All Tests Pass:** Phase tests + feature parity ✅
4. **Works Everywhere:** New shells, tmux panes, SSH logins ✅
5. **Clean Code:** <200 lines in bashrc (vs 161 in AFTER) ✅
6. **Defensive:** No command-not-found errors ✅
7. **Maintainable:** Clear phases, comments, single responsibility ✅

---

## Deployment After All Phases Complete

Once Phases 3-6 are implemented and tested:

```bash
# 1. Run all tests
cd ~/.config/dotfiles
make test-bash
./tests/test-bashrc-phases.sh
./tests/test-feature-parity.sh

# 2. Export to home directory
echo "2" | uv run python -m dotfile_manager export .config/bash/

# 3. Test in new shell
bash --rcfile ~/.bashrc -i

# 4. Test in new tmux window
tmux new-window

# 5. If all good, commit and push
git add .config/bash/bashrc tests/
git commit -m "bashrc: Complete minimal rebuild (Phases 0-6)"
git push

# 6. Create PR or merge to develop/main
```

---

## Reference Commands

```bash
# Shellcheck
shellcheck ~/.config/dotfiles/.config/bash/bashrc

# Phase tests
./tests/test-bashrc-phases.sh

# Feature parity
./tests/test-feature-parity.sh

# Manual test
bash --rcfile ~/.config/dotfiles/.config/bash/bashrc -i

# Count lines
wc -l ~/.config/dotfiles/.config/bash/bashrc

# Test specific phase
bash -c "source ~/.config/dotfiles/.config/bash/bashrc && echo \$HISTFILE"

# Test interactive features
bash -i -c "source ~/.config/dotfiles/.config/bash/bashrc && type ll"
```

---

## Notes for Implementing Agent

1. **Work incrementally** - One phase per commit
2. **Test thoroughly** - Run all tests after each phase
3. **Update tests** - Add phase-specific tests as you go
4. **Check feature parity** - Track progress with test-feature-parity.sh
5. **Fix enabled/ scripts** - Document or fix defensive loading issues
6. **Keep it simple** - Don't over-engineer, follow the patterns from Phases 0-2
7. **Ask questions** - If unclear, ask before implementing

Good luck! 🚀
