# ADR-011: Discovery Runs Before a Goal Draft

- **Status:** Accepted
- **Date:** 2026-11-03
- **Decider(s):** Human Partner
- **Consulted:** Main Copilot (grill rounds [goal-ux-01](../rounds/goal-ux/round-01.md), [goal-ux-02](../rounds/goal-ux/round-02.md))
- **Informed:** Builders of TB-7c
- **Supersedes:** none (extends [ADR-008](ADR-008-branch-scoped-goal-contract.md); ADR-008, ADR-009 and ADR-010 are unchanged)

## Context

The first live `/goal` run (goal `g-develop`, 2026-11-03, intent "todo(1) is cognizant of pi worktrees") showed weak drafting:

- The agent drafted a check for an outcome that TB-8 had mostly delivered. It did not read the todo-navigator source.
- The draft check failed on base only because its script was missing (exit 127).
- The scope anchors named the installed uv tool, not the source in the Owning Repo.
- The goal was started on `develop`, a shared branch, in a repo that does not own the code.

Lock integrity (ADR-009 Amendment 1, ADR-010) protects a contract once it is drafted. Nothing helped produce a good draft.

## Decision Drivers

1. **DRV-01 — Draft validity:** a Done-check must test work that is not yet done, in the Owning Repo.
2. **DRV-02 — Low friction:** a trivial goal must still draft in one turn.
3. **DRV-03 — Verifiable claims:** the Human Partner must be able to check what the agent says exists.
4. **DRV-04 — Falsifiable value:** the added step must be removable if it does not help.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code
- **Primary Framework:** ISO/IEC 25010 & Evolutionary Architecture
- **Guiding Quality Pillars:**
  1. *Functional correctness:* Discovery stops contracts for work that is already done.
  2. *Usability (operability):* a fixed Review Card with one next-step line replaces free text.

## Decision

Before the agent drafts a Goal Contract, it runs **Discovery**. It searches the code, tests and docs for the outcome and reports one of *already true*, *partly true* or *not there*. Every claim cites a path and a command, and the Review Card shows both. Discovery also names the **Owning Repo**. If that is not the current repo, the agent proposes that the Human Partner start the goal there, on a new branch.

The agent may ask at most 2 questions before it drafts, and only on a gap: the Owning Repo or path is unknown, no observable done is given, or Discovery reports *already true*.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | g-develop drafted a check for work that TB-8 had mostly done, in the wrong repo |
| **Constraint(s)** | Trivial goals still draft in one turn (DRV-02); ADR-008 unchanged |
| **Requirement(s)** | Checks test undone work in the Owning Repo (DRV-01); claims checkable (DRV-03) |
| **Decision** | Discovery with cited evidence before every draft; at most 2 gap questions |
| **Alternatives Rejected** | Draft at once; Discovery on request; always ask; cross-repo goals |
| **Rationale** | Cheap search step removes the costliest draft error seen in live use |
| **Tradeoff Accepted** | One extra search per goal; Discovery can still be wrong (mitigated by citations) |
| **Decision Authority** | Human Partner — review after the TB-7c replays |

## Architectural Reification & Enforcement

- The draft prompt that `/goal <outcome>` injects requires a Discovery block before `goal_propose`.
- `goal_propose` accepts a `discovery` field: status, then claims as `{path, command}`. The Review Card renders it.
- The cross-repo proposal is advice only. `/goal` never starts a goal in another repo by itself.
- Scenarios: [features/goal-contract.feature](../features/goal-contract.feature), rule "A draft starts from what already exists".

## Alternatives Considered

- **Draft at once (status quo).** Rejected: this is what produced g-develop.
- **Discovery only on request.** Rejected: the user must already suspect the problem.
- **Always ask 1–3 questions.** Rejected: friction on trivial goals (DRV-02).
- **Cross-repo goals.** Rejected for now: this needs a new goal model and a check that runs across repos. Moving the goal to the Owning Repo covers the observed case.

## Consequences

- Drafts get slower by one search step.
- The Discovery claims become a new surface to review. Citations keep them checkable but do not make them true.

## Falsifiability and Kill Rule

Replay `g-develop` and a `todo --version` goal, before and after TB-7c. Pass rules:

1. Discovery reports the TB-8 work for g-develop.
2. The anchors name source paths in the Owning Repo.
3. No draft check fails on base because a command or script is missing.
4. The output ends with one next-step line.

**Kill rule:** if both replays fail 2 or more pass rules, remove Discovery and keep only the Review Card and Draft Lint. Record the result in `trajectories.jsonl` and in this ADR.
