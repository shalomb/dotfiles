# GRILL ROUND 5 -- topic: agentic-coding v1.1 — final review
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

  DECISION TREE (v1.1 revision)

  horizon.stance.v1.1 ............ long horizon (reopen only evidence-touched nodes)
  ledger
    confirm ...................... stands; ship v1.1 with "pending evidence" marks
      retest.which ............... H2-C on Sonnet (after quota); H4 high-finding, >=5 waves
      retest.h1-reopen ........... no; ADR-003 trigger (setup >50% of run) stands
      retest.gate ................ v1.1 does not wait
    invalidated-text ............. remove from spec body; history stays in ADR amendments
    untested ..................... "accepted, unbuilt" + build trigger each
    retry-escalation ............. keep 2 retries -> OHECI; build with runner
    backlog-gap .................. add closure timestamps to todo (v1.1 scope)
    version ...................... 1.1.0, status Revising
  intent.north-star (/goal)
    store/scope/fields/link ...... ADR-008: goals/<branch>.md in todo store; auto [goal:id]
    done-check ................... ADR-009: agent drafts, human locks, must fail on base,
                                   human-approved changes, green gates closure,
                                   human-confirm fallback = closed by assertion
    injection .................... 1-line pointer reminder per turn; /goal refreshes
    stale goal ................... warn at session start; human closes or drops
  waf
    H5 ........................... stop <=1 turn after green; <10% commits out of scope
    H5 kill ...................... downgrade /goal to notes file

  ARTEFACTS
    written: ADR-008, ADR-009, features/goal-contract.feature, GLOSSARY (+4 terms),
             decision-tree v1.1 section, rounds/v1.1/round-01..04
    to write after approval (handoff spec v1.1.0):
      - handoff-spec: status Revising 1.1.0; rewrite §2/§4 C4/§5 units to
        1 task/worktree, Wave Scheduler, critic-by-default, verify-receipt,
        verify-before-fold; remove Work Batch/Prefix Salvage text; add §5.5 Goal
        Contract; add H5 to §3; mark untested nodes "accepted, unbuilt";
        §7 tickets: TB-1..4 done, TB-5 = scheduler, new TB-7 = /goal, TB-8 = todo
        closure timestamps; re-tests listed as pending evidence
      - features: rewrite batch-execution-and-merge + waf scenarios for
        single-task worktrees; drop Prefix Salvage scenario
      - GLOSSARY: retire Work Batch / Batch Planner / Prefix Salvage entries

  BUILD ORDER AFTER SPEC (TDD, worktree)
    1. todo closure timestamps   2. /goal (_lib/goal.ts + goal-command.ts)
    3. H5 scorer in agentic-falsify
