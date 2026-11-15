# ADR-012: Intent is decided upstream; the goal loop runs by itself between stops

- **Status:** Accepted (2026-11-15)
- **Amends:** ADR-008 (goal as the agent's unit), ADR-009 (who locks and closes), ADR-010 (refs for agent locks),
  ADR-011 (gap questions in the loop). Relates to ADR-006 (learning streams) and ADR-007 (observations).
- **Rationale and evidence:** [docs/explanation/goal-system.md](../../../../../docs/explanation/goal-system.md)

## Context

Every goal took four typed commands (`/goal`, `/goal lock`, `/drive`, `/goal done`). Only the lock was a
decision. In building the goal workflow, every real fault was caught by a sensor (a goal driving the wrong work, a
test gate that passed on failures, a leaking test filling `/tmp`); no approval caught anything. Approving trivial
steps lowers the bias to action without adding safety. Driving without feedback has the opposite risk: a runaway
that executes a wrong plan confidently (waterfall with a fast engine).

## Drivers

1. **[DRV-01: Bias to action]** Two-way doors cost the human nothing.
2. **[DRV-02: No self-grading]** The agent cannot choose the check it is graded on.
3. **[DRV-03: Bounded runaway]** A wrong turn costs time and tokens, never damage, and is sensed early.
4. **[DRV-04: Agility]** Learning reaches the plan at small and large scales.

## Decision

**The human decides intent once, upstream:** objectives and key results (KR-n.m, each a sentence and a check) in
the end-state doc, approved by the human. A goal is the agent's working unit: one hop to one key result.

**The loop runs by itself between stops:** close a green goal (the check is the arbiter), log a retro line, draft
the next goal from the first red key result (document order), lock it, drive it, repeat. `/next` (alias `/n`)
starts the loop in a fresh session or continues it after a stop; it is not a decision.

**Self-lock rule** (all must hold, checked by code; otherwise one dialog: Lock & drive / Edit / Not now):
- The goal serves a key result and its Outcome Check is that key result's check, verbatim.
- The key result is unchanged since the human approved it (a hash of its lines is recorded on approval).
- The check fails on the base commit, and the failure is not environmental.
- It is not a relock and not on a default branch.

**Control system against runaway:**

| Control | Rule |
| :-- | :-- |
| Hop size | one goal per key result; scope anchors and anti-goals bound the diff; worktree branch only |
| Gate | `drive_gate` on every Builder commit (ADR-004 Amendment 2) |
| Tripwires | stop and reorient: key result not moved after its goal closed; two rejects or retries on one task; glovebox growing faster than key results turn green; a learning contradicting a key result or ADR; a hop over budget |
| Budget | context near 60% (checkpoint, stop), plus a goal count per run |
| Retro | one line per hop to `trajectories.jsonl`, read by the next draft |
| Review | rest stop when all key results of an objective are green; the human may `/plan` |
| Steering | a human note at any time is read at the next hop boundary |

**One-way doors always stop:** push, deploy, publish, deletes outside the worktree, weakening a check, a goal that
contradicts its anti-goals, and any change of intent (a key result added, changed or dropped). On a tripwire the
agent may draft a replan, but applying it is a change of intent.

## Considered options

| Option | Verdict |
| :-- | :-- |
| Human approves every goal (status quo) | Rejected: DRV-01; approvals caught nothing |
| Agent locks any goal it drafts | Rejected: DRV-02; it could pick a check it can pass |
| Lock on approved key-result checks; loop with tripwires | **Chosen** |
| Fully autonomous, no reviews | Rejected: DRV-04; no double loop, waterfall risk |

## Consequences

- Human attention goes to intent (key results), one-way doors, tripwires and objective reviews.
- The roadmap becomes the bottleneck: without key results the loop has no next hop and falls back to the dialog.
- Tamper evidence is unchanged: every lock and close, by agent or human, writes the goal ref (ADR-010).
- `/goal` subcommands remain for steering by hand; their dialogs are no longer the main path.
- Revisit if trajectories show self-locked goals closing without their key result moving, or tripwires firing
  late (after more than one hop of wasted work).
