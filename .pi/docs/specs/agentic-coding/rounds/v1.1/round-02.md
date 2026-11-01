# GRILL ROUND 2 -- topic: agentic-coding v1.1 — re-test scope
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [retest.which] -- Which verdicts do we test again before we confirm the ledger?

CONTEXT:
  Each verdict has a known weak point.
  H1: small samples, 2 models. H2: Sonnet variant C void (quota). H3:
  one module only. H4: low finding rate (3 of 27 runs).

OPTIONS:
  [x] A. H2-C Sonnet + H4 high-finding  (RECOMMENDED)
         Both open in FINDINGS; cheap; Sonnet waits ~5 days for quota
  [ ] B. All four again
         Strongest base; costs a day of agent runs
  [ ] C. H4 only
         Governor is the biggest unknown; leaves H2 open
  [ ] D. H3 on more modules
         Tells which modules earn Tier 0/1; slow mutation runs

## Q2 [retest.h1-reopen] -- Do we test batching (H1) again?

CONTEXT:
  H1 was killed in 4 of 4 runs across 2 repos and 2 models.
  Re-open trigger in ADR-003: setup time > 50% of one run.

OPTIONS:
  [x] A. No; keep the ADR trigger  (RECOMMENDED)
         Evidence is consistent; saves runs
  [ ] B. Yes, with a heavy-setup repo
         Tests the only case batching can win; needs such a repo

## Q3 [horizon.reopen-scope] -- With a long-horizon stance, which settled nodes do we reopen?

CONTEXT:
  Long horizon lets us change the topology.
  No spike tested the Copilot + deterministic runner split itself; the
  H4 runner only used it.

OPTIONS:
  [x] A. Only the nodes the evidence touched  (RECOMMENDED)
         Focused; long horizon used only where evidence points
  [ ] B. Also reopen control.topology
         Can change the runner model; large scope
  [ ] C. Reopen everything
         Clean slate; discards 8 rounds of settled design

## Q4 [retest.gate] -- Does v1.1 wait for the re-tests?

CONTEXT:
  The ledger can stay open until all re-tests finish.
  Or v1.1 can ship with re-test nodes marked 'pending evidence'.

OPTIONS:
  [x] A. Ship v1.1, mark pending nodes  (RECOMMENDED)
         /goal work can start now; ledger has visible gaps
  [ ] B. Wait for all re-tests
         Clean ledger; blocks /goal for days
