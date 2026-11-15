# The goal system: what it is and how it runs

Date: 2026-11-15. Status: opinionated position, supersedes the human-facing framing of `/goal`.
Decisions: [ADR-012](../../.pi/docs/specs/agentic-coding/adr/ADR-012-next-advances-one-hop.md).
Design history: [decision tree](../plans/goal-workflow/decision-tree.md), [drive roles](../plans/goal-workflow/drive-roles.md).

## In one sentence

The goal system is the contract layer between human intent and agent execution: it fixes "done" as a check
before work starts, so the agent cannot move the goalposts or grade itself, and then it keeps moving.

## Opinions

1. **Intent is decided once, upstream.** The human approves objectives and key results. Everything below a key
   result is the agent's to decide.
2. **Approving trivial steps is waste.** In this session every real fault (a goal driving the wrong work, a test
   gate that passed on failures, a full `/tmp`) was caught by a sensor, never by an approval.
3. **Sensors, not approvals.** Safety comes from checks fixed in advance, mechanical gates and tripwires, not
   from asking the human.
4. **Small, reversible hops.** A goal serves one key result and lives on a worktree branch. The worst runaway
   costs time and tokens, never damage.
5. **Stop only at one-way doors and tripwires.** Everything else is a two-way door: decide, log, move on.
6. **Reorient at every boundary.** A one-line retro per hop; a review per objective. Changing intent waits for
   the human; changing tactics does not.
7. **The machinery stays out of sight.** Goals keep their rigour (base-fail rule, lock, tamper ref, archive,
   trace) but the human sees the roadmap, the stops and the reviews, not the goal commands.

## The ladder

| Rung | What it is | Owner | Changes |
| :-- | :-- | :-- | :-- |
| Vision, objectives | where and why | human | rarely, via `/plan` |
| Key results (KR-n.m) | a sentence and a check | human approves, agent drafts | at objective reviews |
| Goal | one hop to a KR: locked check, anti-goals, scope | agent, bounded by the KR | every hop |
| Tasks | steps within a hop | agent (`todo`) | constantly |
| Commits | the evidence | Builders, gated by `drive_gate` | constantly |

A goal may lock itself only when its Outcome Check is the check of a human-approved key result, unchanged.
The agent can never invent the check it is graded on.

## Two learning loops

- **Single loop, per hop:** did the goal move its key result? Adjust how: a retro line feeds the next draft.
- **Double loop, per objective:** are these still the right key results? Adjust what: objective review, then
  `/plan`. This is the anti-waterfall loop.

## The loop and its control system

Between stops the loop runs by itself: close a green goal, draft the next from the first red key result, lock it
on that key result's check, drive it, repeat.

| Control | Purpose |
| :-- | :-- |
| Hop size | one goal per key result; scope and anti-goals bound the diff |
| Gate | `drive_gate` on every Builder commit (G1-G3 reject, warnings call the Verifier) |
| Tripwires | stop and reorient on: key result not moved after its goal closed; two rejects or retries on one task; glovebox growing faster than key results turn green; a learning contradicting a key result or ADR; a hop over budget |
| Budget | context (checkpoint and stop near 60%), plus a goal count per run; the real throttle |
| Retro | one line per hop into `trajectories.jsonl`, read by the next draft |
| Review | rest stop when an objective's key results are all green |
| Steering | the human's note at any time is read at the next hop boundary |

One-way doors always stop: push, deploy, publish, deletes outside the worktree, weakening a check, a goal that
contradicts its anti-goals, any change of intent (a key result added, changed or dropped).

## What `/next` (`/n`) is

Not a decision. It is resume and continue: start the loop in a fresh session, or carry on after a stop. With
intent settled and no stop pending, the loop should not need it.

## What changes in the plan

- The roadmap is the bottleneck: without key results there is no next hop to compute. First, key results for
  the rest of the goal workflow are written by hand and approved once.
- Then the loop (`gw-next-hop`): key result parser and approval record, self-lock rule, close on green, drive on
  lock, tripwires, budget, resume via `/n`.
- Then `/plan` writes key results, and the remaining slices (review engine, BDD linter, living docs) run through
  the loop itself.
- `/goal` subcommands remain for steering by hand; their dialogs are no longer the main path.

## Evidence from building it (2026-11-15)

- Sensors caught: `g-develop` driving unrelated work on a default branch; `make test-fast` exiting 0 on failures;
  a shellcheck runner that never checked a file; a test leaking 2.4 GB into `/tmp`.
- Approvals caught nothing. Four typed commands per goal; only the lock was a decision, and with a key result
  check even that is mechanical.
- Unproven: no Spec Steward wave has run yet; the loop and tripwires do not exist yet.
