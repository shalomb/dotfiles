# GRILL ROUND 3 -- topic: pi-find UX: adversarial stress-test (waf)
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [waf.cost-overhead-cap] -- What cost cap must a pi-find run meet?

CONTEXT:
  Each run scans jsonl history from all roots, plus FTS and trigram
  indexes, plus gum lookups, plus fzf preview.
  Today a run already reaps and backfills every time.

OPTIONS:
  [x] A. Incremental index; fzf opens in 300 ms  (RECOMMENDED)
         Backfill only new files by mtime. Kill if p95 above 300 ms at
         5000 sessions.
  [ ] B. Full rescan each run
         Simple. Slows as history grows.

## Q2 [waf.concurrency] -- How must pi-find avoid collisions with live sessions?

CONTEXT:
  Many pi sessions write the registry while pi-find backfills and reaps.
  Two pi-find runs can also run at once.

OPTIONS:
  [x] A. SQLite WAL, short writes, no locks held in fzf  (RECOMMENDED)
         Readers never block. Needs busy timeout.
  [ ] B. Lock file for the whole run
         Simple. A stuck fzf blocks all.

## Q3 [waf.partial-salvage] -- What must happen when one step fails?

CONTEXT:
  A step can fail: gum missing, fzf missing, worktree create fails, bad
  jsonl, corrupt index.

OPTIONS:
  [x] A. Degrade by layer; keep earlier results  (RECOMMENDED)
         No fzf gives table. No gum gives path-based repo. Bad file is
         skipped and counted. Failed worktree create still cds to repo
         and warns.
  [ ] B. Fail the whole run on any error
         Strict. User sees nothing.

## Q4 [waf.cold-start] -- How must search behave with very few sessions?

CONTEXT:
  A user with 5 sessions or one repo has no vocabulary for fuzzy match.
  Weights from /locate were set by hand.

OPTIONS:
  [x] A. Fall back to plain OR match; show recent list on empty term  (RECOMMENDED)
         Works at N=1. Fuzzy only when the index has enough words.
  [ ] B. Always use fuzzy ranking
         Uniform. Noisy at small N.

## Q5 [waf.falsifiable-hypotheses] -- Which hypotheses and kill thresholds must bind the design?

CONTEXT:
  Each pillar needs a number and a spike before full build.
  H1 recall: with one wrong term out of three, the target session is in
  the top 5.
  H2 speed: first fzf frame in 300 ms p95 at 5000 sessions.
  H3 resume: Enter lands in a non-top-level worktree in 100% of cases
  where one exists.

>> So it's a side note to improve the DT skill where we bring in hypotheses
>> and thresholds.
>> I'm kinda new to this and need reminding what these various H numbers are.
>> It'd be good to expand this particular question everytime and explain this
>> to me in STE english for a while.

OPTIONS:
  [x] A. Accept H1-H3 with these kill thresholds  (RECOMMENDED)
         Recall target is 90% of 20 replayed real queries. Spikes first.
  [ ] B. Change the thresholds
         Reply with >> and new numbers.

## TERMS

  Session root: A directory that holds session files. There can be many.
  Repo root: Top directory of a repository, as reported by gum.
