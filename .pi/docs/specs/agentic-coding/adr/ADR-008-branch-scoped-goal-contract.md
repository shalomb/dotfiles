# ADR-008: Branch-Scoped Goal Contract in the Backlog Store

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decider(s):** unop, Main Copilot (Design Session v1.1)
- **Consulted:** `~/shalomb/agentic-falsify/runs/FINDINGS.md` (H1–H4), Obsidian `Tech/AI/AgenticLoops.md`, `Agile/Theory of Constraints.md`
- **Informed:** Main Copilot, Wave Scheduler, Builder and Critic subagents, Intent Governor
- **Supersedes:** N/A

## Context

The spec names the "North Star" 14 times. The Intent Governor prunes tasks "with no North Star link"; Course Correction escalates "North Star blockers"; Knowledge Checkpoints record "North Star intent". Nothing stores it. Each session restates the goal in chat, where it is lost on compaction and invisible to `todo`, the gate and the critic. Without a stored goal, the system cannot tell throughput from overproduction (ToC: work that does not move toward the goal is inventory).

## Decision Drivers

1. **[DRV-01 — A machine-readable goal]:** The governor, critic and `todo replan` must read the same goal the human set.
2. **[DRV-02 — Single store (ADR-002)]:** No new state location; nothing in the target repository.
3. **[DRV-03 — Parallel feature work]:** Several Feature Worktrees can run at once, one writer each.
4. **[DRV-04 — Low ceremony]:** Linking work to the goal must cost the human nothing per task.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code Architecture
- **Primary Framework:** ISO/IEC 25010 & Evolutionary Architecture
- **Guiding Quality Pillars:**
  1. *Functional suitability (appropriateness):* Every task and finding can be judged against a stored outcome and anti-goals.
  2. *Modifiability:* Plain Markdown in the existing store; any consumer can adopt it without schema migration.

## Decision

Store one **Goal Contract** per branch as `goal.md` in the out-of-repo backlog store. It holds an outcome, anti-goals, done-check commands, scope anchors (paths) and spec links. While a goal is active, tasks created on that branch carry `[goal: <id>]` automatically.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | The spec relies on a North Star that is never stored; goals live in chat and vanish on compaction. |
| **Constraint(s)** | One store, nothing in the repo (DRV-02); parallel worktrees (DRV-03). |
| **Requirement(s)** | Goal readable by governor, critic and `todo` (DRV-01) with zero per-task effort (DRV-04). |
| **Decision** | Branch-scoped `goal.md` in the backlog store; auto `[goal: <id>]` on new tasks. |
| **Alternatives Rejected** | Session-only state; `TODO.md` front matter; one goal per repo. |
| **Rationale** | Puts intent beside the backlog it governs, keyed the same way worktrees are. |
| **Tradeoff Accepted** | Goal files must be keyed by branch and cleaned up when branches end. |
| **Decision Authority** | unop — review after H5 measurement (2026-12-15). |

## Architectural Reification & Enforcement

- **Location contract:** `${XDG_CACHE_HOME:-~/.cache}/agent-skills/todos/<repo_slug>/goals/<branch-slug>.md`, written only through the `/goal` command or `todo goal`.
- **Schema check:** `/goal` refuses to save a contract missing an outcome or a done-check (ADR-009).
- **Task link:** `todo add` appends `[goal: <id>]` when the current branch has an active goal; a unit test pins this.
- **Stale goal guard:** at session start, `/goal` warns when the goal's branch is merged or deleted.

## Consequences

### Positive Outcomes (+ Gains)
+ The governor can prune and the critic can judge against a real outcome and real anti-goals.
+ Goals survive compaction and session changes.
+ Parallel feature worktrees each carry their own goal without conflict.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- Branch renames orphan a goal file until the stale-goal warning is handled.
- Work on a branch with no goal has no link, so governor pruning by goal does nothing there.
- `todo` gains a dependency on the current git branch.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | A: Branch-scoped `goal.md` (Chosen) | B: pi session state only | C: `TODO.md` front matter | D: One goal per repo |
|---|---|---|---|---|
| **DRV-01: Machine-readable by all consumers** | Pass | Fail (pi only) | Pass | Pass |
| **DRV-02: Single store** | Pass | Fail (session file) | Pass | Pass |
| **DRV-03: Parallel worktrees** | Pass | Pass | Fail (one file) | Fail (one goal) |
| **DRV-04: Zero per-task effort** | Pass (auto link) | Medium | Pass | Pass |
| **Reversibility** | Two-way door (Markdown) | Two-way | Two-way | Two-way |

### Option A: Branch-scoped `goal.md` (Chosen)
- **Why Chosen:** The only option that passes all four drivers.
- **Key Caveat:** Branch lifecycle must be tracked.

### Option B: pi session state only
- **Description:** Keep the goal in `pi.appendEntry`, like plan mode.
- **Strongest Argument:** Simplest; no file format.
- **Why Rejected:** Fails DRV-01 and DRV-02; `todo` and subagents cannot see it.

### Option C: Front matter in `TODO.md`
- **Description:** A goal header at the top of the backlog file.
- **Strongest Argument:** No new file.
- **Why Rejected:** Fails DRV-03; mixes intent with the task list.

### Option D: One goal per repo
- **Description:** A single `goal.md` per repo slug.
- **Strongest Argument:** Simplest key.
- **Why Rejected:** Fails DRV-03 when two feature worktrees run.

## Revisit Criteria

- H5 fails (see ADR-009): downgrade to a notes file per the kill rule.
- Work regularly spans several branches for one outcome: consider goals keyed by an explicit id.
