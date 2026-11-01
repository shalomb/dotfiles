# GRILL ROUND 1 -- topic: agentic-coding v1.1 — commitment ledger
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [horizon.stance] -- Which stance applies to this revision?

CONTEXT:
  The H1-H4 amendments are measured evidence.
  Mid-execution makes the amendments and current code the authority.
  Long horizon lets us reopen the whole design.

OPTIONS:
  [ ] A. Mid-execution  (RECOMMENDED)
         Fast; keeps evidence fixed; does not reopen the topology
  [x] B. Long horizon
         Can reopen all nodes; slow; ignores sunk evidence cost

## Q2 [ledger.confirm] -- Is the commitment ledger correct?

CONTEXT:
  Stands: control.topology, merge-authority, backlog-store,
  context.hygiene, worktree-concurrency (widened to test files).
  Amended: batch-planner (wave scheduler), pointer-contract
  (verify-receipt), admission filter (verify before fold).
  Inverted: subagent-pipeline (critic by default; deterministic-only is
  earned at holdout >= 0.85).
  Invalidated: work.batching. Moot: partial-batch-salvage.

OPTIONS:
  [ ] A. Correct as stated  (RECOMMENDED)
         Lets v1.1 proceed now
  [ ] B. Correct with changes
         Put changes as >> notes on this line
  [x] C. Re-test some nodes first
         More evidence; delays v1.1

## Q3 [ledger.invalidated-text] -- What do we do with the text for invalidated and moot mechanisms?

CONTEXT:
  Work Batch (2-5 tasks), Prefix Salvage and batch cards are in §5, the
  C4 diagram, YAML, glossary and 3 scenarios.
  An implementer who reads §5 now builds the killed design.

OPTIONS:
  [x] A. Remove; keep history in ADRs  (RECOMMENDED)
         Spec body is clean; the ADR amendments keep the reason
  [ ] B. Keep, mark as superseded
         Full history in place; spec is noisy and easy to misread
  [ ] C. Move to an appendix
         Clean body; extra file to maintain

## Q4 [ledger.untested] -- What do we do with the untested nodes?

CONTEXT:
  Untested: retry-escalation (2 retries then OHECI), checkpoint-trigger
  (60%), context-drift-guard (codemap diff), three-stream learning, rule
  synthesizer, rl-cold-start-safety, governor pruning and Observation
  Heat.
  H2 peak context was 7%, so the 60% trigger can rarely fire.

OPTIONS:
  [x] A. Keep as 'accepted, unbuilt'  (RECOMMENDED)
         Each gets a trigger to build; no code before evidence
  [ ] B. Retire all untested nodes
         Smallest spec; loses settled design work
  [ ] C. Decide node by node
         Most precise; put a >> note per node

DIAGRAM:
  untested node --(build trigger met?)--> spike --> build
              \--(no)--> stays 'accepted, unbuilt'

## Q5 [ledger.retry-escalation] -- Is the 2-retry then OHECI rule kept for single-task runs?

CONTEXT:
  It is the stop-the-line rule (Jidoka).
  No spike tested it. It does not depend on batching.

OPTIONS:
  [x] A. Keep, build with runner  (RECOMMENDED)
         Cheap to build; prevents loops; still untested
  [ ] B. Keep unbuilt until a spike
         Strict evidence rule; runner has no stop rule

## Q6 [ledger.backlog-gap] -- Do we add closure timestamps to the todo store now?

CONTEXT:
  H4 found todo has no closure timestamps.
  Without them, the Convergence Ratio and H5 cannot be computed from
  real backlogs.

OPTIONS:
  [x] A. Yes, in v1.1 scope  (RECOMMENDED)
         Small todo change; enables H4 re-test and H5
  [ ] B. No, use trajectories.jsonl only
         No todo change; ledger and backlog can drift

## Q7 [ledger.version] -- How do we version the revised spec?

CONTEXT:
  The front matter says Approved 1.0.0 with no open decisions.
  v1.1 adds intent.north-star as an open node.

OPTIONS:
  [x] A. 1.1.0, status Revising  (RECOMMENDED)
         Honest status; open node is visible
  [ ] B. 2.0.0
         Signals breaking change (batching killed); larger jump

## TERMS

  Commitment Ledger: The status of each decision-tree node after
  falsification: stands, amended, inverted, invalidated, moot or
  untested.
  Accepted, unbuilt: A settled node that has no build until its build
  trigger is met.
    Avoid: deferred, backlog
  Wave Scheduler: The deterministic todo batch step that selects at most
  3 disjoint single tasks per wave.
    Avoid: Batch Planner
  Done-check: An executable command that proves the goal is met; set
  before work starts.
