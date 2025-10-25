# ADR-010: Lazy-Loading and Caching for Shell Startup

## Status
Accepted

## Context
During the "Holistic Bash Startup Refactoring", a primary goal was to optimize shell startup time and improve maintainability by eliminating unnecessary work performed at shell initialization. Many scripts in the `enabled/` directory were found to be performing expensive operations (e.g., generating shell completions, sourcing large configuration files, executing external commands) on every shell startup, regardless of whether the associated tools were actually used.

## Decision
**Implement lazy-loading for tool initializers and caching for expensive shell completion generation across relevant scripts in the `enabled/` directory.**

### Rationale
-   **Improved Startup Performance**: Deferring expensive operations until they are actually needed significantly reduces shell startup time.
-   **Enhanced Maintainability**: Centralizing caching logic and lazy-loading patterns makes scripts more consistent and easier to manage.
-   **Reduced Resource Usage**: Avoids unnecessary execution of commands and sourcing of files if the associated tools are not used in a given shell session.
-   **Adherence to Best Practices**: Aligns with common shell optimization techniques for large dotfile configurations.

### Implementation
1.  **Completion Caching**: For tools that generate shell completions (`rustup`, `delta`, `gum`, `fzf`, `jira`, system-wide Git completions), a caching mechanism was implemented:
    -   The completion output is generated once and stored in `$XDG_CACHE_HOME/bash_completions/`.
    -   The cached file is sourced on subsequent startups.
    -   The cache is regenerated only if the original binary or source completion file is newer than the cached version.
2.  **Lazy-Loading Initializers**: For tools that perform one-time initialization logic (`amazon-q`, `ob`), a wrapper function pattern was applied:
    -   A lightweight bash function (e.g., `q()`, `ob()`) is defined on startup.
    -   On the first invocation of this wrapper function, it executes the expensive initialization logic (e.g., sourcing config files, running `eval` commands).
    -   After initialization, the wrapper function `unset`s itself and calls the real command, ensuring subsequent calls are direct.

## Consequences
-   **Positive**: Significantly faster shell startup times, especially in environments with many tools.
-   **Positive**: More responsive shell experience as resources are only consumed when needed.
-   **Positive**: Standardized approach to optimizing tool loading across the dotfiles.
-   **Neutral**: Requires careful implementation of wrapper functions to ensure correct behavior and argument passing.

## Examples
```bash
# Example of completion caching (from delta.sh)
_cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/bash_completions"
_completion_file="${_cache_dir}/delta"
mkdir -p "$_cache_dir"
if [[ ! -f "$_completion_file" || "$(command -v delta)" -nt "$_completion_file" ]]; then
  delta --generate-completion bash > "$_completion_file"
fi
source "$_completion_file"

# Example of lazy-loading initializer (from amazon-q.sh)
q() {
    if ! $_amazon_q_initialized; then
        _amazon_q_initialized=true
        # ... source initialization scripts ...
        unset -f q
        command q "$@"
    else
        command q "$@"
    fi
}
```
