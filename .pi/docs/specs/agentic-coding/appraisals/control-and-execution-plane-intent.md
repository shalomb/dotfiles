# Intent: control plane and execution plane

- **Type:** Intent note. It records a direction to explore. It is not a decision and not a spec.
- **Date:** 2026-11-02
- **Sits beside:** the other documents in this directory (see `README.md`)
- **Changes made by this note:** None. No code, spec or ADR is touched.

## Intent

Separate the agents that manage the flow of work from the agents that do the work. The Main Copilot and the
other core roles belong to the flow plane. Builders, reviewers and spikes belong to the execution plane.
The arrangement of agents that solves a given goal, its topology, is chosen deliberately, and it can differ
from one goal to the next.

## What the spec already says

- The glossary defines the Main Copilot as working without raw execution logs in its context.
- ADR-001 pairs an interactive Copilot with a deterministic Wave Runner. The Wave Scheduler is code, not an agent.
- A Task Run is one Builder, one task, one worktree and one commit.
- The v1.1 notes record two arrangements revised on evidence: multi-task Work Batches were removed (H1),
  and the Critic became default-on (H3).

## Planes as proposed

| Plane | Holds | Characteristic |
|---|---|---|
| Intent | Human, goal contract, discovery | Sets and changes the goal |
| Flow / control | Copilot, scheduler, governor, gate policy, topology choice | Small context, mostly deterministic, decides what runs and when |
| Execution | Builders, reviewers, spikes, tools | Isolated, disposable, produces evidence |

The Copilot sits across the intent and flow planes.

## The Critic may straddle two planes

- The **gate** (rebase, run deterministic checks, fast-forward or refuse) is policy and fits the flow plane.
- The **adversarial review** is work that produces findings and fits the execution plane.

This is a proposal, and the spec does not draw the line this way today.

## Topologies that could be named conventions

| Name | Shape | Might suit |
|---|---|---|
| Solo | Copilot with checks only | Small goals that a command can verify |
| Pipeline | Builder, then critic | Most delivery goals |
| Fan-out | Disjoint tasks in parallel | Work whose scope anchors do not overlap |
| Adversarial pair | One agent builds, another writes falsifying checks | High-risk or weakly specified work |
| Generate and critique | Several framings, then a critic | Discovery |

## What could drive the choice

The goal already carries some signals: scope anchors (are tasks disjoint), the done-check kind (can a command
verify it) and anti-goals (how far a mistake can reach). A chooser based on these could be deterministic.
Whether it should be, and whether anything beyond conventions is needed yet, is open.

## Risks

- The Copilot starts doing execution work, which defeats the context hygiene that justified the split.
- An LLM picks the topology by feel, which is an unchecked claim.
- Machinery arrives before H5 has produced data.

## Open questions

1. Should the Critic be split as described?
2. Should the goal record the chosen topology and the reason?
3. Is a deterministic chooser worth building, or are named conventions enough for now?

See `open-decisions.md` for the tracked entries.
