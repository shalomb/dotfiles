# GRILL ROUND 8 -- topic: agentic-coding-system
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## REVIEW

  DECISION TREE (ALL NODES SETTLED)
  ====================================================================
  - [settled] horizon.stance -- Long horizon (zero-based; reuse where earned)
  - [settled] artefact.home -- ~/.pi/docs/specs/agentic-coding/
  - [settled] control.topology -- Interactive Copilot + deterministic runner
    - [settled] control.topology.batch-planner -- Deterministic `todo batch` default; LRM Planner LLM on ambiguity/pivot
    - [settled] control.topology.merge-authority -- Unified Critic Gate (rebase onto Feature Worktree, verify, fast-forward)
    - [settled] control.topology.subagent-pipeline -- Risk-tiered: Builder + Deterministic Gate; Adversarial Critic on risk
  - [settled] state.backlog-store -- Single out-of-repo `todo` store
    - [settled] state.backlog-store.batch-schema -- `batches/<id>.md` cards + `trajectories.jsonl` ledger
  - [settled] work.batching -- Cohesive Wave Batch (2-5 tasks, 1 ACP commit/task)
    - [settled] work.batching.retry-escalation -- Max 2 local retries, then OHECI escalate
    - [settled] waf.worktree-concurrency -- Max 3 Transient Worktrees + Disjoint Codemap Lock + shared cache
    - [settled] waf.partial-batch-salvage -- Prefix Salvage of green ACP commits (1..K-1); release blocked tail
  - [settled] context.hygiene -- Offload + Checkpoint + Compact Receipt
    - [settled] context.hygiene.pointer-contract -- Strict <=25-line Batch Receipt with URI/SHA/line Context Pointers
    - [settled] context.hygiene.checkpoint-trigger -- Wave auto-checkpoint + 60% budget gate
    - [settled] waf.context-drift-guard -- Wave `codemap diff` + human ack before context reset
  - [settled] learning.loop-mechanism -- Two-tier Verbal RL + Policy/Rule Grooming
    - [settled] learning.loop-mechanism.policy-target -- 3 streams: Forward Refinement + Course Correction + Rules
    - [settled] learning.loop-mechanism.backlog-refinement -- Deterministic anchor propagation + LRM card updates
    - [settled] learning.loop-mechanism.course-correction-gate -- Auto-task local bugs; escalate design breaks to Copilot/Human
    - [settled] learning.loop-mechanism.signal-producer -- Proportional Telemetry + wave-boundary JSONL mining
    - [settled] learning.loop-mechanism.intent-governor -- Ingress Admission Filter (Observations) + Observation Heat WSJF + Convergence Pruner
    - [settled] waf.rl-cold-start-safety -- Static routing until N>=20 trajectories; warn-only canary rules
  - [settled] waf.falsifiable-hypotheses -- Gate build-out on 4 falsifiable hypotheses (H1-H4) with kill criteria

  DRAFT HANDOFF SPEC OUTLINE
  ====================================================================
  1. System Topology (C4): Human <-> Main Copilot <-> `todo` + Deterministic Runner -> Transient Worktrees (Builder + Tiered Critic Gate) -> Feature Worktree.
  2. Spec Unit 1: Deterministic Wave Batching & Disjoint Codemap Lock (`todo batch`).
  3. Spec Unit 2: Work Batch Execution, Prefix Salvage & Tiered Critic Gate.
  4. Spec Unit 3: Pointer-Rich Batch Receipts (`<=25` lines) & Wave Checkpoints (`codemap diff`).
  5. Spec Unit 4: Three-Stream Learning Loop & Two-Stage Intent Governor (Observations, Observation Heat WSJF, Convergence Ratio).
  6. Falsifiable Hypotheses & Kill Criteria (H1 Batching, H2 Receipt Hygiene, H3 Tiered Gate, H4 Governor Convergence).
  7. Anti-Goals: No LLM pane-polling; no per-batch multi-persona LLM chains on trivial work; no repo-polluting DB files; no un-gated auto-rules.
  8. Tracer-Bullet Tickets: 4 falsification spikes followed by core implementation slices.

  ARTEFACT PACKAGE LOCATIONS (~/.pi/docs/specs/agentic-coding/)
  ====================================================================
  - handoff-spec.md                                  (Handoff specification + C4 + contracts + tracer tickets)
  - decision-tree.md                                 (Full settled decision tree)
  - GLOSSARY.md                                      (19 settled domain terms)
  - adr/ADR-001-copilot-deterministic-topology.md    (Copilot + runner + single `todo` store)
  - adr/ADR-002-context-hygiene-and-receipts.md      (Pointer receipts + wave checkpoints)
  - adr/ADR-003-three-stream-learning-and-intent-governor.md (3-stream learning + Observations + WSJF Heat)
  - adr/ADR-004-risk-tiered-critic-gate.md           (Risk-tiered verification gate)
  - adr/ADR-005-well-architected-guardrails-and-hypotheses.md (Cost cap, concurrency, prefix salvage, H1-H4)
  - features/batch-execution-and-merge.feature       (BDD scenarios for batching & tiered gate)
  - features/learning-and-intent-governor.feature    (BDD scenarios for learning & governor)
  - features/waf-guardrails-and-recovery.feature     (BDD scenarios for disjoint lock, salvage, canary)
  - rounds/round-01.md .. round-08.md                (Recorded round replies)
