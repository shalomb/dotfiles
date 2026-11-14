# ADR-015: Index sessions with SQLite FTS5 and trigram fuzzy match

- **Status:** Accepted
- **Date:** 2026-11-14
- **Decider(s):** repo owner
- **Consulted:** pi-profile owner (same person)
- **Informed:** users of pi-find and pi-profile

## Context

Keyword search is SQL LIKE on one digest column. It has no ranking, no typo help and slows as history grows.

## Decision Drivers

1. **DRV-01 Recall:** fuzzy and prefix match.
2. **DRV-02 Speed:** first frame in 300 ms at 5000 sessions.
3. **DRV-03 No new service:** stay inside the existing SQLite registry.
4. **DRV-04 Small N:** work with 5 sessions.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code
- **Primary Framework:** ISO/IEC 25010 & Evolutionary Architecture
- **Guiding Quality Pillars:**
  1. *Performance efficiency:* index lookup, not table scan.
  2. *Maintainability:* one engine, one file.

## Decision

Add an FTS5 index (with a trigram table) to the registry. Rank with it. Fall back to plain OR match when the index has too few words.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | LIKE gives no rank and no typo help. |
| **Constraint(s)** | Same SQLite registry; no service (DRV-03). |
| **Requirement(s)** | Fuzzy recall within 300 ms (DRV-01, DRV-02). |
| **Decision** | FTS5 + trigram index in registry.db. |
| **Alternatives Rejected** | Keep LIKE and score in code. |
| **Rationale** | Ranking and fuzzy match come from the engine. |
| **Tradeoff Accepted** | Schema migration and index upkeep on every backfill. |
| **Decision Authority** | Repo owner; review 2027-02-14 |

## Architectural Reification & Enforcement

A migration test builds the index from fixture sessions. A speed test (H2) fails the build above 300 ms p95 at 5000 sessions.

## Consequences

### Positive Outcomes (+ Gains)
+ Ranked, fuzzy results.
+ Incremental upkeep by mtime.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- Schema migration; index must stay in sync.
- Trigram index increases db size.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Criterion | A (chosen) | B |
|---|---|---|
| DRV-01 Recall | High | Low |
| DRV-02 Speed | High | Low at scale |
| DRV-03 No service | High | High |
| DRV-04 Small N | Needs fallback | High |
| Reversibility | Index can be dropped | n/a |

### Option A: FTS5 + trigram (chosen)
- **Why Chosen:** meets DRV-01 and DRV-02.
- **Key Caveat:** migration and index size.

### Option B: Keep LIKE, score in code
- **Strongest Argument:** no schema change.
- **Why Rejected:** scan cost grows and no fuzzy match (DRV-01, DRV-02).

## Revisit Criteria

- Registry moves off SQLite.
- Index size passes an agreed cap.
