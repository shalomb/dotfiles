# ADR-016: Resume sessions inside a worktree, never at the repo top level

- **Status:** Accepted
- **Date:** 2026-11-14
- **Decider(s):** repo owner
- **Consulted:** pi-profile owner (same person)
- **Informed:** users of pi-find and pi-profile

## Context

Sessions that start at the repo top level collide with other work. Users want a session to continue in the worktree where it ran.

## Decision Drivers

1. **DRV-01 Isolation:** no work at the repo top level.
2. **DRV-02 Fidelity:** return to where the session ran.
3. **DRV-03 Robustness:** the worktree may be gone.
4. **DRV-04 One step:** Enter does the job.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code
- **Primary Framework:** ISO/IEC 25010 & Evolutionary Architecture
- **Guiding Quality Pillars:**
  1. *Reliability:* safe fallback when worktree is gone.
  2. *Usability:* one key resumes.

## Decision

Enter does `cd` into the session's original worktree and resumes in the right profile. If it is gone or was the top level, fzf asks: pick an existing worktree or create one. gum supplies repo roots and worktree lists.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | Top-level sessions collide with other work. |
| **Constraint(s)** | Worktree may be deleted (DRV-03). |
| **Requirement(s)** | Isolation and one-step resume (DRV-01, DRV-04). |
| **Decision** | Resume in original worktree; else pick or create. |
| **Alternatives Rejected** | Always create new; match by branch. |
| **Rationale** | Faithful by default, safe fallback. |
| **Tradeoff Accepted** | Enter changes the shell directory; fzf can need a second prompt. |
| **Decision Authority** | Repo owner; review 2027-02-14 |

## Architectural Reification & Enforcement

A resolver `resolveTargetWorktree(session, gumRepo)` returns a worktree path or a prompt request, never a top-level path. A test (H3) asserts this.

## Consequences

### Positive Outcomes (+ Gains)
+ No new session starts at the repo top level.
+ Fits the worktree workflow.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- Needs gum and git worktree state to be correct.
- A failed create falls back to cd to repo with a warning.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Criterion | A (chosen) | B | C |
|---|---|---|---|
| DRV-01 Isolation | High | High | Medium |
| DRV-02 Fidelity | High | Low | Medium |
| DRV-03 Robustness | High | High | Low |
| DRV-04 One step | High | High | High |
| Reversibility | Two-way door | Two-way door | Two-way door |

### Option A: Original worktree, else pick or create (chosen)
- **Why Chosen:** all four drivers.
- **Key Caveat:** extra prompt when worktree is gone.

### Option B: Always create a new worktree
- **Why Rejected:** worktrees pile up (DRV-02).

### Option C: Match by branch
- **Why Rejected:** branch can be stale or merged (DRV-02, DRV-03).

## Revisit Criteria

- gum drops worktree support.
- H3 fails in field use.

## Evidence

- commit: dc9eefd — resolves pi-find resume into a worktree
- test: .pi/agent/extensions/_lib/registry-resume.test.ts — covers original-worktree resume and fallback
