# ADR-012: The goal loop is a car: /plan sets the destination, /n is the gas pedal, /goal is manual control

- **Status:** Proposed (2026-11-15), recorded as intent; not built.
- **Would amend:** ADR-008 (goal as the agent's unit), ADR-009 (who locks and closes), ADR-010 (refs for agent
  locks), ADR-011 (gap questions in the loop). Relates to ADR-006 (learning streams), ADR-007 (observations).
- **Background:** [goal system](../../../../../docs/explanation/goal-system.md),
  [blue-sky thinking](../../../../../docs/blue-sky-thinking.md).
- **Scope:** the local need only (one person, this machine, code work in this repo). The broader outcome-engineering
  vision lives in a separate repository and is out of scope here.

## Context

Every goal took four typed commands (`/goal`, `/goal lock`, `/drive`, `/goal done`). Only the lock was a decision.
In building the goal workflow, faults were caught by sensors (a goal driving the wrong work, a test gate passing on
failures, a test filling `/tmp`), not by approvals. But driving without feedback risks a runaway that executes a
wrong plan confidently. The human wants to press one pedal to move to the next goal, and take the wheel when needed.

## Intent

| Control | Car | System |
| :-- | :-- | :-- |
| Destination | address in the satnav | the end-state doc from `/plan`: vision, objectives, key results (OKRs, `KR-n.m` = sentence + check), reviewed by the human as an editable doc in rounds, like `/grill-me` |
| Satnav at a junction | recompute the route from traffic | frame the next goal from the next red key result plus lessons from the hop just finished (retro line, glovebox, trajectories) |
| Gas pedal: `/n` (`/next`) | "go on" | close the current goal if its check is green, consult the satnav, lock the new goal if it sits on an approved key-result check, drive it |
| Manual control: `/goal` | wheel and gears | tweak a goal or take over: scenic driving, or the human driving |
| Brakes | road rules | one-way doors and tripwires stop the car |

- `/n` is consent per hop. Cruise control (`/n` for N hops, or until an objective is done) is a later option.
- `/goal` stays; its use should fall over time.
- Self-lock rule: the goal serves an approved, unchanged key result and its Outcome Check is that key result's
  check verbatim; the check fails on the base commit (not environmentally); not a relock; not a default branch.
  Otherwise one dialog: Lock & drive / Edit / Not now.
- One-way doors: push, deploy, publish, deletes outside the worktree, weakening a check, a goal contradicting its
  anti-goals, any change of intent (a key result added, changed or dropped).
- Tripwires: key result not moved after its goal closed; two rejects or retries on one task; glovebox growing
  faster than key results turn green; a lesson contradicting a key result or ADR; a hop over budget.

## Honesty rules for the satnav

1. "A better, shorter road" needs a sensor: key-result movement per hop. A hop that does not move its key result
   says so; it is not reframed as progress.
2. Lessons may change the route, never the destination. A lesson that says the destination is wrong sends the human
   back to `/plan` (a one-way door).
3. No end-state doc, no satnav: without key results, `/n` falls back to `todo next`, with no self-lock and one
   dialog per goal.

## Measures

- **Autonomy share:** goals framed and locked by the satnav vs edited or locked by hand. Should rise.
- **Key results moved per hop**, and cost per key result moved (tokens, time).
- **Tripwire lead time:** wasted hops before a tripwire fired. Should stay at most one.

## Open questions

- Cruise control: how is a run bounded (hop count, context watermark, per objective)?
- Does `/next` absorb `todo next` as its fallback, keeping `/n` as the alias?
- How does `/plan` present the end-state doc for editing (shared review engine with `/grill-me`)?
- Is a self-locking satnav itself a change of intent the human must opt into, per repo?

## Considered options

| Option | Verdict |
| :-- | :-- |
| Human approves every goal (status quo) | rejected: ceremony; approvals caught nothing |
| Agent locks any goal it drafts | rejected: it could pick a check it can pass |
| Loop runs by itself without a pedal | rejected: the human wants consent per hop; runaway risk |
| Gas pedal + satnav on approved key results + manual override | proposed |
