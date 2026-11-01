# Design tree: agentic-coding-system

Goal: Design a human-in-the-loop agentic coding system where a Main Copilot manages intent with the human, delegates Work Batches to subagents in Transient Worktrees, preserves context hygiene via pointer-rich Batch Receipts, and improves via reinforcement-style learning loops.
Stance: long horizon

- [settled] horizon.stance -- Long horizon (zero-based).
    Reason: Treat Springfield and pi extensions as evidence, not authority; reuse what works (`todo`, `codemap`, sentinel handshakes) while rejecting LLM-heavy orchestration overhead. Round 1 & 7.
- [settled] artefact.home -- ~/.pi/docs/specs/agentic-coding/.
    Reason: Keeps design artefacts inside pi specs and neutral across repositories. Round 1.
- [settled] control.topology -- Interactive Copilot + deterministic runner.
    Reason: Main Copilot stays interactive with the human while a deterministic runner manages subagent lifecycles. Round 1. ADR: adr/ADR-001-copilot-deterministic-topology.md
  - [settled] control.topology.batch-planner -- Deterministic `todo` CLI batching by default; LRM Batch Planner subagent invoked only on ambiguity or wave-end pivot.
      Reason: Refined in Round 7 (`waf.cost-overhead-cap`): goes against LLM-orchestration bloat so routine waves require 0 planning LLM passes and only 1 LLM pass per batch (the Builder). Round 2 & 7.
  - [settled] control.topology.merge-authority -- Unify Critic + Integrator (rebase onto Feature Worktree, then review and fast-forward).
      Reason: One gate rebases onto the Feature Worktree, verifies the integrated code, and merges when green. Round 3.
  - [settled] control.topology.subagent-pipeline -- Risk-tiered: Builder + deterministic gate by default; independent Adversarial Critic on high-risk or wave-boundary batches.
      Reason: Avoids double cold-start and latency on routine batches while preserving independent adversarial review on hub/security/ADR changes. Round 4. ADR: adr/ADR-004-risk-tiered-critic-gate.md
- [settled] state.backlog-store -- Extend `todo` CLI as single store.
    Reason: Zero repo pollution, human-editable markdown cards, WSJF waves, and file-locked claims. Round 1. ADR: adr/ADR-002-single-out-of-repo-todo-store.md
  - [settled] state.backlog-store.batch-schema -- Batch cards (`batches/<id>.md`) + JSONL ledger in cache.
      Reason: Human-readable batch cards in `todo` plus an append-only `trajectories.jsonl` for RL scoring and Observation mining. Round 2. ADR: adr/ADR-002-single-out-of-repo-todo-store.md
- [settled] work.batching -- Cohesive Wave Batch (2-5 related tasks, one ACP commit per task).
    Reason: Amortizes worktree and cold-start cost while preserving atomic commits. Round 1 & 2. ADR: adr/ADR-003-cohesive-wave-batching-and-prefix-salvage.md
  - [settled] work.batching.retry-escalation -- Max 2 retries, then OHECI escalate.
      Reason: Fixes normal bugs locally in 1-2 passes; surfaces real assumption breaks fast without burning tokens. Round 3.
  - [settled] waf.worktree-concurrency -- Max 3 concurrent Transient Worktrees + Disjoint Codemap Lock + shared build cache.
      Reason: Prevents parallel rebase storms and dependency cold-start overhead. Round 7. ADR: adr/ADR-003-cohesive-wave-batching-and-prefix-salvage.md
  - [settled] waf.partial-batch-salvage -- Prefix Salvage: fast-forward green ACP commit prefix (1..K-1) and release blocked tail tasks (K..N) back to `todo`.
      Reason: Preserves valid, tested ACP commits when a later task in the batch hits an assumption break. Round 7. ADR: adr/ADR-003-cohesive-wave-batching-and-prefix-salvage.md
- [settled] context.hygiene -- Offload + Checkpoint + Compact Receipt with Context Pointers.
    Reason: Subagents return pointer-rich Batch Receipts so the Main Copilot never ingests raw logs unless it follows a pointer on demand. Round 1. ADR: adr/ADR-005-context-hygiene-and-pointer-receipts.md
  - [settled] context.hygiene.pointer-contract -- Strict <=25-line Receipt with URI/anchor pointers.
      Reason: Caps Main Copilot token intake per batch and makes every artifact inspectable on demand. Round 2.
  - [settled] context.hygiene.checkpoint-trigger -- Auto-checkpoint per wave + budget threshold gate (60%).
      Reason: Flushes state after every wave and prompts for a clean context reset before attention degrades. Round 2.
  - [settled] waf.context-drift-guard -- Wave-boundary `codemap diff` + human acknowledgement on checkpoint reset.
      Reason: Lets the Main Copilot catch structural drift across waves without reading per-batch diffs. Round 7. ADR: adr/ADR-005-context-hygiene-and-pointer-receipts.md
- [settled] learning.loop-mechanism -- Two-tier Verbal RL + Policy/Rule Grooming.
    Reason: Combines immediate batch critic scoring with trajectory-driven updates during execution. Round 1. ADR: adr/ADR-006-three-stream-learning-loop.md
  - [settled] learning.loop-mechanism.policy-target -- Three-stream loop: Forward Refinement (Class 1) + Course Correction (Class 2) + Rules/Routing (Class 3).
      Reason: Treats backlog sharpening and defective-code course correction as primary alongside rule synthesis. Round 3.
  - [settled] learning.loop-mechanism.backlog-refinement -- Deterministic anchor propagation + Batch Planner updates on open `todo` cards at LRM.
      Reason: Applies Class 1 discoveries to open task cards and re-runs `todo replan` right before the next wave. Round 3 & 7.
  - [settled] learning.loop-mechanism.course-correction-gate -- Severity split: auto-task local bugs, escalate design breaks.
      Reason: Local defects become `todo` tasks automatically; design breaks pause dependent batches and ask the Copilot/Human. Round 3.
  - [settled] learning.loop-mechanism.signal-producer -- Proportional Telemetry + Wave-Boundary Pattern Mining.
      Reason: Trivial batches emit zero-LLM deterministic telemetry and optional 1-line Builder notes into `trajectories.jsonl`, while wave boundaries mine accumulated JSONL traces. Round 5.
  - [settled] learning.loop-mechanism.intent-governor -- Two-stage Governor: Ingress Admission Filter (logs non-urgent findings as Observations) + Wave Pruner (Observation Heat boosts WSJF, promotes recurring clusters >=2 when Convergence Ratio permits).
      Reason: Captures every insight without backlog bloat; emerging trends raise existing task priority or promote at wave boundaries. Round 5 & 6. ADR: adr/ADR-007-two-stage-intent-governor.md
  - [settled] waf.rl-cold-start-safety -- Deterministic rules first; cross-session ledger (`N >= 20` before bandit updates); warn-only canary gate for synthesized rules.
      Reason: Prevents overfitting on small single-session sample sizes and blocks brittle auto-generated rules from breaking builds. Round 7. ADR: adr/ADR-006-three-stream-learning-loop.md
- [settled] waf.falsifiable-hypotheses -- Gate architecture on 4 falsifiable hypotheses (H1–H4) with numeric kill criteria tested via tracer spikes.
    Reason: Ensures every mechanism proves its token, latency, quality, and convergence value before full build-out. Round 7.

## v1.1 revision (2026-11-01) — rounds/v1.1/

- [settled] horizon.stance.v1.1 -- Long horizon (overrides recommended mid-execution).
    Reason: Round v1.1-01. The H1–H4 amendments are evidence, not authority; any node may reopen.
- [open] ledger.confirm -- Re-test some nodes before confirming the ledger.
    Reason: Round v1.1-01. Which nodes and how: round v1.1-02.
- [settled] ledger.invalidated-text -- Remove killed/moot mechanisms from the spec body; history stays in ADR amendments.
- [settled] ledger.untested -- Untested nodes stay "accepted, unbuilt", each with a build trigger.
- [settled] ledger.retry-escalation -- Keep 2 retries then OHECI; build it with the runner.
- [settled] ledger.backlog-gap -- Add closure timestamps to the todo store in v1.1 scope.
- [settled] ledger.version -- 1.1.0, status Revising.
- [settled] ledger.confirm -- Ledger stands; v1.1 ships with re-test nodes marked "pending evidence".
    Reason: Round v1.1-02.
  - [settled] retest.which -- Re-test H2 variant C on Sonnet (after quota) and H4 with high-finding tasks (>= 5 waves).
  - [settled] retest.h1-reopen -- No H1 re-test; ADR-003 re-open trigger (setup > 50% of a run) stands.
  - [settled] horizon.reopen-scope -- Reopen only nodes the evidence touched; control.topology stays.
  - [settled] retest.gate -- v1.1 does not wait for re-tests.
- [open] intent.north-star -- /goal: goal contract with executable done-check. Round v1.1-03.
