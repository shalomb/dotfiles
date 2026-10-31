# ADR-003: Cohesive Wave Batching with Disjoint Codemap Locks and Prefix Salvage

- **Status:** Amended 2026-10-31: multi-task batching falsified (`H1`); see [Amendment 1](#amendment-1-2026-10-31-h1-evidence)
- **Date:** 2026-10-31
- **Decider(s):** unop, Main Copilot (Design Session)
- **Consulted:** `agent-mux` dependency analysis, `ralph-build-agent` (ACP rules), `codemap` skill
- **Informed:** Batch Planner, Builder Subagents, Deterministic Wave Runner
- **Supersedes:** N/A

## Context

Assigning a subagent one tiny atomic task per `Transient Worktree` wastes significant tokens and wall-clock time on worktree setup, dependency linking, language-server cold start, and repository orientation. Conversely, assigning an entire multi-day Epic to a single subagent causes mid-run context degradation and drift. Furthermore, when multiple `Transient Worktrees` run in parallel without module-coupling locks, they collide on hub files and trigger serial rebase/re-test storms; and if Task $K$ in a multi-task batch blocks, rolling back the whole worktree destroys valid commits already completed for Tasks $1 \dots K-1$.

## Decision Drivers

1. **[DRV-01 — Cold-Start Amortization (`H1`)]:** Grouping related tasks must reduce total tokens and wall-clock time to $< 65\%$ of running those tasks as separate single-task worktree runs.
2. **[DRV-02 — Atomic Commit Integrity (ACP)]:** Batching multiple tasks into one subagent run must never produce monolithic commits; every task must remain independently revertible and tested.
3. **[DRV-03 — Zero Parallel Rebase Thrash]:** Concurrent `Transient Worktrees` in the same wave must not modify overlapping files or coupled module neighborhoods.
4. **[DRV-04 — Partial Progress Preservation]:** A blocker on task $K$ of a batch must never discard verified commits produced for tasks $1 \dots K-1$.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code Architecture + Cloud/Compute Efficiency
- **Primary Framework:** AWS Well-Architected Framework (Performance Efficiency & Reliability) + ISO/IEC 25010
- **Guiding Quality Pillars:**
  1. *Performance Efficiency & Cost Optimization (WAF):* Amortizes worktree provisioning and context warm-up across 2–5 cohesive tasks while sharing build caches.
  2. *Reliability & Blast Radius Containment (WAF):* `Disjoint Codemap Lock` prevents cross-worktree interference, and `Prefix Salvage` bounds failure loss to the single blocked task.

## Decision

Execute backlog work in **Cohesive Work Batches of 2 to 5 tasks** per `Transient Worktree` under three mechanical invariants:
1. **One ACP Commit per Task:** The Builder executes tasks sequentially inside the batch worktree, producing one tested Atomic Commit Protocol (ACP) commit per task.
2. **Max 3 Worktrees with Disjoint Codemap Lock:** At most 3 `Transient Worktrees` run concurrently (sharing `.venv`/`node_modules` caches), and `todo batch` enforces a `Disjoint Codemap Lock` so parallel batches have zero overlap in target files or direct `codemap` fan-out.
3. **Prefix Salvage on Mid-Batch Block:** If task $K$ fails after 2 retries (triggering OHECI escalation), the gate fast-forwards the verified ACP commits for tasks $1 \dots K-1$ into the `Feature Worktree`, marks tasks $1 \dots K-1$ `done`, and returns only tasks $K \dots N$ to `todo`.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | Single-task worktrees waste cold-start tokens; whole-epic runs drift; unlocked parallel branches cause rebase storms. |
| **Constraint(s)** | Max 3 concurrent worktrees; strict ACP one-commit-per-task rule (`DRV-02`, `DRV-03`). |
| **Requirement(s)** | $< 65\%$ token/time cost vs single runs (`DRV-01`) with zero loss of completed prefix tasks (`DRV-04`). |
| **Decision** | Group 2–5 cohesive tasks per worktree with Disjoint Codemap Locks, 1 ACP commit/task, and Prefix Salvage. |
| **Alternatives Rejected** | Option B: One atomic task per worktree; Option C: One whole Epic per worktree with all-or-nothing rollback. |
| **Rationale** | Shares warm module context across related tasks while ACP commits enable exact prefix salvage on partial failure. |
| **Tradeoff Accepted** | Requires `todo batch` to compute `codemap` fan-out sets and the gate to cherry-pick/fast-forward commit prefixes. |
| **Decision Authority** | `unop` — gated on Falsifiable Hypothesis `H1` in Tracer Spike `TB-1` (2026-11-30). |

## Architectural Reification & Enforcement

- **`todo batch` Disjointness Check:** Computes $\text{files}(B_i) \cup \text{fanout}_1(B_i)$ via `codemap` and serializes any two batches whose sets intersect.
- **ACP Commit Verification:** Deterministic Gate verifies that each completed task $t_j$ maps to a distinct signed commit SHA passing tests before fast-forwarding $t_1 \dots t_{K-1}$.
- **Kill Criterion (`H1`):** If Tracer Spike `TB-1` shows a 3-task `Work Batch` uses $\ge 85\%$ of the tokens/time of 3 single-task runs, collapse batch size to 1.

## Consequences

### Positive Outcomes (+ Gains)
+ Subagent loads the module's mental model once and applies it across 2–5 related tasks.
+ Parallel batches merge cleanly without $N$-way conflict resolution storms.
+ Completed prefix work ($1 \dots K-1$) lands immediately even when a later task in the batch hits an assumption break.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- Tasks must carry or infer file/module anchors so `todo batch` can compute disjoint `codemap` neighborhoods.
- Sequential tasks inside a batch share one worktree; if task 2 depends on a flawed design choice in task 1, both may need rework.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | Option A: Cohesive Batch (2–5) + Disjoint Lock + Prefix Salvage (Chosen) | Option B: 1 Atomic Task per Worktree | Option C: Whole Epic per Worktree (All-or-Nothing) |
|---|---|---|---|
| **DRV-01: Cold-Start Efficiency (`H1`)** | High (1 warm-up per 2–5 tasks) | Fail (3–5x cold-start tax) | High (1 warm-up per epic) |
| **DRV-02: ACP Commit Granularity** | Pass (1 ACP commit per task) | Pass (1 commit per worktree) | Low (prone to tangled commits) |
| **DRV-03: Zero Parallel Rebase Thrash** | Pass (`Disjoint Codemap Lock`) | Low (frequent hub collisions) | Fail (long-lived branch drift) |
| **DRV-04: Partial Failure Salvage** | Pass (`Prefix Salvage` $1 \dots K-1$) | Pass (isolated per task) | Fail (rolls back entire epic) |
| **Reversibility / Lock-in** | High (batch size is a config parameter $1 \dots 5$) | High | Medium |

### Option A: Cohesive Wave Batch (2–5 Tasks) with Disjoint Codemap Lock and Prefix Salvage (Chosen)
- **Why Chosen:** Captures the warm-context efficiency of multi-task execution while preserving single-task commit atomicity and salvageability.
- **Key Caveat:** Gated on Hypothesis `H1` proving $< 65\%$ cost in `TB-1`.

### Option B: One Atomic Task per Transient Worktree
- **Description:** Spawn a fresh worktree and subagent for every single backlog task.
- **Strongest Argument:** Simplest failure isolation — no prefix salvage needed.
- **Why Rejected:** Fails `DRV-01` — worktree setup, test runner spin-up, and file reading repeat for every small change on the same module.

### Option C: One Whole Epic per Worktree with All-or-Nothing Rollback
- **Description:** Hand an entire Epic to a subagent to decompose and merge only when 100% complete.
- **Strongest Argument:** Minimal planning intervention between tasks.
- **Why Rejected:** Violates `DRV-03` and `DRV-04` — long-running branches drift from `Feature Worktree` HEAD and lose valid early commits when a late task blocks.

## Revisit Criteria

- Revisit immediately if Tracer Spike `TB-1` falsifies `H1` ($\ge 85\%$ token/time cost compared to single-task runs). **Triggered 2026-10-31** (see Amendment 1).

## Amendment 1 (2026-10-31): H1 Evidence

**Finding.** `H1` (a 3-task `Work Batch` costs < 65% of 3 single-task runs in tokens *and* time) is **falsified**. In none of 4 replicates, across 2 repos and 2 models, did it pass. In every replicate, the batch was slower than the same 3 tasks run as parallel singles. Quality was identical in every arm: all hidden acceptance tests passed, the suites stayed green, and each arm made the expected commits.

| Run | Repo (setup per arm) | Model | Tokens | $ cost | Wall vs sequential singles | **Wall vs parallel singles** |
|---|---|---|---|---|---|---|
| H1 r1 | agentic-falsify (~2 s) | claude-sonnet-5-5 | 1.60 | 1.07 | 0.46 | **1.24** |
| H1 r2 | agentic-falsify | claude-sonnet-5-5 | 1.94 | 1.32 | 0.48 | **1.36** |
| H1b r1 | agent-skills monorepo, 926 files (~12 s) | gemini-4-argon | 1.25 | 1.12 | 0.44 | **1.27** |
| H1b r2 | agent-skills monorepo | gemini-4-argon | 0.68 | 0.65 | 0.41 | **1.20** |

Evidence lives in `~/shalomb/agentic-falsify/runs/h1/`, `runs/h1b/` and `runs/FINDINGS.md`.

**Why.**
1. **Wall time is structurally lost.** A batch does its tasks one after another, so it cannot beat 3 tasks running at once when provisioning is cheap. Provisioning was 12 s even for the monorepo, against 4–5 min of agent work.
2. **Token savings are not reliable.** The batch's context grows with every task, so it pays for cache reads (1.3–2.3×) to save fresh input (0.5–1.1×). Run-to-run variance (0.68–1.94) is larger than any batching effect.

**Amended decision.**
1. **Default to one task per `Transient Worktree`,** with up to 3 running concurrently under the existing `Disjoint Codemap Lock`. Invariant 2 stands. The batch size cap becomes 1.
2. **Invariant 1 stands** (one ACP commit per task). **Invariant 3 (`Prefix Salvage`) becomes moot** with one task per worktree, though the gate keeps it for any future multi-task use.
3. `todo batch` is repurposed as **wave scheduling.** It still uses WSJF and `codemap` disjointness to pick which ≤ 3 tasks run in parallel; it no longer packs several tasks into one worktree.

**Re-open only if** provisioning dominates agent time (e.g. > 50% of a single run, as with heavy container builds or very large dependency installs), and then re-run `spikes/h1b` with ≥ 3 replicates per model.
