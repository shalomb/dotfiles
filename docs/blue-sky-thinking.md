# Blue-sky thinking: agents, terrain and intent

Date: 2026-11-15. Status: open thinking, **no decisions taken**. Nothing here is binding; ideas move into an ADR
only when one is decided. Related: [goal system](explanation/goal-system.md),
[ADR-012](../.pi/docs/specs/agentic-coding/adr/ADR-012-intent-upstream-loop-runs-itself.md).

## The driving picture

- **Motorway:** destination, route and road conditions are known. The satnav computes the route; you follow it;
  you stop only at one-way doors and breakdowns. This is what ADR-012 describes.
- **City:** traffic, delivery trucks, closures; conditions change and much is unforeseeable. Good navigation apps
  sense what is ahead and reroute away from impediments before you reach them.
- **Unknown roads or a vague destination:** drive short legs, look around, redraw the route. The aim of a leg is
  to learn enough to plan the next one.

| What is unknown | Driving | Software |
| :-- | :-- | :-- |
| the route | back roads, no map | outcome known, approach not: spikes, tracer bullets |
| road conditions | known road, never driven | unfamiliar code or a flaky environment |
| the destination | "somewhere nice by the coast" | discovery: `/grill-me`, `/plan` |

Thought: scenic mode might really mean "the route is unknown, so explore", not "stop more often".

## Two layers: emergent design and evolutionary architecture

**The map (evolutionary architecture)** is intentionally grey. It holds a few fixed things:
- **Landmarks:** intentions we set; objectives, and properties we will not trade away (reversibility, tamper
  evidence, low ceremony). In Ford and Parsons' terms, fitness functions.
- **No-go zones:** anti-goals, ADR constraints.
- Everything else is drawn in while driving: decisions at the last responsible moment, recorded as ADRs. The map
  sharpens behind the car, not in front of it.

**The street (emergent design)** is sensed and reacted to, not planned:
- Look ahead before committing: Discovery, spikes, dry runs, running the check on the base commit.
- Sense the present: gate, tripwires, test results.
- Reroute: another road to the same landmark (tactical, the vehicle's call).
- Change destination: a change of intent (the human's call).

**The vehicle steers by landmarks, not a fixed route.** At each junction: which way gets closer to the next
landmark, given what can be seen now? Routes are recomputed constantly; landmarks hold still, so rerouting does
not add up to drift.

**Waze loop:** each trip's sensor data improves the next trip's routing (for us, `trajectories.jsonl` and retros).

**Gap noticed:** key-result checks say "this feature exists"; nothing checks "we are still building the system we
intended". Two kinds of marker may be needed:
- **Milestones:** where we are going next (key results).
- **Bearings:** properties that must hold on every road (fitness functions as checks).

## Agents, biases and topologies

**Multi-agent is mostly a cost; it must earn its place.** One capable agent with tools and tight feedback solves
most problems. Each extra agent multiplies tokens and loses meaning at handoffs. An extra agent seems to pay only
for:

| Reason | Why |
| :-- | :-- |
| context isolation | keeps the orchestrator clear across many waves |
| independent judgment | a reviewer without the builder's context catches its blind spots |
| parallelism | disjoint work finishes sooner |
| cost tiering | cheap models for search and mechanical edits |

**Biases help only when errors are uncorrelated.** Shared LLM failure modes: optimism about done, generous
self-grading, anchoring on the first plan, greedy local fixes, agreeing with the brief. A second agent catches
these only if it differs in model family, context (never sees the builder's reasoning) and incentive (rewarded
for finding faults). The same model with a persona prompt is weak diversity.

**The terrain might pick the topology** (close to Cynefin):

| Terrain | Driving | Topology | Spend |
| :-- | :-- | :-- | :-- |
| clear | motorway | one Builder + the gate as code | lowest |
| complicated | known city, map exists | analyse (strong model), Builder, Verifier | medium |
| complex | city traffic | probe-sense-respond: 2-3 cheap parallel spikes, keep what works, then build | on learning |
| chaotic | accident ahead | stabilise, human in the loop | human time |

If so, the orchestrator's real job is to classify the terrain, pick topology and budget, and reclassify when the
sensors say the road changed. Today one triplet (Steward, Builder, Verifier) runs everywhere at about 3x cost per
task: perhaps worth it on complicated work, waste on the motorway and in emergent work.

Candidate rule: start with one agent; add one only when you can name the error it uncorrelates or the context it
protects, and measure whether it did.

## Token economics

- Tokens follow context, not agents.
- Replace LLM judgment with code wherever a check is precise (as `drive_gate` does for G1-G3: zero tokens). An LLM
  call should either generate something or make a judgment no code can.
- Keep contexts small: pointer receipts, read-only receipts, checkpoints, fresh sessions.
- Spend tokens on learning when the terrain is unknown, on execution when it is known.
- Possible metric: **cost per key result moved** (tokens and time per hop against key-result movement), so the
  system learns which topologies pay off where.

## Rethinking how intent is described

The human starts from an itch: a problem, usually known precisely, with the solution known vaguely. The current
chain leans toward describing the destination as a solution (feature-shaped key results). Intent capture might
instead ask for:

1. **The problem:** what hurts, for whom, evidence it is real.
2. **What resolved looks like, observably:** a signal, not a feature.
3. **Bearings:** properties that must hold on every road (fitness functions).
4. **The first milestone only:** later key results sharpen while driving; the map is grey on purpose.

On motorway work all four are crisp and the loop just runs. In city work the first milestone is often "learn X",
which is legitimate.

## Honest assessment of the current design

- **Sound:** the contract layer (check fixed before work, no self-grading), the gate as code, an independent
  Verifier, the loop with tripwires.
- **Unproven, maybe over-built:** the full triplet on every task.
- **Missing:** terrain classification at draft time (topology and budget); bearings as checks; cost per hop in
  trajectories.

## Open questions

- Should "classify the terrain" be the first step when the loop drafts a goal?
- Is the default topology one Builder plus the gate, with the Verifier by trigger and the Steward only when
  behaviour or spec carries risk?
- What are this repo's bearings, and can each be a command?
- How should `/grill-me` and `/plan` capture problem, signal, bearings and first milestone?
- What budget bounds a run when the loop no longer needs `/next` as a heartbeat?
