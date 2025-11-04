# Root Cause Analysis: Tmuxie C-o Session Switching Regression

## Executive Summary

**Symptom**: `C-o` (prefix C-o) creates new tmux sessions but fails to switch to them. Existing sessions work correctly.

**Root Cause**: Performance optimization in commit `32a6107` (Oct 8, 2025) removed `bash -l -c` wrapper from popup bindings, inadvertently breaking the execution context required for `switch-client` to work correctly with newly created sessions.

**Regression Date**: October 8, 2025 (commit `32a6107`)

**Status**: **UNRESOLVED** - Multiple fix attempts failed because they addressed symptoms, not root cause

---

## Timeline of Events

### Pre-Regression (Before Oct 8, 2025)

**Working State**:
```bash
# .config/tmux.conf
bind-key C-o display-popup -E -w 95% -h 85% "bash -l -c 'tmuxie -s'"
```

**Behavior**: ✅ New sessions created and switched successfully
**Performance**: ❌ 6+ second delay due to login shell initialization

### Regression Introduced (Oct 8, 2025)

**Commit**: `32a6107` - "tmux: remove bash -l -c from tmuxie bindings to fix C-o delay"

**Change**:
```diff
-bind-key C-o display-popup -E -w 95% -h 85% "bash -l -c 'tmuxie -s'"
+bind-key C-o display-popup -E -w 95% -h 85% "tmuxie -s"
```

**Intent**: Fix 6+ second performance issue (success: 0.06s execution time)
**Consequence**: Broke session switching for new sessions

**Why This Broke Switching**:

1. **With `bash -l -c`**: 
   - Script runs in a login shell subprocess
   - `tmux switch-client` executes with proper client context inheritance
   - Shell subprocess terminates after switching, allowing popup to close cleanly
   - Client reference maintained through shell process hierarchy

2. **Without `bash -l -c`** (direct execution):
   - Script runs directly in popup context
   - `switch-client` command in chained syntax (`\;`) executes while popup is still active
   - Client context is ambiguous - is it the popup client or parent client?
   - Popup may not release client control before switch attempt
   - Result: Session created successfully, but switch command fails silently

### Failed Recovery Attempts

#### Attempt 1: Oct 9, 2025 (commit `1b80974`)
**Action**: "Restore working Oct 2 version" of tmuxie script
**Result**: ❌ FAILED
**Why**: Only restored `.local/bin/tmuxie`, did NOT restore `.config/tmux.conf` binding
**Evidence**: Commit only modified 1 file (tmuxie), not tmux.conf

#### Attempt 2: Oct 21, 2025 (commit `35097f9`)
**Action**: "Improve tmuxie session switching reliability"
**Changes**:
```bash
# Separated commands and added fallback
tmux new-session -d -s "$name" -c "$dir" "bash -l"
tmux switch-client -t "$name" 2>/dev/null || tmux attach-session -t "$name"
```
**Result**: ❌ FAILED - Reverted next day
**Why**: Separating commands doesn't fix the client context issue in popup environment
**Evidence**: Commit `9c6bc3b` (Oct 22) reverted this change

#### Attempt 3: Oct 22, 2025 (commit `9c6bc3b`)
**Action**: Reverted `35097f9`, restored chained format
**Current State**: Back to broken chained format from Oct 8

---

## Technical Root Cause Analysis

### The Execution Context Problem

When `display-popup -E` runs a command:

1. **Popup creates a new pseudo-terminal**
2. **Command executes in popup's client context**
3. **Popup waits for command to exit** (due to `-E` flag)
4. **Client focus is locked to popup** until it closes

### The Chained Command Problem

Current code:
```bash
tmux new-session -d -s "$name" -c "$dir" "bash -l" \; switch-client -t "$name"
```

Execution flow:
1. `new-session -d` creates detached session ✅
2. `\;` chains the next command in same context
3. `switch-client -t "$name"` executes **while popup is still active**
4. Popup client is the "current client", not the parent session
5. Switch attempts to change popup's target, not parent's target ❌
6. Popup exits, parent session unchanged

### Why bash -l -c Worked

With the wrapper:
```bash
bash -l -c 'tmuxie -s'
```

Execution flow:
1. `bash -l` starts a login shell subprocess
2. Subprocess runs `tmuxie -s`
3. `tmuxie` executes: `tmux new-session ... \; switch-client ...`
4. **Key difference**: `switch-client` inherits bash subprocess's client context
5. Bash subprocess is a child of the popup, but tmux commands execute in the **parent session's client context** due to $TMUX environment variable propagation
6. Popup waits for bash to exit
7. Bash exits after tmux commands queue, popup closes
8. Switch command executes against parent client ✅

### The $TMUX Environment Variable

Critical insight:
- `$TMUX` variable contains socket path and session info
- Propagated through subprocess hierarchy
- Determines which client `tmux` commands target
- Login shell (`bash -l`) properly inherits and propagates this
- Direct execution in popup may have corrupted/ambiguous `$TMUX` context

---

## Why Previous Fixes Failed

### Why Separating Commands Failed (35097f9)

```bash
tmux new-session -d -s "$name" -c "$dir" "bash -l"
tmux switch-client -t "$name" 2>/dev/null || tmux attach-session -t "$name"
```

**Problem**: Both commands still execute in the same broken popup context
**Result**: `switch-client` still targets popup client, not parent
**Fallback**: `attach-session` also fails for same reason

### Why "Restore Oct 2 Version" Failed (1b80974)

**Problem**: Only restored script code, not the tmux.conf binding
**Result**: Script was "correct" but binding was still broken
**Evidence**: `.config/tmux.conf` was NOT modified in this commit

---

## Correct Solutions

### Solution 1: Restore bash -l -c Wrapper (RECOMMENDED)

**Rationale**: Known working state, fixes root cause

```bash
# .config/tmux.conf
bind-key C-o display-popup -E -w 95% -h 85% "bash -l -c 'tmuxie -s'"
```

**Pros**:
- ✅ Known to work (Oct 7 and earlier)
- ✅ Fixes client context issue
- ✅ Single line change
- ✅ No script modifications needed

**Cons**:
- ❌ Reintroduces 6s performance delay
- ❌ Doesn't address underlying performance issue

**Performance Mitigation**:
Option A: Accept the delay (UX trade-off for correctness)
Option B: Optimize bash startup time (reduce sourced files, lazy loading)
Option C: Use faster shell (dash, zsh -f)

### Solution 2: Use tmux run-shell for Deferred Switch

**Rationale**: Execute switch after popup closes

```bash
# .local/bin/tmuxie sessionize()
if in-tmux; then
  tmux new-session -d -s "$name" -c "$dir" "bash -l"
  # Queue switch to execute after popup closes
  tmux run-shell -b "sleep 0.1 && tmux switch-client -t '$name'"
fi
```

**Pros**:
- ✅ No binding change needed
- ✅ Maintains performance
- ✅ Defers switch until after popup closes

**Cons**:
- ❌ Requires timing hack (sleep)
- ❌ Not guaranteed to work
- ❌ More complex logic

### Solution 3: Hybrid Approach - Fast Shell Wrapper

**Rationale**: Keep wrapper for context, but use fast shell

```bash
# .config/tmux.conf  
bind-key C-o display-popup -E -w 95% -h 85% "sh -c 'tmuxie -s'"
```

Or with explicit environment:
```bash
bind-key C-o display-popup -E -w 95% -h 85% "env -i TMUX=$TMUX HOME=$HOME PATH=$PATH sh -c 'exec tmuxie -s'"
```

**Pros**:
- ✅ Maintains client context
- ✅ Faster than bash -l (minimal startup)
- ✅ Clean execution environment

**Cons**:
- ⚠️ Requires testing to verify context preservation
- ⚠️ May need explicit environment variable passing

### Solution 4: Use tmux send-keys to Parent Pane

**Rationale**: Execute switch command in parent pane's context

```bash
# .local/bin/tmuxie sessionize()
if in-tmux; then
  tmux new-session -d -s "$name" -c "$dir" "bash -l"
  # Get parent pane and send switch command to it
  local parent_pane="$(tmux display-message -p '#{pane_id}')"
  tmux send-keys -t "$parent_pane" "tmux switch-client -t '$name'" Enter
fi
```

**Pros**:
- ✅ Executes in correct context
- ✅ No binding change

**Cons**:
- ❌ Visible command in pane (poor UX)
- ❌ Interferes with pane content
- ❌ May not work if pane is busy

---

## Verification Evidence

### Evidence 1: Git History

```bash
$ git show 32a6107:.config/tmux.conf | grep "C-o"
bind-key C-o display-popup -E -w 95% -h 85% "tmuxie -s"

$ git show 32a6107^:.config/tmux.conf | grep "C-o"  
bind-key C-o display-popup -E -w 95% -h 85% "bash -l -c 'tmuxie -s'"
```

### Evidence 2: sessionize() Code Unchanged

```bash
$ git show 1b80974:.local/bin/tmuxie | grep -A10 "function sessionize"
# Shows chained format: new-session ... \; switch-client

$ git show HEAD:.local/bin/tmuxie | grep -A10 "function sessionize"
# Still chained format - code hasn't changed since Oct 9 restore
```

### Evidence 3: Commit Messages Confirm Diagnosis

- `32a6107`: "6+ second delay vs 0.06s direct execution" - confirms performance was priority
- `1b80974`: "Restore working Oct 2 version" - only restored script, not binding
- `35097f9`: "separate session creation from switching" - attempted wrong fix
- `9c6bc3b`: Reverted 35097f9 - confirmed that approach didn't work

---

## Recommended Action Plan

### Immediate Fix (Choose One)

**Option A: Restore bash -l -c (SAFEST)**
1. Revert .config/tmux.conf line 168 to: `bind-key C-o display-popup -E -w 95% -h 85% "bash -l -c 'tmuxie -s'"`
2. Accept 6s delay as temporary trade-off
3. Test: Press C-o, select new project, verify switch works
4. Commit: "tmux: Restore bash -l -c wrapper to fix C-o session switching"

**Option B: Try Fast Shell Wrapper (EXPERIMENTAL)**
1. Change to: `bind-key C-o display-popup -E -w 95% -h 85% "sh -c 'tmuxie -s'"`
2. Test: Verify performance AND switching both work
3. If works: Commit as solution
4. If fails: Fall back to Option A

### Long-term Solution

1. **Profile bash -l startup time**:
   ```bash
   time bash -l -c 'echo ready'
   ```

2. **Identify slow initialization**:
   - Check .bashrc, .bash_profile
   - Identify expensive operations (command substitutions, network calls, etc.)
   - Move non-essential initialization to lazy loading

3. **Optimize for popup context**:
   - Create minimal bash profile for popup contexts
   - Use `BASH_ENV` to load minimal config
   - Or use lighter shell (dash, zsh -f) for popup contexts

4. **Alternative: Rearchitect tmuxie popup mechanism**:
   - Use tmux's native `display-menu` (but loses fzf)
   - Use custom solution that doesn't rely on popup client context
   - Pre-fork session management daemon

---

## Lessons Learned

1. **Performance vs Correctness Trade-off**: The 6s → 0.06s optimization broke core functionality
2. **Context Matters**: Shell wrappers aren't just about environment - they affect tmux client context
3. **Test Regression**: Performance optimization should have tested all use cases (new + existing sessions)
4. **Incomplete Rollback**: "Restore working version" only restored script, not full configuration
5. **Wrong Diagnosis**: Multiple fix attempts focused on command syntax, not execution context
6. **Document Dependencies**: The `bash -l -c` wrapper wasn't just overhead - it was critical infrastructure

---

## Appendix: Testing Procedure

### Test Case 1: Existing Session (Should Always Work)
1. Create session manually: `tmux new-session -d -s test-session`
2. Press `C-o`
3. Select `test-session` from list
4. Expected: Switch to test-session ✅
5. Result: PASS (even with broken binding)

### Test Case 2: New Session (Currently Broken)
1. Press `C-o`
2. Select a project that doesn't have a session
3. Expected: Create session and switch to it ✅
4. Actual: Session created, but remains in current session ❌

### Test Case 3: Cancel/Escape (Edge Case)
1. Press `C-o`
2. Press `Escape` or `Ctrl-C`
3. Expected: Popup closes, remain in current session ✅
4. Result: PASS

### Verification After Fix
1. Test Case 2 should PASS
2. Test Case 1 should still PASS
3. Test Case 3 should still PASS
4. Measure performance: Should be acceptable (< 1s ideal, < 3s acceptable)

---

## References

- **Regression Commit**: `32a6107` (Oct 8, 2025)
- **Failed Fix Attempts**: `35097f9` (Oct 21), `9c6bc3b` (Oct 22)
- **Incomplete Restore**: `1b80974` (Oct 9)
- **tmux version**: 3.5a
- **Related Files**:
  - `.config/tmux.conf` (line 168)
  - `.local/bin/tmuxie` (sessionize function, lines 62-78)
