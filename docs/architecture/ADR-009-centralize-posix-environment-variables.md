# ADR-009: Centralize POSIX Environment Variables

## Status
Accepted

## Context
During the "Holistic Bash Startup Refactoring", it was identified that environment variables, particularly `PATH` and XDG variables, were being set in multiple locations (`.profile` and `.bashrc`). This led to redundancy, potential inconsistencies, and made it difficult to ensure POSIX compliance for universal environment settings. The goal is to have a single, clear source of truth for environment variables that need to be available across all shell types (Bash, non-Bash, login, non-login).

## Decision
**Centralize the definition and sourcing of POSIX-compliant environment variables into a dedicated `.config/posix/` directory, sourced exclusively by `.profile`.**

### Rationale
-   **Single Source of Truth**: `.profile` is the appropriate place for universal environment variables as it is sourced by login shells regardless of their type (Bash, sh, zsh, etc.).
-   **POSIX Compliance**: By creating a `.config/posix/` directory, we explicitly designate scripts within it as POSIX compliant, ensuring they can be sourced by any POSIX-compatible shell.
-   **Reduced Redundancy**: Eliminates duplicate `PATH` and XDG variable setup logic in `.bashrc`.
-   **Improved Maintainability**: Changes to universal environment variables are made in one well-defined location.
-   **Clear Separation of Concerns**: Distinguishes between universal/POSIX environment setup and Bash-specific configurations.

### Implementation
1.  A new directory, `.config/posix/`, was created.
2.  POSIX-compliant scripts (`00-path.sh` for `PATH` and `01-xdg.sh` for XDG variables) were created or adapted and moved into `.config/posix/`.
3.  `.profile` was updated to directly source these scripts from `.config/posix/`.
4.  The redundant `PATH` and XDG variable setup was removed from `.bashrc`.
5.  A `README.md` was added to `.config/posix/` detailing linting instructions for POSIX compliance.

## Consequences
-   **Positive**: Environment variables are consistently set across all login shell types.
-   **Positive**: Clearer architecture for environment variable management.
-   **Positive**: Easier to maintain and debug environment-related issues.
-   **Positive**: Enforces POSIX compliance for universal environment settings.
-   **Neutral**: Requires careful management of scripts in `.config/posix/` to ensure strict POSIX compliance.

## Examples
```bash
# In .profile
. ~/.config/posix/01-xdg.sh
. ~/.config/posix/00-path.sh
```
