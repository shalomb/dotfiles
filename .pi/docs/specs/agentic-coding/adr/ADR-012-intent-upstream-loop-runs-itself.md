# ADR-012: The goal loop is a self-driving car: /plan sets the destination, the car drives, /n resumes after a stop

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
| Driving (default) | the car drives itself | with an approved destination and a clear road, go from key result to key result without asking: pick the first red key result, build it, run its check, commit, record the lesson, next |
| Stop | pull over | one-way door, blocked road, unclear satnav, or budget spent: explain, then discuss with the human until resolved |
| Ignition / resume: `/n` (`/next`) | back on the road | start the car, or resume after a stop once the discussion is resolved; not pressed per hop |
| Manual control: `/goal` | wheel and gears | tweak a goal or take over: scenic driving, or the human driving |
| Brakes | road rules | one-way doors and tripwires stop the car |

- Autonomy is the default; `/n` is needed only to start or resume. The human's approval of the destination (the
  key-result hash) is the consent for the whole drive.
- `/goal` stays as manual control; its use should fall over time. Hops driven by key results need no `/goal`: the
  approved, hash-checked key-result check is the contract (it plays the role of a locked done-check).
- A hop counts only if its key-result check was red before and green after, and `drive_gate` passed its commits.
  A check that fails environmentally (exit 126/127, missing tool) is a blocked road, not a red key result.
- One-way doors: push, deploy, publish, deletes outside the worktree, weakening a check, a goal contradicting its
  anti-goals, any change of intent (a key result added, changed or dropped).
- Tripwires: key result not moved after its goal closed; two rejects or retries on one task; glovebox growing
  faster than key results turn green; a lesson contradicting a key result or ADR; a hop over budget.

## Road classes, the ledger and review

The agent is authorized to drive trivial hops alone, with receipts. Rules decide what is trivial, never the agent.

| Road | Rule (all must hold) | Review |
| :-- | :-- | :-- |
| Motorway | approved, unchanged key result; diff about 150 lines or less; no one-way door; the diff does not touch a check, a test that a check runs, or the end-state file | the main agent replays the evidence |
| City | any other hop inside the destination | the wave: `drive_gate`, then the Verifier (fresh context) |
| Unknown road | a lesson contradicts the destination, or the check is unclear | stop |

- **The ledger is git.** Each hop commit carries trailers: `Serves: KR-n.m`, `Road:`, `Check:`, `Check-Base:` (red,
  exit code, base sha), `Check-Head:` (green), `Gate:`, `Lesson:`. Signed commits are hard to forge; query with
  `git log --format='%(trailers:key=Serves)'`. `trajectories.jsonl` stays a cache for lessons and cost.
- **Review is replay, not narration.** For each `Serves:` commit, re-run `Check` at the base (expect red) and at the
  head (expect green), and recompute `Road:` from the diff. A false claim fails the replay; a hop without trailers
  does not count.
- **Arrival.** When the car claims arrival, it shows one table: key results, the commits serving each, and the
  replay verdict. This is the human's rest stop.
- The 150-line threshold is a guess; log diff sizes and tune it.

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

- How is a run bounded (hop count, context watermark, per objective)? Bootstrap: stop near 60% context.
- Does `/next` absorb `todo next` as its fallback, keeping `/n` as the alias?
- How does `/plan` present the end-state doc for editing (shared review engine with `/grill-me`)?
- Is a self-locking satnav itself a change of intent the human must opt into, per repo?

## Considered options

| Option | Verdict |
| :-- | :-- |
| Human approves every goal (status quo) | rejected: ceremony; approvals caught nothing |
| Agent locks any goal it drafts | rejected: it could pick a check it can pass |
| `/n` pressed per hop (gas pedal) | rejected: a press per hop is ceremony when the road is clear |
| Self-driving on approved key results; stop at doors, blocks, unclear satnav, budget; `/n` resumes; `/goal` manual | proposed |
