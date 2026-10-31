# Domain Glossary: Agentic Coding System

**Main Copilot**:
The interactive `pi` agent that partners with the human to capture intent, steer design toward the North Star, and oversee feature delivery without polluting its context with raw execution logs.
_Avoid_: orchestrator daemon, master agent

**Work Batch**:
A cohesive set of 2 to 5 backlog tasks assigned to one subagent in one Transient Worktree, where each task produces one atomic commit under the Atomic Commit Protocol (ACP).
_Avoid_: epic, ticket list, chunk

**Batch Planner**:
The wave-boundary planning capability (deterministic `todo batch` by default, escalating to a focused LRM subagent only on ambiguity or design pivot) that groups ready `todo` tasks into cohesive Work Batches and enriches remaining backlog tasks.
_Avoid_: Lisa daemon, ticket slicer

**Feature Worktree**:
The git worktree where the Main Copilot holds the active feature branch and receives validated Work Batches.
_Avoid_: main repo, sandbox

**Transient Worktree**:
A short-lived git worktree branched from the Feature Worktree for a single Work Batch and deleted after consolidation.
_Avoid_: worker clone, temp branch

**Disjoint Codemap Lock**:
The pre-dispatch check using `codemap` fan-in/fan-out that prevents two concurrent Work Batches in the same wave from modifying overlapping files or tightly coupled modules.
_Avoid_: file lock

**Prefix Salvage**:
The recovery rule where valid, tested ACP commits ($1 \dots K-1$) from a partially completed Work Batch are fast-forwarded into the Feature Worktree while only the blocked tail tasks ($K \dots N$) return to the backlog.
_Avoid_: all-or-nothing rollback

**Critic Gate**:
The verification and integration gate that rebases a completed Work Batch onto the Feature Worktree, runs deterministic and adversarial checks, fast-forwards on pass, and emits the Batch Receipt and Trajectory Signal.
_Avoid_: passive reviewer, manual merge

**Tiered Critic Gate**:
The adaptive verification policy where every Work Batch runs Builder self-review plus a deterministic rebase/test gate, and only high-risk or wave-boundary batches spawn a separate Adversarial Critic subagent.
_Avoid_: always-on Bart, manual review

**Batch Receipt**:
A compact (<= 25 lines), structured summary returned by a subagent that uses Context Pointers (hyperlinks, commit SHAs, `file:line#symbol` anchors, task card links, and log paths) instead of inline prose or diffs.
_Avoid_: summary, log dump

**Context Pointer**:
A navigable reference (URI, commit SHA, `file:line#symbol` anchor, or `todo` card ID) inside a Batch Receipt that lets the Main Copilot or human inspect detailed evidence on demand without loading it by default.
_Avoid_: inline excerpt, raw dump

**Knowledge Checkpoint**:
A concise, on-disk snapshot of active design intent, architectural anchors, `codemap diff`, and backlog wave state written at wave boundaries or 60% context capacity so the Main Copilot can reset its context window with human acknowledgement without losing continuity.
_Avoid_: chat compaction, session dump

**Trajectory Signal**:
A structured record produced at the end of a Work Batch that captures three learning streams: (1) Forward Refinement for open tasks, (2) Course Correction for defects in standing code, and (3) Harness Policy Rewards (Farley/Adzic/ACP scores).
_Avoid_: reflection note, chat summary

**Forward Refinement**:
Class 1 learning where discoveries from a completed Work Batch enrich open `todo` task cards with concrete anchors and constraints to reduce uncertainty toward the North Star.
_Avoid_: backlog grooming, ticket edit

**Course Correction**:
Class 2 learning where a discovered defect in standing code or design assumptions generates new `todo` intent or triggers a Main Copilot design pivot.
_Avoid_: hotfix, ad-hoc patch

**Observation**:
A non-blocking finding (friction, minor smell, or latent risk) filtered out by the Ingress Admission Filter and recorded in `trajectories.jsonl` with file/module anchors; recurring Observations boost the Cost of Delay (WSJF) of related open tasks or promote into new backlog intent when a trend threshold is crossed.
_Avoid_: dropped note, low-priority ticket

**Observation Heat**:
The Cost-of-Delay bonus added during `todo replan` to any open task whose module/file anchors match recurring Observations in `trajectories.jsonl`.
_Avoid_: priority bump

**Intent Governor**:
The two-stage backpressure mechanism that (1) applies an Ingress Admission Filter to divert non-urgent findings into Observations in `trajectories.jsonl`, and (2) recalculates WSJF from Observation Heat and prunes/folds inventory at each wave boundary according to the Convergence Ratio.
_Avoid_: backlog archive, ticket freeze

**Convergence Ratio**:
The ratio of new tasks created to tasks completed in a wave; values above 1.0 trigger aggressive task folding and pruning.
_Avoid_: burn rate, velocity

**Ingress Admission Filter**:
The pre-backlog gate in the Intent Governor that folds micro-fixes into active batches and records one-off P2/P3 findings as Observations in `trajectories.jsonl` rather than creating immediate `todo` cards.
_Avoid_: ticket creation, raw intake

**Proportional Telemetry**:
The rule that scales batch review from zero-LLM deterministic telemetry on trivial batches up to full Adversarial Critic review and wave-level JSONL pattern mining on high-risk batches and wave boundaries.
_Avoid_: per-batch essay

**Rule Synthesizer**:
A learning pass that converts recurring Trajectory Signals and Observations into warn-only canary checks (`ast-grep` rules, tests) or semantic anchors while pruning stale memory.
_Avoid_: prompt append

**Falsifiable Hypothesis**:
A quantitative prediction paired with a disconfirmation threshold (kill criterion) that a design mechanism must pass in a tracer spike before full implementation.
_Avoid_: subjective goal
