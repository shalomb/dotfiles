# ADR-004: Risk-Tiered Critic Gate with Unified Rebase-Before-Verify

- **Status:** Accepted — Amended 2026-10-31 (TB-3 revisit criterion triggered; see [Amendment 1](#amendment-1-2026-10-31-tb-3-evidence))
- **Date:** 2026-10-31
- **Decider(s):** unop, Main Copilot (Design Session)
- **Consulted:** `bart-adversarial-reviewer` skill, Springfield `pipeline-redesign.md`
- **Informed:** Builder Subagents, Adversarial Critic Subagents, Wave Runner
- **Supersedes:** N/A

## Context

In `~/shalomb/springfield/`, every single execution pass spawned a separate Adversarial Reviewer agent (`Bart`) in a new session, followed by a separate merge step. In practice, Round 3 and Round 7 of our design analysis identified three flaws with an always-on separate reviewer:
1. **Duplicate Context Tax & Latency:** A fresh Critic subagent must re-read the repository and diff from scratch, doubling cold-start token spend and delaying the return of learning signals to the Main Copilot.
2. **Divergent Assumptions on Routine Work:** On small, low-risk batches, a second LLM frequently invents stylistic objections or conflicting assumptions rather than catching real bugs.
3. **Pre-Rebase Verification Gap:** Reviewing a branch *before* rebasing it onto the `Feature Worktree` misses semantic integration conflicts introduced by sibling batches in the same wave.

## Decision Drivers

1. **[DRV-01 — Fast Learning Turnaround]:** Routine batches must integrate and return their `Batch Receipt` without paying a second LLM cold-start penalty.
2. **[DRV-02 — Post-Rebase Verification Truth]:** Verification must test the exact commit tree that will fast-forward into the `Feature Worktree`.
3. **[DRV-03 — Adversarial Rigour on High-Risk Changes (`H3`)]:** Changes touching hub files, security/public APIs, or proposed ADR hypotheses must still undergo independent adversarial review to defeat LLM self-compliance bias.
4. **[DRV-04 — Cost Optimization (WAF)]:** Review token spend must scale proportionally to batch risk.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code Architecture
- **Primary Framework:** ISO/IEC 25010 (Testability & Maintainability) + AWS WAF (Cost Optimization)
- **Guiding Quality Pillars:**
  1. *Software Testability & Architectural Reification:* Deterministic checks (rebase, test suite, linter, ACP audit) enforce baseline quality mechanically on 100% of batches.
  2. *Cost Optimization (WAF):* Reserves expensive independent LLM adversarial review for high-risk and wave-boundary changes.

## Decision

Implement a unified, **Risk-Tiered Critic Gate** inside the `Transient Worktree`:
1. **Rebase First:** Upon Builder completion, the gate rebases the `Transient Worktree` onto the current `Feature Worktree` HEAD before running verification.
2. **Tier 0 / Tier 1 (Low-Risk Default — Deterministic Gate Only):** Runs the test suite, linter, ACP commit check, and deterministic risk classifier. If green and low-risk, it fast-forwards the `Feature Worktree` immediately with **zero second subagent spawn**.
3. **Tier 2 (High-Risk / Wave Boundary — Independent Adversarial Critic):** If the batch touches high-fan-out hub files, public API/security paths, or a proposed ADR hypothesis, or if the deterministic gate raises a warning, the runner spawns an independent Adversarial Critic (`Bart`) in the rebased worktree to verify, score, and approve the fast-forward merge.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | Spawning a separate reviewer LLM on every batch doubles cold-start latency and tokens; pre-rebase reviews miss integration bugs. |
| **Constraint(s)** | Must keep routine batch turnaround fast (`DRV-01`, `DRV-04`) while verifying the true post-rebase state (`DRV-02`). |
| **Requirement(s)** | Catch $\ge 85\%$ of low-risk issues deterministically while applying full adversarial review on risky changes (`DRV-03`). |
| **Decision** | Rebase onto the Feature Worktree first, run a Deterministic Gate on all batches, and spawn the Critic LLM only on high risk. |
| **Alternatives Rejected** | Option B: Always spawn separate Critic LLM per batch; Option C: Separate pre-rebase Critic and post-rebase Integrator agents. |
| **Rationale** | Deterministic gates catch mechanical regressions instantly; risk-tiering focuses Bart's adversarial budget where self-review fails. |
| **Tradeoff Accepted** | Subtle semantic flaws in files classified as "low risk" and covered by weak unit tests could bypass Bart until wave boundary. |
| **Decision Authority** | `unop` — gated on Falsifiable Hypothesis `H3` in Tracer Spike `TB-3` (2026-11-30). |

## Architectural Reification & Enforcement

- **Deterministic Risk Classifier:** Evaluates `git diff --name-only` against `codemap` fan-in/fan-out thresholds ($\ge 3$ dependents = hub), security/public API path globs, retry count ($> 0$), and ADR hypothesis tags.
- **Fast-Forward Invariant:** The `Feature Worktree` only accepts `git merge --ff-only` from a `Transient Worktree` that has just rebased onto `Feature Worktree` HEAD and passed the gate.
- **Kill Criterion (`H3`):** If escaped defect rate on low-risk batches exceeds $15\%$ in `TB-3`, tighten the risk classifier thresholds.

## Consequences

### Positive Outcomes (+ Gains)
+ Cuts review LLM token spend and latency to zero on routine, green Work Batches.
+ Unifies review and integration (`Critic Gate`) so every merged commit is verified against the exact `Feature Worktree` HEAD.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- Relies on the accuracy of the deterministic risk classifier and the Builder's Farley test checklist on low-risk batches.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | Option A: Unified Risk-Tiered Critic Gate (Chosen) | Option B: Always-On Separate Critic LLM | Option C: Separate Critic + Separate Integrator |
|---|---|---|---|
| **DRV-01: Fast Learning Turnaround** | High (0 extra LLM pass on low risk) | Low (2x cold-start every batch) | Fail (3x agent passes per batch) |
| **DRV-02: Post-Rebase Truth** | Pass (rebases before verification) | Medium (if rebased first) | Fail (reviews stale pre-rebase tree) |
| **DRV-03: High-Risk Adversarial Rigour** | High (spawns Bart on hub/API/ADR) | High (spawns Bart always) | High |
| **DRV-04: Review Token Efficiency** | High ($< 50\%$ token cost) | Low (100% review tax) | Fail (highest token spend) |
| **Reversibility / Lock-in** | Two-way door (risk threshold config) | Two-way door | Two-way door |

### Option A: Unified Risk-Tiered Critic Gate (Chosen)
- **Why Chosen:** Balances speed and adversarial rigour while ensuring verification happens after rebasing onto the `Feature Worktree`.
- **Key Caveat:** Requires wave-boundary `codemap diff` and Farley index checks to guard against low-risk drift.

### Option B: Always-On Separate Adversarial Critic Subagent
- **Description:** Spawn a fresh Bart subagent session after every Builder batch regardless of complexity.
- **Strongest Argument:** Maximum independence on every commit.
- **Why Rejected:** Violates `DRV-01` and `DRV-04` — repopulating context for trivial batches wastes tokens and slows feedback loops.

### Option C: Separate Pre-Rebase Critic and Post-Rebase Integrator Subagents
- **Description:** One agent reviews the isolated branch, and a second agent rebases and merges it.
- **Strongest Argument:** Separates code critique from git conflict resolution.
- **Why Rejected:** Violates `DRV-01`, `DRV-02`, and `DRV-04` — adds a third agent hop and reviews code before integration.

## Revisit Criteria

- Revisit if Tracer Spike `TB-3` shows $> 15\%$ escaped defects on batches classified as low-risk. **Triggered 2026-10-31** (see Amendment 1).

## Amendment 1 (2026-10-31): TB-3 Evidence

**Finding.** `H3` is **falsified for `todo-navigator`**. The deterministic gate alone does not reach the 85% catch rate on unseen defects, even after targeted test improvement.

| Measurement (`falsify h3`, single-operator mutants, `make test-unit`) | Catch rate | Verdict |
|---|---|---|
| Baseline `main`, 100 mutants | 0.62 | KILL |
| After 4 targeted test commits, on the 100 mutants the tests were written against | 0.95 | PASS (overfit) |
| After the same commits, on 27 mutants never shown to the test writer | 0.63 (baseline 0.52) | **KILL** |

Evidence lives in `~/shalomb/agentic-falsify/runs/h3-tn-*.txt`, harness commit `6dcd219`.

**Amended decision.** The Decision above stands, with two changes to the Deterministic Risk Classifier:
1. **Measured-weak modules are Tier 2.** Any batch touching a module whose *holdout* catch rate is below 0.85 spawns the Adversarial Critic, regardless of fan-in. The initial list is `todo-navigator`'s `parser.py`, `claims.py` and `dag.py`.
2. **Low-risk must be earned, not assumed.** A module only qualifies for Tier 0/1 after a `falsify h3 --partition holdout` run of at least 0.85. Unmeasured modules default to Tier 2.

**Method lesson.** A catch rate computed on mutants that were shown to whoever wrote the tests is not evidence. Only the holdout partition counts toward `H3`. Re-seeding is not a holdout when the mutant population is small: 68 of 100 seed-1 mutants overlapped seed 0.

**Consequence.** For the code `TB-4` and `TB-5` extend, review cost will not drop to deterministic-only. `DRV-04`'s savings now apply only to measured-strong modules, and the `< 50%` review-token target must be re-measured once the Critic is in the loop.
