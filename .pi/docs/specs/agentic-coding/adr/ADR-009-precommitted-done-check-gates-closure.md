# ADR-009: Pre-Committed, Human-Locked Done-Check Gates Goal Closure

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decider(s):** unop, Main Copilot (Design Session v1.1)
- **Consulted:** ADR-004 Amendment 1 (H3 holdout), ADR-005 Amendment 1 (H2), ADR-007 Amendment 1 (H4)
- **Informed:** Main Copilot, Builder and Critic subagents
- **Supersedes:** N/A

## Context

H1–H4 share one lesson: claims that are not checked by a command do not hold. H3 showed that tests written against known defects scored 0.95 on them and 0.63 on unseen ones; a check written by whoever does the work fits that work. H2 showed that asserting "verified" made one model check more. H4 showed a Builder reporting a false finding with confidence. If an agent decides when a goal is done, or writes the done-check during the work, "done" is an assertion that fits the work, and gold-plating or early stops go unseen.

## Decision Drivers

1. **[DRV-01 — Done is checkable, not asserted]:** Closure must follow from a command result.
2. **[DRV-02 — Independence from the work (H3)]:** The check must exist and be agreed before the work it judges.
3. **[DRV-03 — No target-moving]:** The agent must not weaken the check to fit its result.
4. **[DRV-04 — Usable for non-code goals]:** Design and research goals have no command check.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code Architecture
- **Primary Framework:** ISO/IEC 25010 (Testability) & Evolutionary Architecture (fitness functions)
- **Guiding Quality Pillars:**
  1. *Testability:* The done-check is a fitness function for the goal, shown able to fail before it is trusted.
  2. *Accountability (ISO 25010 security):* Every change to a locked check names who approved it and why.

## Decision

The agent drafts the done-check; the human confirms it before work starts; it is then **locked**. A check can be locked only if it **fails on the base commit**. Changes to a locked check are proposed by the agent and approved by the human, and recorded with a reason. `/goal done` closes a goal only when the check is green, then runs `/persist` and a lessons capture. A goal with no possible command check may use a **human-confirm check**; its closure is recorded as an assertion.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | H2–H4: asserted claims fail; H3: checks written with the work fit the work. |
| **Constraint(s)** | Non-code goals have no command check (DRV-04). |
| **Requirement(s)** | Closure follows a command (DRV-01), set before the work (DRV-02), not weakened by the agent (DRV-03). |
| **Decision** | Agent drafts, human locks; must fail on base; human-approved changes; green check gates closure. |
| **Alternatives Rejected** | Agent-owned unlocked check; human-written check only; human closes at will. |
| **Rationale** | Independence and fail-first evidence make "done" falsifiable, as the hidden acceptance tests did in H1. |
| **Tradeoff Accepted** | One human confirmation per goal and per check change; fail-on-base does not prove completeness. |
| **Decision Authority** | unop — gated on H5 (2026-12-15). |

## Architectural Reification & Enforcement

- **Lock state:** `goal.md` records `done_check.locked_at`, `locked_by` and the base commit it failed on.
- **Fail-first gate:** `/goal lock` runs the check on the base commit and refuses to lock on exit 0.
- **Change log:** every change appends `{at, by, reason, old, new}` to the goal's history section.
- **Closure gate:** `/goal done` runs the check; on non-zero exit it refuses and reports the output pointer.
- **Assertion marker:** human-confirm closures are written as `closed_by: assertion` so H5 can exclude or compare them.

## Consequences

### Positive Outcomes (+ Gains)
+ "Done" becomes a command result the Copilot and human can trust in one call.
+ Gold-plating after green becomes measurable (turns after the check went green).
+ Weak checks such as `true` or empty tests are refused at lock time.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- A human confirmation is needed per goal and per check change; this interrupts flow.
- Fail-on-base proves the check can fail, not that it covers the outcome; a narrow check can still pass early.
- Human-confirm goals keep done-by-assertion, so they get no protection from this ADR.
- A check that is slow or flaky blocks closure until fixed.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | A: Draft, lock, fail-first (Chosen) | B: Agent writes, no lock | C: Human writes check | D: Human closes at will |
|---|---|---|---|---|
| **DRV-01: Checkable closure** | Pass | Pass | Pass | Fail |
| **DRV-02: Independence from work** | Pass | Fail (H3 overfit) | Pass (strongest) | N/A |
| **DRV-03: No target-moving** | Pass | Fail | Pass | Fail |
| **DRV-04: Non-code goals** | Pass (human-confirm) | Medium | Fail (human effort) | Pass |
| **Reversibility** | Two-way door | Two-way | Two-way | Two-way |

### Option A: Agent drafts, human locks, fail-first, green gate (Chosen)
- **Why Chosen:** Passes all drivers at one confirmation per goal.
- **Key Caveat:** Completeness of the check still rests on human review.

### Option B: Agent writes the check, no lock
- **Description:** The agent writes and edits the check as it works.
- **Strongest Argument:** Fastest; no interruptions.
- **Why Rejected:** Fails DRV-02 and DRV-03; the H3 overfit pattern.

### Option C: Human writes the check
- **Description:** The human authors every done-check.
- **Strongest Argument:** Maximum independence.
- **Why Rejected:** Fails DRV-04 on effort; drafting is where the agent saves most time.

### Option D: Human closes at will
- **Description:** No check; the human says when it is done.
- **Strongest Argument:** Flexible.
- **Why Rejected:** Fails DRV-01 and DRV-03; closure is an assertion.

## Revisit Criteria

- **H5 (kill rule):** if sessions with `/goal` do not stop within 1 turn of a green check more often than sessions without it, or out-of-scope commits are not below 10%, downgrade `/goal` to a notes file (keep `goal.md`; drop injection, lock and closure gate).
- Fail-on-base proves too weak in practice (goals close green while the outcome is unmet): add mutation scoring of the check where supported.
