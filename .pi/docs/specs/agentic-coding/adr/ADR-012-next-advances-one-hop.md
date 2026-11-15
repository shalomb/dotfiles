# ADR-012: /next advances one hop; goals that trace to an approved key result lock themselves

- **Status:** Accepted (2026-11-15)
- **Amends:** ADR-009 (who locks and closes), ADR-011 (drafting)

## Context

Every goal took four typed commands (`/goal`, `/goal lock`, `/drive`, `/goal done`). Only the lock was a decision, and
when intent is settled upstream (end-state objectives and key results with checks), even the lock is mechanical: the
next hop to the destination can be computed. Typing ceremony lowers the bias to action without adding safety.

## Decision

The human decides intent once, upstream: the key results (KR-n.m, each a sentence and a check) in the end-state doc.
`/next` (alias `/n`) then advances one hop and keeps going:

1. Active goal, check green: close it (the check is the arbiter), log one retro line, continue.
2. Active goal, check red: drive it.
3. Draft goal: lock it itself when the auto-lock rule holds, then drive; else one dialog (Lock & drive / Edit / Not now).
4. No goal: run the KR checks, pick the first red KR (document order), draft a goal serving it, go to 3.
5. No KRs, or all green: say so; fall back to `todo next`; suggest `/plan` for new intent.

**Auto-lock rule** (all must hold, checked by code):
- The goal serves a KR, and its Outcome Check is that KR's check verbatim.
- The KR text is unchanged since the human approved it (hash of the KR lines recorded on approval; a changed KR pops
  one approval dialog the next time `/next` reads it).
- The check fails on the base commit and the failure is not environmental.
- It is not a relock and not on a default branch.

**One-way doors still stop** (drive road rules): push, deploy, publish, deletes outside the worktree, weakening a
check, a goal contradicting anti-goals, a KR that does not move when its goal closes. Two-way doors do not stop.

## Consequences

- The human's attention goes to intent (approving KRs) and one-way doors, not to typing.
- The agent can no longer invent the check it is graded on: auto-lock accepts only the human-approved KR check.
  A goal with any other check falls back to the one-dialog lock.
- Tamper evidence (ADR-010) is unchanged: every lock and close still writes the ref.
- `/goal ...` subcommands stay for steering by hand.
- Revisit if trajectories show auto-locked goals closing without their KR moving.
