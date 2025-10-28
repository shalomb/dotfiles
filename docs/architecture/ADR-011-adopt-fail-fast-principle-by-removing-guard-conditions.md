# ADR-011: Adopt Fail-Fast Principle by Removing Guard Conditions

## Status
Accepted

## Context
During the "Holistic Bash Startup Refactoring" and subsequent optimizations, numerous shell scripts contained explicit guard conditions (e.g., `if command -v tool`, `if [[ -f file ]]`, `[[ -t 0 ]] || return`) to check for the existence of commands, files, or specific shell contexts before proceeding. While intended to prevent errors, these checks added verbosity, complexity, and sometimes obscured the intended behavior. The user explicitly requested the removal of such guard conditions to simplify the codebase and embrace a "fail-fast" philosophy.

## Decision
**Remove explicit guard conditions for command existence, file existence, and terminal context checks from shell startup scripts. Instead, rely on the shell's default behavior to fail (exit with an error) if a required command or file is missing, or if a context is inappropriate.**

### Rationale
-   **Simplicity and Readability**: Eliminates boilerplate code, making scripts shorter and easier to understand.
-   **Fail-Fast Principle**: If a critical dependency (command, file) is missing, the script will naturally terminate with an error, immediately indicating a problem in the environment or installation. This is preferable to silently skipping functionality or attempting to proceed in a degraded state.
-   **Reduced Overhead**: Removes the overhead of executing conditional checks on every shell startup.
-   **Consistency**: Enforces a consistent approach to handling missing dependencies across the dotfiles.
-   **User Preference**: Directly addresses the user's explicit instruction to avoid guard conditions.

### Implementation
1.  All `if command -v ...`, `if [[ -f ... ]]`, `[[ -t 0 ]] || return`, and similar explicit checks were removed from scripts in the `enabled/` and `lib/` directories.
2.  Scripts were modified to directly execute commands or source files, allowing the shell to report errors if dependencies are not met.

## Consequences
-   **Positive**: Cleaner, more concise, and easier-to-read shell scripts.
-   **Positive**: Immediate and clear error feedback when a critical dependency is missing, facilitating quicker debugging of environment issues.
-   **Positive**: Slightly improved shell startup performance by removing unnecessary conditional evaluations.
-   **Neutral**: Requires ensuring that the default error messages from the shell are sufficiently informative for debugging purposes.
-   **Neutral**: Scripts will now exit with an error if a non-critical optional tool is missing, rather than silently skipping its configuration. This might require users to ensure all configured tools are installed or to manage optional tool configurations differently.

## Examples
```bash
# Before (with guard condition)
if command -v delta >/dev/null 2>&1; then
    source <(delta --generate-completion bash)
fi

# After (without guard condition)
source <(delta --generate-completion bash)

# Before (with terminal check)
[[ -t 0 ]] || return
# ... script logic ...

# After (without terminal check)
# ... script logic ...
```
