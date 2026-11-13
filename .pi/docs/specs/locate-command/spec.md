# Locate Command Specification

## Overview

`/locate` is a fast, flow-preserving slash command and backend extension for Pi.
It provides natural-language multi-term search across the indexed filesystem (`plocate`)
and the local workspace (`git ls-files`), weighting candidates by directory proximity to `cwd`,
and performing scoped inspection via `rg` to return ADR-005 compliant pointer receipts.

## Architecture & Bounding Principles

1. **Natural Phrase Pivot Parsing**:
   - Parses conversational inputs: `[path terms] [connector] [content terms]`.
   - Recognizes connectors: `within`, `inside`, `in`, `containing`, `contains`, `for`, `about`, `with`.
   - Supports explicit `+` mandatory term markers and quoted `"exact phrases"`.

2. **Unified Zone-Weighted Scoring (Not a Waterfall)**:
   - Evaluates all candidate paths into a single candidate pool.
   - **Zone 0 (cwd)**: Weight `1.00`. Real-time fresh via `git ls-files -co --exclude-standard`.
   - **Zone 1 (Same Repo)**: Weight `0.90`.
   - **Zone 2 (Sibling Projects / Same Parent Hub)**: Weight `0.75` via filtered `plocate`.
   - **Zone 3 (User Home `~`)**: Weight `0.50` via filtered `plocate`.
   - **Zone 4 (System `/etc`, `/usr`)**: Weight `0.25` via filtered `plocate`.

3. **Context Hygiene (ADR-005)**:
   - Noise masking: immediately filters out `*/.git/*`, `*/node_modules/*`, `~/.cache/*`, `~/.claude/*`, `~/.gemini/*`, `*/dist/*`, `*/target/*`.
   - Path clustering: collapses thousands of child hits inside a repository into anchor roots.
   - Output hard cap: returns `<= 25` lines of markdown containing actionable context pointers (`path:line:col` and 1-line snippets).
   - Never floods the LLM context window with intermediate search traces.

## Picker Mode (default inside tmux)

- `/locate <query>` opens an fzf popup over ranked candidates; Tab multi-selects, Enter inserts the choices into the prompt as `@path` refs (spaces quoted, paths relative to `cwd`). No agent turn is consumed.
- `--list` / `-l`, or running outside tmux, returns the <=25-line pointer receipt instead.
- Rows lead with file name, then directory, then age; each row carries the absolute path and matching line. A preview pane shows the file with the match highlighted.
- Content terms narrow the list to files containing them. If none match, the picker falls back to the path-only list (dropping the last path term if still empty) and shows a note in the header.

## Additional Noise and Duplicate Handling

- Dependency, cache and build trees (venvs, `__pycache__`, `coverage`, `bower_components`, etc.) are pruned; lookalike names are kept.
- Files under `.worktrees/` are demoted and dropped when a main-tree twin exists, unless `cwd` is inside that worktree.
- An alternate plocate database may be supplied.
