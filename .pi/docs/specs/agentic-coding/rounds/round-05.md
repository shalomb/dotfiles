# GRILL ROUND 5 -- topic: agentic-coding-system
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [learning.loop-mechanism.intent-governor] -- Must the Intent Governor enforce an Ingress Admission Filter before creating backlog tasks?

CONTEXT:
  In Round 4 you asked if the Intent Governor should filter feedback
  BEFORE it enters the backlog, not only prune inventory after it grows.
  An Ingress Admission Filter can evaluate every candidate discovery
  against three criteria: (1) North Star / active batch blocker, (2)
  defect severity, and (3) minimum WSJF score.
  Items below the admission threshold never become `todo` cards:
  micro-fixes (<15 lines in touched files) are folded into the current
  or next batch, and low-value observations stay in `trajectories.jsonl`
  until they recur.

>> Just wondering, some feedback generated when considered from the
>> perspective of a governor could be considered "observations" rather than
>> intent that we must act on necessarily right?
>> It's almost like catching these observations and logging them is a form of
>> "learning" that we can use to improve the system over time, even if we
>> don't act on them immediately. So, having an Ingress Admission Filter seems
>> like a good way to manage the backlog and focus on high-priority tasks
>> while still capturing valuable insights.@7
>> We go on to recalculate the WSJF score for the backlog items at regular
>> points I suppose? I suppose that recalculation might consider if there are
>> trends emerging even in the observations that might make them more
>> important than they were when they were first logged. So, the system could
>> be adaptive in that sense.@7

OPTIONS:
  [x] A. Two-stage Governor: Ingress Filter + Wave Pruner  (RECOMMENDED)
         Blocks trivial/one-off findings at the door (fold or log-only)
         AND prunes the backlog via Convergence Ratio.
  [ ] B. Post-hoc Wave Pruner only (admit all, prune later)
         Simpler ingress, but still churns the `todo` backlog with
         short-lived tasks inside a wave.
  [ ] C. Admit only human-authored tasks to `todo`
         Zero autonomous backlog growth, but drops valid Class 2 bug
         discoveries unless human intervenes.

DIAGRAM:
  Candidate Feedback Item
    |
    +--> [Micro-fix in touched file?] -> Fold into Batch (0 cards)
    +--> [Blocks North Star or P0/P1?] -> Admit to `todo` backlog
    +--> [Speculative / P2-P3 / 1-off] -> Log to JSONL only
                                           (Promote if seen >= 2x)

## Q2 [learning.loop-mechanism.signal-producer] -- How must review depth and learning capture scale with batch complexity?

CONTEXT:
  In Round 4 you noted that a trivial Work Batch only needs a trivial
  review, yet mining across batches could still uncover valuable
  patterns.
  We can separate per-batch reflection cost from cross-batch pattern
  mining.
  Trivial batches emit only zero-cost deterministic telemetry (commit
  SHAs, files touched, test duration, retries) plus optional 1-line
  Builder flags; deep Trajectory mining runs once at the wave boundary
  over the accumulated `trajectories.jsonl`.

OPTIONS:
  [x] A. Proportional Telemetry + Wave-Boundary Pattern Mining  (RECOMMENDED)
         Trivial batches pay zero LLM critique overhead; the LRM planner
         mines accumulated JSONL traces per wave.
>> I think I agree - let's see if this squares with the comment I made above
>> about the Ingress Admission Filter and still logging observations that
>> don't make it into the backlog.
  [ ] B. Full 3-stream LLM reflection on every single batch
         Uniform schema, but wastes tokens and time critiquing trivial
         batches.
  [ ] C. Skip all telemetry and logging on trivial batches
         Zero cost, but loses the raw trace needed to spot recurring
         small friction across a wave.

DIAGRAM:
  Tier 0 (Trivial Batch: docs, config, simple S-tasks):
    --> Deterministic Telemetry only (0 LLM tokens) + append JSONL

  Tier 1 (Standard Batch):
    --> Deterministic Gate + Builder 3-line note + append JSONL

  Tier 2 (High-Risk Batch OR Wave Boundary):
    --> Adversarial Critic + Wave Miner scans JSONL for patterns

## TERMS

  Ingress Admission Filter: The pre-backlog gate in the Intent Governor
  that folds micro-fixes into active batches and diverts one-off P2/P3
  observations to `trajectories.jsonl` unless they block the North Star
  or recur across waves.
    Avoid: ticket creation, raw intake
  Proportional Telemetry: The rule that scales batch review from
  zero-LLM deterministic telemetry on trivial batches up to full
  Adversarial Critic review and wave-level JSONL pattern mining on
  high-risk batches and wave boundaries.
    Avoid: per-batch essay
