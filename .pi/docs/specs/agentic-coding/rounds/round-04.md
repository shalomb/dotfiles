# GRILL ROUND 4 -- topic: agentic-coding-system
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [learning.loop-mechanism.intent-governor] -- How must the Intent Governor prevent runaway backlog growth across waves?

CONTEXT:
  In Round 3 you asked how to stop feedback loops from generating more
  backlog tasks than completed outcomes.
  We can track the Convergence Ratio: (tasks added in wave) / (tasks
  completed in wave), alongside a hard WIP cap.
  When the ratio exceeds 1.0 or inventory crosses the cap, the Batch
  Planner increases pruning aggression: it folds minor items into
  existing Work Batches as acceptance criteria and drops low-WSJF leaf
  tasks not tied to the North Star.

>> So a thought - the governor helps manage intent already generated?
>> Does it make sense to have a mode where feedback consideration also has
>> criteria for which items meet the threshold for being folded back into
>> intent?

OPTIONS:
  [x] A. Dynamic Convergence Governor (fold + WSJF prune)  (RECOMMENDED)
         Tunes pruning aggression automatically from the Added/Completed
         ratio so backlog inventory converges.
  [ ] B. Strict 1-in-1-out hard cap on backlog size
         Simple rule, but forces dropping valid tasks even during early
         discovery waves.
  [ ] C. Human approves every new task added by subagents
         Prevents runaway growth, but interrupts the human after every
         batch for minor follow-ups.

DIAGRAM:
  Wave N ends: delta = (Tasks Added) / (Tasks Completed)
    |
    +-- delta < 0.5 (Converging) --> Normal: allow Class 2 tasks
    +-- 0.5 <= delta <= 1.0      --> Fold minor bugs into batches
    +-- delta > 1.0 (Diverging)  --> Aggressive Prune:
          1. Block standalone P2/P3 tasks (must fold or drop)
          2. Merge tasks that share module anchors
          3. Prune low-WSJF tasks with no North Star link

## Q2 [control.topology.subagent-pipeline] -- When must a Work Batch spawn a separate Adversarial Critic subagent?

CONTEXT:
  In Round 3 you noted that spawning a second subagent for adversarial
  review repopulates context, adds latency before learning returns, and
  can introduce divergent reviewer assumptions.
  Every batch can run a fast, zero-LLM deterministic gate first (rebase
  onto Feature Worktree, test suite, linter, ACP check, diff-size/hub
  check).
  An independent Adversarial Critic subagent only needs to spawn when
  the batch is high-risk (touches hub files, security/public API, or ADR
  hypotheses) or at wave boundaries; low-risk batches complete with
  Builder self-review plus the deterministic gate.

OPTIONS:
  [x] A. Risk-tiered: Builder + deterministic gate; Critic on risk  (RECOMMENDED)
         Fast turnaround and zero duplicate context on routine batches;
         full adversarial review on risky/hub changes.
  [ ] B. Always spawn separate Critic subagent on every batch
         Maximum adversarial independence, but doubles cold-start tokens
         and slows learning turnaround.
  [ ] C. Never spawn separate Critic (Builder self-review only)
         Fastest execution, but loses independent adversarial review
         even on complex architectural changes.

DIAGRAM:
  Builder finishes ACP commits + self-review in Worktree
         |
         v
  Deterministic Gate (rebase + tests + lint + ACP + risk)
    |
    +-- Low risk & Green  --> Fast-forward + emit Receipt
    |                         (Zero 2nd-agent cold-start/latency)
    +-- High risk / Wave end / Gate warning
                          --> Spawn Adversarial Critic (Bart)

## Q3 [learning.loop-mechanism.signal-producer] -- Who produces the Trajectory Signal when no separate Critic subagent runs?

CONTEXT:
  If the Independent Critic runs only on high-risk batches, routine
  batches still need to emit the Batch Receipt and Trajectory Signal
  (Class 1/2/3 learnings).
  The Builder already holds full warm context of what was harder than
  expected, which files had tech debt, and which assumptions broke.
  A deterministic post-hook can compute objective metrics (test pass,
  diff stats, ACP check) and merge them with the Builder's structured
  Trajectory Signal.

>> I suppose if we ask the question if every batch warrants this measurement
>> and so critique, etc leading to learning, etc.
>> In other words - A batch doing rather trivial work only needs a trivial review right? Or maybe there are minings from these batches too that would be valuable?

OPTIONS:
  [x] A. Builder emits signal + deterministic metric scorer  (RECOMMENDED)
         Captures warm implementation learnings every batch with zero
         extra agent spawn; Critic overrides when invoked.
  [ ] B. Only high-risk Critic batches emit Trajectory Signals
         Saves Builder tokens, but loses Class 1/2 learnings from
         routine batches.
  [ ] C. Spawn a tiny Haiku/Flash summarizer after every batch
         Cheaper than a full Critic, but still pays cold-start latency
         to re-read the diff.

## TERMS

  Intent Governor: The wave-boundary mechanism that measures the
  Convergence Ratio (tasks added divided by tasks completed) and
  dynamically increases consolidation and WSJF pruning aggression so
  intent converges to realized outcomes.
    Avoid: backlog cap, ticket freeze
  Convergence Ratio: The ratio of new tasks created to tasks completed
  in a wave; values above 1.0 trigger aggressive task folding and
  pruning.
    Avoid: burn rate, velocity
  Tiered Critic Gate: The adaptive verification policy where every Work
  Batch runs Builder self-review plus a deterministic rebase/test gate,
  and only high-risk or wave-boundary batches spawn a separate
  Adversarial Critic subagent.
    Avoid: always-on Bart, manual review
