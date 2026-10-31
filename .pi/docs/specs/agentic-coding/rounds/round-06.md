# GRILL ROUND 6 -- topic: agentic-coding-system
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [learning.loop-mechanism.intent-governor] -- How must logged Observations influence WSJF recalculation and task promotion across waves?

CONTEXT:
  In Round 5 you asked if non-urgent feedback can be logged as
  Observations rather than immediate intent, and then influence regular
  WSJF recalculation when trends emerge.
  Every Observation in `trajectories.jsonl` carries a `file:symbol` or
  module anchor.
  When `todo replan` runs at the wave boundary, it counts recurring
  Observations per anchor and adds an Observation Heat bonus to the Cost
  of Delay (WSJF) of open tasks touching that anchor, or promotes an
  unassigned cluster (>=2 hits) into a new task if the Convergence Ratio
  permits.

OPTIONS:
  [x] A. Observation Heat boosts WSJF + trend promotion at LRM  (RECOMMENDED)
         Captures every insight without backlog bloat; emerging trends
         automatically raise task priority or promote at wave
         boundaries.
  [ ] B. Observations only promote to new tasks (never change WSJF)
         Simpler WSJF formula, but misses the chance to prioritize
         existing open tasks that touch high-friction modules.
  [ ] C. Observations only feed Class 3 rules (`AGENTS.md` / lints)
         Keeps backlog untouched by Observations, but loses adaptive
         prioritization of product/tech-debt tasks.

DIAGRAM:
  Batch emits non-urgent finding
         |
         v
  Ingress Filter -> logs Observation {anchor: "src/auth.ts"}
                    into `trajectories.jsonl` (0 new cards now)
         |
         v
  Wave Boundary: `todo replan` + Wave Miner
    |-- Matches open Task T4?      --> Boost T4 WSJF (+Observation Heat)
    |                                  & attach pointer to T4 card
    +-- No open task & count >= 2? --> Promote to new `todo` task
                                       (if Convergence Ratio allows)

## TERMS

  Observation: A non-blocking finding filtered out at ingress and
  recorded in `trajectories.jsonl` with a module/file anchor so it does
  not clutter the backlog unless a trend emerges.
    Avoid: dropped note, low-priority ticket
  Observation Heat: The Cost-of-Delay bonus added during `todo replan`
  to any open task whose module/file anchors match recurring
  Observations in `trajectories.jsonl`.
    Avoid: priority bump
