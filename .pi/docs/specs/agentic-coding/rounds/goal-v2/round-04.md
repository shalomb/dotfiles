# GRILL ROUND 4 -- topic: /goal v2 — final review
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## REVIEW

  DECISION TREE (/goal v2)

  goal2.stance ............. mid-execution (reviewed TB-7 code is authority)
  goal2.narrow-check ....... human review + >=1 Outcome Check per command goal
    waf.outcome-check-enforce  human marks the Outcome Check at lock
  goal2.rubber-stamp ....... Weakening Change needs goal id typed; rest yes/no
  goal2.git-lock ........... keep goal.md lock (no red-commit lock)
  goal2.enforcement ........ best-effort guard + Tamper Check
    waf.tamper-store ....... hash commits on private ref refs/goals/<branch-slug>
                             (your idea; tamper-evident, not tamper-proof)
  goal2.base-env ........... classify base failure; refuse on env failure
    waf.base-classify ...... exit 126/127, command not found, Module/ImportError;
                             override by typing goal id
  goal2.when ............... opt-in; agent suggests when work > 1 task
  waf.measure .............. goal_locked/changed/closed/dropped -> trajectories.jsonl
  waf.friction-kill ........ review drop + assertion rates after 10 goals

  ARTEFACTS (written, committed on develop)
    ADR-009 Amendment 1  lock integrity rules (outcome check, typed weakening,
                         env failures, events, when-to-use)
    ADR-010              tamper evidence on private git ref
    goal-contract.feature +4 scenarios
    GLOSSARY +3 terms; decision-tree /goal v2 section; rounds/goal-v2/01..03

  BUILD (next lane, TB-7b, on top of vetted TB-7)
    1. outcome-check marking at lock     2. typed-id confirm for weakening + env override
    3. base failure classifier           4. refs/goals tamper hash + close gate
    5. trajectories events               6. suggest /goal when > 1 task (prompt line)
