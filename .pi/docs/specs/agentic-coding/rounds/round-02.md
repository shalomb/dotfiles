# GRILL ROUND 2 -- topic: agentic-coding-system
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [control.topology.batch-planner] -- Which component must analyze the backlog and form Work Batches?

CONTEXT:
  You noted in Round 1 that the Main Copilot does not need to form Work
  Batches itself.
  Batching requires code-graph inspection (shared files, module fan-out,
  and dependency waves) which costs tokens if run in the Main Copilot.
  `todo replan` already computes WSJF waves, and a focused Batch Planner
  subagent can inspect code coupling at the Last Responsible Moment
  (LRM).

OPTIONS:
  [x] A. Dedicated Batch Planner subagent at LRM  (RECOMMENDED)
         Keeps code-coupling analysis out of Main Copilot context. Adds
         one fast planning pass before a wave.
  [ ] B. Deterministic `todo` CLI graph + file tags
         Zero LLM tokens for batching, but requires tasks to carry
         file/module tags upfront.
  [ ] C. Main Copilot forms batches inline
         Immediate human feedback, but code inspection pollutes the Main
         Copilot context window.

DIAGRAM:
  Option A (Batch Planner Subagent + `todo`):
    Main Copilot --intent--> `todo` backlog
                                 |
    Batch Planner (subagent) <---+ (reads DAG + codemap)
         |
         +--> writes Work Batch --> Main Copilot dispatches

  Option B (Main Copilot inline):
    Main Copilot reads backlog + codemap in its own window.

## Q2 [control.topology.merge-authority] -- Which component must merge a Transient Worktree into the Feature Worktree?

CONTEXT:
  When subagents finish Work Batches in Transient Worktrees, their
  commits must land in the Feature Worktree.
  If the Main Copilot runs `git rebase`, resolves conflicts, and runs
  tests inline, tool output will pollute its context window.
  A deterministic merge gate can fast-forward clean branches and spawn a
  focused Integrator subagent only when a rebase conflict or test
  failure occurs.

OPTIONS:
  [x] A. Deterministic gate + Integrator subagent on conflict  (RECOMMENDED)
         Clean merges cost zero Main Copilot tokens. Conflicts go to an
         ephemeral Integrator subagent.
>> Is this a point at which the adversarial agent is supposed to be used?
>> I think the Integrator subagent is the one that would be adversarial, but
>> I want to confirm that.@7
  [ ] B. Main Copilot merges and resolves conflicts inline
         Main Copilot sees every conflict directly, but diffs and test
         runs pollute its context.
  [ ] C. Worker subagent rebases and pushes to Feature Worktree
         Distributed merge, but parallel workers contend on the Feature
         Worktree ref.

DIAGRAM:
  Transient Worktree (Batch Receipt: PASS)
         |
         v
  Deterministic Merge Gate (git rebase + fast test)
    |-- Clean & Green --> Fast-forward Feature Worktree
    +-- Conflict/Fail --> Spawn Integrator Subagent

## Q3 [control.topology.subagent-pipeline] -- How must execution and review work inside one Transient Worktree?

CONTEXT:
  Springfield used 5 separate personas (Marge, Lisa, Ralph, Bart,
  Lovejoy), which caused handoff latency when run sequentially for small
  work.
  Inside one Transient Worktree, a Builder (Ralph) must execute the Work
  Batch (one ACP commit per task) and a Critic (Bart) must verify
  quality and produce the Trajectory Signal.
  Keeping Builder and Critic as separate context passes in the same
  Transient Worktree prevents self-review bias.

OPTIONS:
  [x] A. Builder pass then Critic pass in same worktree  (RECOMMENDED)
         Fresh adversarial context catches blind spots and scores the
         batch before merge.
  [ ] B. Single subagent self-reviews via deterministic gates
         Half the subagent spawns, but suffers from LLM self-compliance
         bias on edge cases.
  [ ] C. Full 5-persona chain per Work Batch
         High ceremony and latency for a 2-5 task batch.

## Q4 [state.backlog-store.batch-schema] -- How must `todo` store Work Batches and Trajectory Signals?

CONTEXT:
  `todo` currently manages individual task cards in
  `~/.cache/agent-skills/todos/<repo_slug>/`.
  To support Work Batches and RL loops, the runner needs to track which
  tasks belong to a batch, the batch state, and the Trajectory Signal.
  We must keep `todo`'s zero-repo-pollution guarantee.

OPTIONS:
  [x] A. Batch cards (`batches/<id>.md`) + JSONL ledger in cache  (RECOMMENDED)
         Human-readable batch cards in `todo` plus an append-only
         `trajectories.jsonl` for RL scoring.
  [ ] B. Tags on `TODO.md` lines only (`[batch: b1]`)
         No new files, but nowhere clean to store multi-task constraints
         or Trajectory Signals.
  [ ] C. Embedded SQLite index alongside `todo` markdown
         Fast relational queries, but introduces binary state alongside
         markdown cards.

## Q5 [context.hygiene.pointer-contract] -- Which format must govern the Batch Receipt and its Context Pointers?

CONTEXT:
  You noted in Round 1 that Batch Receipts must use hyperlinks and
  contextual anchors so the Main Copilot never ingests raw logs by
  default.
  In `pi` and terminal workflows, pointers can use `file://` / OSC-8
  hyperlinks, git commit SHAs, `path:line#symbol` anchors, and `todo://`
  card IDs.
  The Main Copilot only dereferences a pointer when a batch blocks, an
  assumption breaks, or the human asks.

OPTIONS:
  [x] A. Strict <=25-line Receipt with URI/anchor pointers  (RECOMMENDED)
         Caps Main Copilot token intake per batch and makes every
         artifact clickable or inspectable on demand.
  [ ] B. Markdown prose summary with inline diff snippets
         Readable without following links, but inline diffs accumulate
         across 10+ batches.
  [ ] C. Status code only (zero summary in Main Copilot)
         Minimum tokens, but Main Copilot loses awareness of
         architectural shifts and assumption breaks.

DIAGRAM:
  Batch Receipt (<= 25 lines injected into Main Copilot):
    batch: batch-04  status: merged  reward: 0.92 (Farley 9.1)
    commits: [a1b2c3d](git:a1b2c3d) [e4f5g6h](git:e4f5g6h)
    tasks:   [t-12](todo:t-12) [t-14](todo:t-14)
    anchors: [src/runner.ts:42#dispatch](file:///.../runner.ts)
    logs:    [critic-report](file:///.../batch-04/critic.md)
    signal:  confirmed ADR-001; lesson -> [L-07](todo:L-07)

## Q6 [context.hygiene.checkpoint-trigger] -- When must the Main Copilot write a Knowledge Checkpoint and reset context?

CONTEXT:
  Even with compact Batch Receipts, human-copilot design discussions and
  occasional pointer inspections grow the Main Copilot context over
  hours.
  Lexler's Knowledge Checkpoint and Context Management patterns state
  that context only supports append or reset.
  When a checkpoint flushes active intent and anchors to disk, the Main
  Copilot can reset or compact back to a sharp, minimal seed.

OPTIONS:
  [x] A. Auto-checkpoint per wave + budget threshold gate  (RECOMMENDED)
         Flushes state after every wave and prompts for a clean context
         reset when token budget crosses 60%.
  [ ] B. Manual `/checkpoint` command by human only
         Full human control, but easy to forget until context
         degradation has already hurt quality.
  [ ] C. Hard reset after every single Work Batch
         Maximum freshness, but interrupts ongoing human design
         conversation mid-wave.

## Q7 [learning.loop-mechanism.policy-target] -- How must the RL loop turn Trajectory Signals into better execution?

CONTEXT:
  You want RL-style loops that improve how the system solves problems
  during the work, plus out-of-the-box options.
  Standard verbal RL (Reflexion) only appends "lessons learned" to
  prompts, which eventually bloats prompts (Obstacle: Context Rot).
  A real policy + evolutionary loop uses the Critic's reward score to:
  (1) update Thompson-sampling weights for model/batch-size selection,
  (2) distil repeated lessons into AST-grep rules or skill patches, and
  (3) run a Memory Groomer that prunes stale rules.

OPTIONS:
  [x] A. Bandit routing + Rule Synthesizer + Memory Groomer  (RECOMMENDED)
         Adapts batch size/model numerically AND compiles recurring
         prose lessons into deterministic checks or sharp anchors.
  [ ] B. Prompt-only Reflexion (append lessons to prompt)
         Simple to build, but prompt instructions accumulate and degrade
         attention over time.
  [ ] C. Offline fine-tuning dataset export only
         Zero runtime overhead, but does not improve the system during
         the current session.

DIAGRAM:
  Critic Reward R = w1*Tests + w2*Farley + w3*ACP - w4*Retries
         |
         +--> 1. Bandit: updates (Model x TaskType x BatchSize)
         +--> 2. Rule Synthesizer: 2+ hits -> lint/hook or anchor
         +--> 3. Memory Groomer: deduplicates & prunes AGENTS.md

>> So what is it we're improving here? There's probably content of two class
>> types, right? There's the intent and learning as we do the implementation,
  >> to take lessons learned and feed that back into tasks that are
  >> outstanding on the backlog (so that we reduce the uncertainty of its time
      >> and eventually converge or sharpen direction to it) and not star. But
  >> I guess there's also an understanding that perhaps the implementation
  >> that stands is defective too and warrants perhaps a decision being taken
  >> to course correct. That then translates into new intent I should imagine?

## TERMS

  Batch Planner: A focused subagent invoked at the Last Responsible
  Moment to group ready `todo` tasks into cohesive Work Batches with
  explicit constraints and hypotheses.
    Avoid: Lisa daemon, ticket slicer
  Integrator Gate: A deterministic merge step that fast-forwards clean
  Work Batch branches into the Feature Worktree and spawns a focused
  conflict-resolution subagent only when needed.
    Avoid: merge script, manual merge
  Context Pointer: A navigable URI, commit SHA, `file:line#symbol`
  anchor, or `todo` ID inside a Batch Receipt that replaces inline prose
  or raw logs.
    Avoid: pointer, link
  Knowledge Checkpoint: A concise, on-disk snapshot of active design
  intent, architectural anchors, and backlog wave state that allows the
  Main Copilot to reset its context window without losing continuity.
    Avoid: chat compaction, session dump
  Trajectory Signal: A numerical and categorical evaluation of a Work
  Batch (test pass, Farley/Adzic score, ACP compliance, retry count, and
  assumption verdict) appended to the trajectory ledger.
    Avoid: lesson log, retrospective prose
  Rule Synthesizer: A learning pass that converts recurring Trajectory
  Signals into deterministic checks (`ast-grep` rules, tests) or
  semantic anchors while pruning stale memory.
    Avoid: prompt append
