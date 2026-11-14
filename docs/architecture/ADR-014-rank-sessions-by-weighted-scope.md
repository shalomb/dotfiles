# ADR-014: Rank sessions by weighted match across widening scopes

- **Status:** Accepted
- **Date:** 2026-11-14
- **Decider(s):** repo owner
- **Consulted:** pi-profile owner (same person)
- **Informed:** users of pi-find and pi-profile

## Context

pi-find returns nothing when one remembered word is wrong. Users come back to a repo and misremember terms. /locate already ranks across zones with weights.

## Decision Drivers

1. **DRV-01 Recall:** a wrong term must not hide the session.
2. **DRV-02 Locality:** sessions near the cwd come first.
3. **DRV-03 Consistency:** same model as /locate.
4. **DRV-04 Simplicity:** one list in fzf.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code
- **Primary Framework:** ISO/IEC 25010 & Evolutionary Architecture
- **Guiding Quality Pillars:**
  1. *Usability:* finds the right session despite wrong terms.
  2. *Modifiability:* weights live in one table.

## Decision

Search every scope in one pass. Score = term match x scope weight (cwd 1.0, repo 0.9, parent 0.75, home 0.5, registry 0.25). Show one ranked list.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | Exact AND search gives zero rows on one wrong term. |
| **Constraint(s)** | One list; reuse /locate weights (DRV-03, DRV-04). |
| **Requirement(s)** | Recall under misremembered terms; near results first (DRV-01, DRV-02). |
| **Decision** | Single weighted ranking across all scopes. |
| **Alternatives Rejected** | Widen only when empty; widen on key press. |
| **Rationale** | Near hits rank high, far hits stay visible. |
| **Tradeoff Accepted** | Weights are hand-set; a weak near hit can outrank a strong far hit. |
| **Decision Authority** | Repo owner; review 2027-02-14 |

## Architectural Reification & Enforcement

A pure function `rankSessions(rows, terms, env)` in `registry-find.ts`, unit-tested with fixed weights. A test asserts a far exact match outranks a near non-match.

## Consequences

### Positive Outcomes (+ Gains)
+ Misremembered terms still surface the session.
+ Same mental model as /locate.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- Weights need tuning; wrong weights mislead.
- Ranking cost grows with registry size.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Criterion | A (chosen) | B | C |
|---|---|---|---|
| DRV-01 Recall | High | Medium | High |
| DRV-02 Locality | High | High | High |
| DRV-03 Consistency | High | Low | Low |
| DRV-04 Simplicity | High | High | Low |
| Reversibility | Two-way door | Two-way door | Two-way door |

### Option A: Single weighted ranking (chosen)
- **Why Chosen:** fits all four drivers.
- **Key Caveat:** hand-set weights.

### Option B: Widen only when a scope is empty
- **Strongest Argument:** cleaner list.
- **Why Rejected:** a weak near hit hides a strong far hit (DRV-01).

### Option C: Widen on key press
- **Strongest Argument:** user control.
- **Why Rejected:** adds a step (DRV-04).

## Revisit Criteria

- Replayed-query recall (H1) falls below 90%.
