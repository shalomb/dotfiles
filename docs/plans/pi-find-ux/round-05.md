# GRILL ROUND 1 -- topic: pi-find UX: explain and confirm hypotheses H1-H3
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [h1.recall] -- Is H1 (recall) the right test and number?

CONTEXT:
  H means Hypothesis. A hypothesis is a claim that a test can prove
  false.
  Each H has a number to beat. We run a small spike first. If the spike
  misses the number, we stop and change the design. This saves us from
  building the wrong thing.
  H1 Recall. Claim: if you remember one term in three wrongly, the right
  session still shows in the top 5. Test: replay 20 real past searches
  with one word changed. Pass: 18 of 20 or more. Kill: fewer than 18.
  Kill means we change the ranking or the index before we build more.
  Why 90%: a miss means you scroll or give up. One miss in ten is the
  most we accept.

OPTIONS:
  [x] A. Keep H1 as written  (RECOMMENDED)
         18 of 20 in top 5. Strict, but fair.
  [ ] B. Relax to top 10
         Easier to pass. fzf can show 10 rows, so a miss costs a little
         scrolling.
  [ ] C. Raise to 95%
         Harder. Needs more than 20 queries to be meaningful.

## Q2 [h2.speed] -- Is H2 (speed) the right test and number?

CONTEXT:
  H2 Speed. Claim: fzf shows its first frame fast, even with a large
  history. Test: make 5000 fake sessions and time ten runs. Pass: p95 at
  or below 300 ms. p95 means 19 of 20 runs are at least this fast. Kill:
  above 300 ms. Kill means we use a persistent index or a cache before
  we build more.
  Why 300 ms: below this the tool feels instant. Above it you notice a
  wait.

OPTIONS:
  [x] A. Keep H2 as written  (RECOMMENDED)
         300 ms p95 at 5000 sessions.
  [ ] B. Relax to 500 ms
         Easier. Feels slower on every run.
  [ ] C. Use your real history size
         Test on your actual count instead of 5000. More honest, less
         general.

## Q3 [h3.resume] -- Is H3 (resume) the right test and number?

CONTEXT:
  H3 Resume. Claim: Enter always puts you in a worktree, never at the
  repo top level, when a worktree exists. Test: run the resolver on real
  sessions from your history with real gum and git worktree data. Pass:
  100% of cases. Kill: any case at the top level. Kill means we fix the
  resolver before we build more.
  Why 100%: this is a safety rule, not a quality score. One top-level
  start breaks the rule you gave.

OPTIONS:
  [x] A. Keep H3 as written  (RECOMMENDED)
         100% pass. No exceptions.
  [ ] B. Allow top level if no worktree exists
         Covers repos with no worktree. Needs a clear warning.

## TERMS

  Hypothesis (H): A claim that a test can prove false, with a number
  that decides pass or kill.
    Avoid: assumption, guess
  Spike: A small throwaway test run before the real build to check one
  hypothesis.
  Kill threshold: The number that, if missed, makes us change the
  design.
  p95: The time that 19 of 20 runs beat.
