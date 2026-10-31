# GRILL ROUND 7 -- topic: agentic-coding-system
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [waf.cost-overhead-cap] -- How must we cap orchestration LLM overhead so batching saves tokens and time?

CONTEXT:
  Hole 1 (Cost & Latency): Our current tree has a Batch Planner (Lisa),
  Builder (Ralph), Tiered Critic (Bart), Wave Miner, Rule Synthesizer,
  and Memory Groomer.
  If each of those is an LLM pass, orchestration overhead will exceed
  the tokens saved by batching 2-5 tasks.
  We can collapse the control path so 90% of wave mechanics are
  deterministic CLI operations (`todo replan`, `git`, test runner) and
  at most 1 LLM pass per batch (Builder) runs in the common case.

>> So yea, this system is not anchored to existing implementations (I would
>> prefer if we can re-use tho), where we must we must go against the grain of
>> the current LLM orchestration-heavy design.

OPTIONS:
  [x] A. Deterministic batching; 1 LLM pass per batch default  (RECOMMENDED)
         `todo` CLI computes batches and Observation Heat
         deterministically; LLM Planner runs only on ambiguity or
         wave-end pivot.
  [ ] B. Run LLM Batch Planner and Wave Miner on every wave
         Richer semantic grouping, but adds 2 extra LLM cold-starts to
         every wave even when tasks are clear.
  [ ] C. Keep all 5 persona LLM passes per wave
         Highest ceremony, but orchestration tokens can exceed 40% of
         total spend.

DIAGRAM:
  Bloated Path (Too Expensive):
    Planner LLM -> Builder LLM -> Critic LLM -> Miner LLM -> Groomer

  Lean Path (1 LLM per batch in common case):
    `todo batch` (deterministic codemap + WSJF graph)
         |
         +--> Builder LLM (executes 2-5 tasks + emits JSONL signal)
         +--> Deterministic Gate (rebase + test + risk check)
         +--> (High-risk only) Critic LLM OR Wave-end Planner LLM

## Q2 [waf.worktree-concurrency] -- Which guardrail must prevent parallel Transient Worktrees from causing rebase thrash?

CONTEXT:
  Hole 2 (Worktree & Merge Serial Bottleneck): Creating 3 Transient
  Worktrees means 3 language-server cold starts, dependency links, and
  test runs.
  Also, when Batch 1 fast-forwards the Feature Worktree, Batch 2 and
  Batch 3 are immediately behind HEAD and must rebase + re-test
  serially.
  If the Batch Planner makes a mistake and two parallel batches touch
  coupled code, rebase conflicts erase all parallelism gains.

OPTIONS:
  [x] A. Max 3 worktrees + disjoint codemap lock + shared cache  (RECOMMENDED)
         Prevents rebase thrash and cold-start dependency installs;
         serializes batches that share module fan-out.
  [ ] B. Unlimited parallel worktrees; resolve conflicts at merge
         High theoretical parallelism, but N-way rebase storms and test
         reruns dominate runtime.
  [ ] C. Single sequential worktree only (concurrency = 1)
         Zero merge conflicts between batches, but gives up parallel
         wave throughput.

DIAGRAM:
  Feature Worktree (HEAD)
    |-- Batch A (touches src/auth/*) --fast-forward--> HEAD'
    +-- Batch B (touches src/cli/*)  --rebase on HEAD'--> HEAD''

  Guardrail: Disjoint File-Tree Lock + Shared Build Cache
    - Max 2-3 concurrent Transient Worktrees
    - Hard reject parallel batches with overlapping codemap fan-out
    - Share `.venv` / `node_modules` / build cache across worktrees

## Q3 [waf.partial-batch-salvage] -- What must happen when task K of a Work Batch blocks after tasks 1..K-1 succeeded?

CONTEXT:
  Hole 3 (Mid-Batch Partial Failure): Suppose a Work Batch has 4 tasks
  (T1, T2, T3, T4). T1 and T2 pass and produce clean ACP commits, but T3
  hits an assumption break and blocks.
  If the whole Work Batch is rejected as an all-or-nothing unit, T1 and
  T2 are stranded or wasted.
  Because every completed task inside the batch is already an atomic ACP
  commit, the gate can salvage prefix commits that pass tests.

OPTIONS:
  [x] A. Salvage green ACP commit prefix; release tail tasks  (RECOMMENDED)
         Merges completed T1..Tk commits immediately and returns only
         the blocked task to the backlog.
  [ ] B. All-or-nothing rollback of the entire Work Batch
         Simpler state transition, but throws away valid, tested ACP
         commits when a later task blocks.
  [ ] C. Leave broken worktree open for human manual surgery
         No lost work, but stalls worktree slots and pulls human into
         low-level git recovery.

DIAGRAM:
  Worktree: [Commit T1 (PASS)] -> [Commit T2 (PASS)] -> [T3 BLOCKED]
                                          |
                                          v
  Prefix Salvage:
    1. Fast-forward Feature Worktree to Commit T2 (`todo done` T1, T2)
    2. Release T3 & T4 back to `todo` with Class 2 blocker signal

## Q4 [waf.rl-cold-start-safety] -- How must we prevent the learning loop from overfitting on small sample sizes?

CONTEXT:
  Hole 4 (Cold-Start Sample Starvation in RL): A typical feature session
  runs only 5 to 15 Work Batches. A Contextual Bandit needs dozens of
  trials before its weights mean anything.
  If we pretend a bandit learns within one session, it is just random
  noise. Also, an automated Rule Synthesizer can write brittle rules
  from 2 coincidental failures.
  We need deterministic heuristics first, cross-session priors in
  `~/.cache`, and a canary/human gate on synthesized rules.

OPTIONS:
  [x] A. Deterministic rules first; cross-session ledger; gated rules  (RECOMMENDED)
         Uses static tier routing until N>=20 cross-session trajectories
         exist; new rules start in warn-only canary mode.
  [ ] B. Live per-session bandit updates and immediate hard rules
         Adapts fast, but overfits to 1-2 noisy batches and can lock the
         repo with a bad auto-rule.
  [ ] C. Drop automated routing and rule synthesis; human only
         Zero risk of bad auto-rules, but gives up autonomous Class 3
         harness improvement.

## Q5 [waf.context-drift-guard] -- How must the Main Copilot detect structural drift without reading every batch diff?

CONTEXT:
  Hole 5 (Blind-Spot Risk of Pointer-Only Receipts + Auto-Checkpoints):
  If the Main Copilot only sees <=25-line Batch Receipts and resets at
  60% context, it never sees the actual code shape unless it follows a
  pointer.
  Across 3 waves, subtle architectural drift can accumulate even while
  unit tests pass. Also, an automatic context reset can wipe subtle
  human intent nuances.
  We can require a deterministic `codemap diff` (structural delta) at
  each wave boundary before the checkpoint is approved.

OPTIONS:
  [x] A. Wave-boundary `codemap diff` + human ack on checkpoint  (RECOMMENDED)
         Main Copilot reviews a compact structural graph delta once per
         wave and confirms checkpoint before reset.
  [ ] B. Trust Batch Receipts completely until final PR review
         Minimum tokens during waves, but structural drift is discovered
         late when it is expensive to fix.
  [ ] C. Main Copilot reads `git diff --stat` and summaries per batch
         Catches drift early, but steadily erodes the 25-line receipt
         token budget.

## Q6 [waf.falsifiable-hypotheses] -- Must we bind each architectural pillar to a falsifiable hypothesis and kill threshold?

CONTEXT:
  Hole 6 (Falsifiable Hypotheses & Kill Criteria): If we do not state
  falsifiable hypotheses with measurable kill thresholds upfront, we
  risk building an over-engineered framework that is slower than a
  single agent.
  Every major architectural bet (Work Batching, Pointer Receipts, Tiered
  Critic, Intent Governor) must have a pass/fail metric tested via a
  small tracer spike first.
  If a bet fails its metric, we drop or simplify that component before
  building the full system.

OPTIONS:
  [x] A. Gate design on 4 falsifiable hypotheses + kill criteria  (RECOMMENDED)
         Defines explicit numeric thresholds (H1-H4); any mechanism that
         fails its spike benchmark is cut.
  [ ] B. Build the full architecture first, then benchmark end-to-end
         Delivers all features together, but sunk cost hides which
         mechanism actually adds value vs. weight.

DIAGRAM:
  H1 (Batching):   3-task batch < 65% tokens & time of 3 single runs
  H2 (Receipts):   Main Copilot stays < 50% context across 10 batches
  H3 (Tiered Gate): Deterministic gate catches >= 85% issues sans Bart
  H4 (Governor):   Backlog converges to 0 without dropping P0/P1 intent
    --> If any H_i fails in Tracer Spike -> Kill / simplify it!

## TERMS

  Prefix Salvage: The recovery rule where valid, tested ACP commits
  (1..K-1) from a partially completed Work Batch are fast-forwarded into
  the Feature Worktree while only the blocked tail tasks (K..N) return
  to the backlog.
    Avoid: all-or-nothing rollback
  Disjoint Codemap Lock: The pre-dispatch check using `codemap`
  fan-in/fan-out that prevents two concurrent Work Batches in the same
  wave from modifying overlapping files or tightly coupled modules.
    Avoid: file lock
  Falsifiable Hypothesis: A quantitative prediction paired with a
  disconfirmation threshold (kill criterion) that a design mechanism
  must pass in a tracer spike before full implementation.
    Avoid: subjective goal
