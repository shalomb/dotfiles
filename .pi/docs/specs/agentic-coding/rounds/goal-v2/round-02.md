# GRILL ROUND 2 -- topic: /goal v2 — stress-test and falsifiability
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [waf.outcome-check-enforce] -- How is the Outcome Check rule enforced?

CONTEXT:
  Rule: each command goal needs at least one Outcome Check.
  A machine cannot tell a unit test from an outcome test with certainty.

OPTIONS:
  [x] A. Human marks it at lock  (RECOMMENDED)
         Lock prompt asks which command is the outcome check; cheap;
         still trust
  [ ] B. Heuristic only
         Warn when all commands look like unit suites; noisy
  [ ] C. Agent labels it
         No extra prompt; the agent grades its own check

## Q2 [waf.tamper-store] -- Where is the Tamper Check hash kept?

CONTEXT:
  The hash must live where the agent's write guard also blocks, or it
  gains nothing.
  The goal.md history already records each lock and change.

OPTIONS:
  [ ] A. pi session entry + history
         Agent tools cannot write session entries; lost if session ends
  [x] B. Separate store dir, guarded  (RECOMMENDED)
         Survives sessions; same best-effort guard
 >> Wild idea. Feel free to discount. Or a separate branch?
  [ ] C. Signed git note on base commit
         Tamper-evident via GPG; more moving parts

## Q3 [waf.base-classify] -- What does /goal lock do when a base failure looks environmental?

CONTEXT:
  Heuristic list: 'command not found', ModuleNotFoundError, ImportError,
  'No such file', exit 126/127.
  A real red test can also print 'No such file'.

OPTIONS:
  [x] A. Refuse, human can override  (RECOMMENDED)
         Safe default; override is one typed confirm
  [ ] B. Refuse, no override
         Strict; real failures with those words cannot lock
  [ ] C. Warn only
         No false refusals; environment failures can still lock

## Q4 [waf.measure] -- Do we log /goal events for H5?

CONTEXT:
  H5 needs counts to compare.
  Without these, we cannot tell if the new rules help or only add
  friction.

OPTIONS:
  [x] A. Log lock/change/close events  (RECOMMENDED)
         One JSONL line each to trajectories.jsonl; enables H5 and
         friction count
  [ ] B. No new logging
         Less work; H5 has to re-derive from history sections

## Q5 [waf.friction-kill] -- What shows that the extra friction is too much?

CONTEXT:
  If typed-id confirms are added, a human may stop using /goal.
  Signal: many goals dropped or closed by assertion.

OPTIONS:
  [ ] A. If > 50% dropped, revert to yes/no
         Clear rule; small samples are noisy
  [x] B. Review after 10 goals  (RECOMMENDED)
         Judgment-based; no fixed threshold
