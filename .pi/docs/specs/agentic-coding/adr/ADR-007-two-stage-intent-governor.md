# ADR-007: Two-Stage Intent Governor (Ingress Observations, Observation Heat WSJF, and Convergence Pruner)

- **Status:** Accepted
- **Date:** 2026-10-31
- **Decider(s):** unop, Main Copilot (Design Session)
- **Consulted:** Obsidian `Tech/AI/AgenticLoops.md` (`Backpressure Loop`), `todo-navigator` (WSJF engine)
- **Informed:** Batch Planner, Builder & Critic Subagents, Main Copilot
- **Supersedes:** N/A

## Context

When autonomous subagents and adversarial critics are allowed to emit new backlog tasks whenever they spot a code smell, tech debt item, or edge case, the system suffers from **runaway intent inventory**: it generates more backlog tasks per wave than it completes (`Convergence Ratio > 1.0`). Agent attention and human review time shift from delivering outcomes to grooming an ever-growing backlog. However, simply dropping non-urgent findings loses valuable signals when multiple batches repeatedly hit friction in the same module.

## Decision Drivers

1. **[DRV-01 — Guaranteed Backlog Convergence (`H4`)]:** The system must prevent runaway task generation so the backlog converges toward zero open P0/P1 tasks without manual bankruptcy cleanup.
2. **[DRV-02 — Zero Lost Insights (Observation Capture)]:** Non-urgent findings filtered out at ingress must still be recorded so recurring friction patterns are detected across waves.
3. **[DRV-03 — Adaptive WSJF Prioritization]:** When recurring friction (`Observations`) clusters around a module that already has an open task, that task's priority (Cost of Delay) must rise automatically.
4. **[DRV-04 — Dynamic Pruning Aggression]:** Consolidation and pruning must tighten automatically whenever task creation outpaces task completion.

## Domain Quality Framework Alignment

- **Domain Archetype:** Distributed Systems & Control Theory + Software Architecture
- **Primary Framework:** Control Theory Backpressure + Lean WSJF Prioritization
- **Guiding Quality Pillars:**
  1. *Backpressure & Load Decoupling:* Regulates ingress task admission and wave-boundary pruning using the measurable `Convergence Ratio`.
  2. *Evolutionary Architecture:* Allows latent `Observations` to influence `todo replan` WSJF scores dynamically as empirical trends emerge.

## Decision

Enforce a **Two-Stage Intent Governor** across ingress and wave boundaries:
1. **Stage 1 — `Ingress Admission Filter`:**
   - Micro-fixes ($< 15$ lines inside already-touched files) are folded directly into the current or next `Work Batch` (0 new cards).
   - Findings that block the North Star or represent P0/P1 regressions are admitted to `todo` (or escalated if architectural).
   - All other non-urgent P2/P3 findings are **not** created as `todo` tasks; they are appended to `trajectories.jsonl` as structured **`Observations`** carrying a `file:symbol` or module anchor.
2. **Stage 2 — `Observation Heat` WSJF + `Convergence Ratio` Wave Pruner:**
   - At each wave boundary, `todo replan` counts `Observations` per module anchor and adds an **`Observation Heat`** bonus to the Cost of Delay (WSJF) of any open task matching that anchor.
   - Unassigned `Observation` clusters ($\ge 2$ occurrences across waves) promote to a new `todo` task only when the wave `Convergence Ratio` ($\text{Tasks Added} / \text{Tasks Completed}$) is $\le 1.0$.
   - When `Convergence Ratio` $> 1.0$, the governor enters **Aggressive Prune Mode**: it blocks standalone P2/P3 task promotion, merges tasks sharing module anchors into existing batches, and prunes low-WSJF leaf tasks that lack a North Star link.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | Unfiltered subagent feedback creates runaway backlog bloat, while dropping P2/P3 findings loses recurring friction signals. |
| **Constraint(s)** | Must keep `Convergence Ratio` $\le 1.0$ after discovery waves (`DRV-01`) without human triage on every minor finding. |
| **Requirement(s)** | Capture non-urgent insights (`DRV-02`), boost WSJF on hot modules (`DRV-03`), and auto-prune when diverging (`DRV-04`). |
| **Decision** | Divert non-urgent findings to JSONL Observations at ingress, add Observation Heat to WSJF, and prune by Convergence Ratio. |
| **Alternatives Rejected** | Option B: Admit all findings to `todo` and prune later; Option C: Strict 1-in-1-out hard cap or human-only task creation. |
| **Rationale** | Decouples observation capture (`trajectories.jsonl`) from committed backlog intent (`TODO.md`) until a trend or WSJF justifies action. |
| **Tradeoff Accepted** | One-off P2/P3 observations that never recur remain in `trajectories.jsonl` rather than becoming scheduled tasks. |
| **Decision Authority** | `unop` — gated on Falsifiable Hypothesis `H4` in Tracer Spike `TB-4` (2026-11-30). |

## Architectural Reification & Enforcement

- **WSJF Formula Extension in `todo replan`:**
  $$\text{WSJF}(t) = \frac{\text{CoD}_{\text{base}}(t) + \text{ObservationHeat}(\text{anchors}(t))}{\text{JobSize}(t)}$$
- **Convergence Ratio Gate:** Computed deterministically at wave end as $\Delta = \text{added} / \max(1, \text{completed})$.
- **Kill Criterion (`H4`):** If open backlog inventory grows monotonically across 3 consecutive waves in `TB-4`, lock autonomous task creation to P0 regressions only.

## Consequences

### Positive Outcomes (+ Gains)
+ Keeps `TODO.md` lean, high-signal, and converging toward completion.
+ Preserves 100% of subagent observations in `trajectories.jsonl` so recurring tech debt automatically boosts the WSJF priority of related tasks.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- Requires `todo` task cards and `Observations` to carry normalized file or module anchors so `Observation Heat` joins accurately.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | Option A: Ingress Filter (Observations) + WSJF Heat + Convergence Pruner (Chosen) | Option B: Admit All to `todo`, Prune at Wave End | Option C: Human Approves Every New Task |
|---|---|---|---|
| **DRV-01: Backlog Convergence (`H4`)** | Pass (blocks ingress bloat + prunes on $\Delta > 1.0$) | Low (churns `TODO.md` mid-wave) | Pass |
| **DRV-02: Zero Lost Insights** | Pass (logged as JSONL `Observations`) | Pass | Medium (dropped if human skips) |
| **DRV-03: Adaptive WSJF Prioritization** | Pass (`Observation Heat` boosts CoD) | Fail (flat ticket pile) | Fail (manual re-ranking) |
| **DRV-04: Low Human Triage Overhead** | High (autonomous filtering & folding) | Medium | Fail (interrupts human after every batch) |
| **Reversibility / Lock-in** | Two-way door (thresholds in `todo replan`) | Two-way door | Two-way door |

### Option A: Two-Stage Intent Governor (Chosen)
- **Why Chosen:** Treats non-urgent findings as *observations* first and *intent* only when recurrence, WSJF heat, and convergence budget justify action.
- **Key Caveat:** Gated on Hypothesis `H4` in Tracer Spike `TB-4`.

### Option B: Post-Hoc Wave Pruner Only (Admit All Findings to `todo`)
- **Description:** Let subagents create `todo` tasks for every finding and prune low-priority tasks at the end of the wave.
- **Strongest Argument:** Only one intake path (`todo add`).
- **Why Rejected:** Violates `DRV-01` and `DRV-03` — pollutes `TODO.md` during the wave and fails to aggregate recurring observations into WSJF heat on existing tasks.

### Option C: Human-Only Task Creation / Approval
- **Description:** Subagents cannot add tasks; the human must approve every candidate finding.
- **Strongest Argument:** Zero autonomous backlog growth.
- **Why Rejected:** Violates `DRV-04` — interrupts the human partner for routine local bug fixes and micro-refinements.

## Revisit Criteria

- Revisit the promotion threshold ($\ge 2$ occurrences) or `Observation Heat` weight if `TB-4` shows either premature promotion ($\Delta > 1.0$) or starvation of legitimate tech-debt fixes.
