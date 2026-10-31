# ADR-006: Three-Stream Learning Loop with Cold-Start Guards

- **Status:** Accepted
- **Date:** 2026-10-31
- **Decider(s):** unop, Main Copilot (Design Session)
- **Consulted:** Obsidian `Tech/AI/AgenticLoops.md` (`OLA`, `RDS`, `TALAR`), Lexler `Learning Loop` & `Memory Grooming`
- **Informed:** Batch Planner, Builder & Critic Subagents, Rule Synthesizer
- **Supersedes:** N/A

## Context

Standard agentic "learning loops" (such as basic Reflexion) treat learning solely as appending prose lessons to `AGENTS.md` or adjusting model routing weights. During Round 2, Round 4, and Round 7 of our design session, three gaps in that model emerged:
1. **Missing Product & Backlog Learning:** Real implementation discoveries fall into two domain classes before harness tuning: **Class 1 (`Forward Refinement`)** — discovering concrete signatures and constraints that reduce uncertainty in unstarted backlog tasks; and **Class 2 (`Course Correction`)** — discovering that standing code or an earlier assumption on the `Feature Worktree` is defective.
2. **Critique Overhead on Trivial Batches:** Running a full 3-stream LLM reflection pass on every trivial doc or config batch wastes tokens.
3. **Small-Sample Overfitting:** A single feature session runs only 5–15 batches — far too few samples for a live contextual bandit — and unvalidated auto-synthesized lint rules can break builds on 1–2 coincidental failures.

## Decision Drivers

1. **[DRV-01 — Forward Uncertainty Reduction]:** Discoveries in Wave $N$ must sharpen unstarted `todo` task cards before Wave $N+1$ begins.
2. **[DRV-02 — Standing Defect Course Correction]:** Discovered defects in standing code or design assumptions must route by severity into local repair tasks or a human-copilot design pivot.
3. **[DRV-03 — Proportional Telemetry Cost]:** Trivial batches must incur zero LLM reflection overhead while still contributing raw traces for wave-boundary pattern mining.
4. **[DRV-04 — Cold-Start & Rule Safety]:** Automated routing updates and synthesized `ast-grep`/lint rules must not overfit small samples or break builds prematurely.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code Architecture
- **Primary Framework:** Evolutionary Architecture & ISO/IEC 25010
- **Guiding Quality Pillars:**
  1. *Evolvability & Feedback Loops:* Routes execution evidence into backlog sharpening (Class 1), defect correction (Class 2), and mechanical fitness functions (Class 3).
  2. *Reliability & Blast Radius Containment:* Enforces a $N \ge 20$ cross-session trajectory floor for bandit updates and a warn-only canary gate for synthesized rules.

## Decision

Implement a **Three-Stream Learning Loop with Proportional Telemetry and Cold-Start Guards**:
1. **Proportional Telemetry:** Tier 0 trivial batches emit deterministic metrics only (0 LLM tokens); Tier 1 standard batches add a 3-line Builder delta note; Tier 2 high-risk/wave-boundary runs execute full pattern mining over `trajectories.jsonl`.
2. **Three Learning Streams:**
   - **Class 1 (`Forward Refinement`):** Propagates discovered anchors and constraints into open `todo` task cards before the next wave.
   - **Class 2 (`Course Correction`):** Auto-tasks localized standing defects (via the `Intent Governor`) and escalates architectural/intent breaks to the Main Copilot and human.
   - **Class 3 (`Rule Synthesizer & Routing`):** Compiles recurring patterns ($\ge 2$ hits) into semantic anchors or `ast-grep`/lint rules and updates model/batch routing weights.
3. **Cold-Start & Canary Guards:** Model/batch routing uses deterministic heuristics until $N \ge 20$ cross-session trajectories exist in `trajectories.jsonl`, and all synthesized rules deploy in **warn-only canary mode** until promoted by human approval.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | Prompt-only learning ignores backlog uncertainty and standing code defects, while per-session RL overfits small samples. |
| **Constraint(s)** | Zero LLM reflection tax on trivial batches (`DRV-03`) and only 5–15 batches per feature session (`DRV-04`). |
| **Requirement(s)** | Sharpen future backlog tasks (`DRV-01`), course-correct defective standing code (`DRV-02`), and evolve rules safely (`DRV-04`). |
| **Decision** | Combine Proportional Telemetry with 3 learning streams (Forward Refinement, Course Correction, Canary Rules/Bandit $N \ge 20$). |
| **Alternatives Rejected** | Option B: Prompt-only Reflexion (`AGENTS.md` append); Option C: Full LLM critique + live bandit update on every batch. |
| **Rationale** | Separates cheap per-batch trace capture from wave-boundary mining and protects the repo with canary gates and cross-session priors. |
| **Tradeoff Accepted** | Class 3 routing adaptation activates only after 20 batches accumulate across sessions. |
| **Decision Authority** | `unop` — review after Tracer Spike `TB-4` / `TB-6` (2026-11-30). |

## Architectural Reification & Enforcement

- **`trajectories.jsonl` Schema:** Records `batch_id`, `tier` (`0|1|2`), `reward` (test pass, Farley/Adzic, ACP, retries), `forward_refinements[]`, `course_corrections[]`, and `observations[]`.
- **Cold-Start Guard:** The routing selector checks `wc -l < trajectories.jsonl >= 20` before reading bandit weights; otherwise it uses static risk-tier rules.
- **Canary Rule Flag:** Synthesized rules in `.pi/` or repo linters carry `severity: warn` (`canary: true`) until explicitly promoted.

## Consequences

### Positive Outcomes (+ Gains)
+ Open backlog tasks become progressively sharper and less uncertain with each completed wave.
+ Standing defects in existing code are caught and routed systematically rather than ignored or patched out-of-scope.
+ Trivial batches pay zero LLM reflection tax while still feeding wave-boundary pattern mining.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- Requires `todo replan` and the wave-boundary miner to parse `trajectories.jsonl` entries.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | Option A: 3-Stream + Proportional Telemetry + Cold-Start Guards (Chosen) | Option B: Prompt-Only Reflexion (`AGENTS.md` Append) | Option C: Full LLM Reflection + Live Per-Batch Bandit |
|---|---|---|---|
| **DRV-01: Forward Backlog Refinement** | Pass (Class 1 updates open `todo` cards) | Fail (leaves backlog cards stale) | Pass |
| **DRV-02: Standing Defect Course Correction** | Pass (Class 2 severity split) | Fail (no backlog feedback path) | Pass |
| **DRV-03: Proportional Telemetry Cost** | Pass (0 LLM tokens on Tier 0) | Medium | Fail (full LLM pass on every trivial batch) |
| **DRV-04: Cold-Start & Rule Safety** | Pass ($N \ge 20$ floor + canary rules) | Low (prompt bloat / contradictions) | Fail (overfits noise; brittle hard rules) |
| **Reversibility / Lock-in** | Two-way door (JSONL ledger) | Two-way door | Two-way door |

### Option A: Three-Stream Learning Loop with Proportional Telemetry and Cold-Start Guards (Chosen)
- **Why Chosen:** Captures product, backlog, and harness learning at wave boundaries without slowing down trivial batches or overfitting small samples.
- **Key Caveat:** Depends on `ADR-007` (`Intent Governor`) to prevent Class 2 discoveries from flooding the backlog.

### Option B: Prompt-Only Reflexion (Append Lessons to `AGENTS.md`)
- **Description:** Append textual lessons learned to `AGENTS.md` at the end of each batch or session.
- **Strongest Argument:** Trivial to implement.
- **Why Rejected:** Violates `DRV-01`, `DRV-02`, and `DRV-04` — does not refine backlog tasks, does not course-correct standing code defects, and bloats prompt memory over time.

### Option C: Full LLM Reflection and Live Bandit Updates on Every Batch
- **Description:** Run a dedicated reflection LLM and update routing weights + hard lint rules after every single batch.
- **Strongest Argument:** Maximum immediate adaptation.
- **Why Rejected:** Violates `DRV-03` and `DRV-04` — wastes tokens on trivial batches and overfits on 1–2 noisy trials.

## Revisit Criteria

- Revisit the $N = 20$ trajectory threshold once cross-session telemetry from 3+ repositories is available to calibrate bandit convergence speed.
