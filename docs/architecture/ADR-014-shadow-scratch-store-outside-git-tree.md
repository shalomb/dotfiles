# ADR-014: Keep Scratch Notes in a Persistent Store Outside the Git Tree

- **Status:** Proposed
- **Date:** 2026-11-14
- **Decider(s):** Repo owner
- **Consulted:** none (single-user repo)
- **Informed:** Agents that read scratch notes
- **Supersedes:** none

## Context

Developers write quick notes in `/tmp`. Reboots and `systemd-tmpfiles` sweeps delete them. Neovim often disables persistent undo there. The notes lose their link to a repo and worktree. Putting notes in the git tree dirties `git status`. See `docs/specs/doc-system/vision-and-roadmap.md`, section 3.

## Decision Drivers

1. **DRV-01 Durability:** A note must survive a reboot and a tmp sweep.
2. **DRV-02 Clean tree:** Notes must not appear in `git status` or in a commit.
3. **DRV-03 Convention fit:** The path must follow the shadow-store pattern that `todo-navigator` already uses.
4. **DRV-04 Agent reach:** An agent must compute the note path without a lookup service.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code
- **Primary Framework:** ISO/IEC 25010 & Evolutionary Architecture
- **Guiding Quality Pillars:**
  1. *Reliability (recoverability):* Notes outlive reboots and sweeps.
  2. *Modifiability:* One path rule lets later tools (promote, doc CLI) reuse the store.

## Decision

Store each shadow scratch note under `~/.cache/agent-skills/scratch/<repo-slug>/<worktree-name>/`. The store is outside every git tree. The repo slug falls back to the directory name when the repo has no remote.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | `/tmp` loses notes; in-tree notes dirty git. |
| **Constraint(s)** | No files in the git tree (DRV-02); path computable without lookup (DRV-04). |
| **Requirement(s)** | Notes survive reboot (DRV-01); follow todo-navigator pattern (DRV-03). |
| **Decision** | XDG cache store keyed by repo slug and worktree name. |
| **Alternatives Rejected** | XDG state per branch; in-repo git-excluded directory; `/tmp`. |
| **Rationale** | Matches the existing shadow store; stable across branch renames. |
| **Tradeoff Accepted** | Cache cleaners may wipe notes; orphan notes remain after worktree removal. |
| **Decision Authority** | Repo owner, review by 2027-02-14. |

## Architectural Reification & Enforcement

- One function resolves the note path from repo slug and worktree name. Both the CLI and agents call `scratch path`.
- Test: after 10 scratch edits, `git status --porcelain` is empty (hypothesis H3).
- Test: a note exists after the store survives a simulated reboot (H2).
- `scratch list` shows orphan notes whose worktree is gone.

## Consequences

### Positive Outcomes (+ Gains)
+ Notes survive reboots and tmp sweeps.
+ The git tree stays clean.
+ Neovim undo files work, because the path is not in `/tmp`.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- A cache cleaner can delete notes, because the path is under `~/.cache`.
- Orphan notes stay after a worktree is deleted and need manual cleanup.
- Two repos with the same directory name and no remote can share a slug.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | A: XDG cache by slug (chosen) | B: XDG state by branch | C: In-repo, git-excluded |
|---|---|---|---|
| **DRV-01 Durability** | Good; cleaner risk | Better (state is durable by convention) | Lost with worktree |
| **DRV-02 Clean tree** | Pass | Pass | Pass, but visible in the tree |
| **DRV-03 Convention fit** | Same as todo-navigator | New pattern | New pattern |
| **DRV-04 Agent reach** | Slug + worktree | Branch can be renamed or deleted | In the worktree |
| **Reversibility** | Two-way door: move the directory | Two-way door | Two-way door |

### Option A: XDG cache by repo slug
- **Why Chosen:** Reuses an existing pattern; keyed by worktree, so branch renames do not matter.
- **Key Caveat:** Cache cleaners.

### Option B: XDG state per repo and branch
- **Strongest Argument:** `~/.local/state` is durable by convention.
- **Why Rejected:** Fails DRV-03 (new pattern) and DRV-04 (branches get renamed).

### Option C: In-repo git-excluded
- **Strongest Argument:** The note sits next to the code.
- **Why Rejected:** Dies with the worktree (DRV-01); appears in the tree (DRV-02 intent).

## Revisit Criteria

- A cache cleaner deletes a note in real use.
- The scratch store grows past 500 notes.
- A second tool needs shared, cross-machine notes.
