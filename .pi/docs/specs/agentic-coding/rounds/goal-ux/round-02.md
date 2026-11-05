# GRILL ROUND 2 -- topic: /goal drafting UX
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [goalux.noise] -- How much of the injected draft prompt does the user see?

CONTEXT:
  The injected draft prompt shows in full in the session.
  It is for the agent, not for the user.

OPTIONS:
  [x] A. One quiet line  (RECOMMENDED)
         '/goal: drafting the contract for g-<slug>'; full prompt hidden
  [ ] B. Full prompt (as now)
         Transparent; noisy

## Q2 [goalux.retest] -- How do we prove that TB-7c makes drafting better?

CONTEXT:
  We need proof that TB-7c makes drafts better, not only that the code
  runs.

OPTIONS:
  [x] A. Replay two goals  (RECOMMENDED)
         g-develop and --version, before and after; pass rules fixed now
  [ ] B. Unit tests only
         Proves code; not draft quality
  [ ] C. User judgement
         Cheap; not repeatable

## Q3 [waf.discover-false-claim] -- What stops a wrong 'already true' report?

CONTEXT:
  Risk: the agent reports 'already true' but is wrong, and the user
  drops a real goal.
  The g-develop goal was in fact partly true.

OPTIONS:
  [x] A. Claims need evidence  (RECOMMENDED)
         Each claim cites a path and a command that the card shows; user
         can rerun
  [ ] B. Trust the agent
         No cost; wrong claims go unseen
  [ ] C. Only 'not there' allowed
         Removes the risk; removes the value

## Q4 [waf.lint-fatigue] -- How do we keep Draft Lint warnings worth reading?

CONTEXT:
  Draft Lint can warn on every draft, so the user stops reading it.
  Warn-only gives no force.

OPTIONS:
  [x] A. Few rules, no false hits  (RECOMMENDED)
         Only 4 rules: exit 126/127, anchor outside repo, install dir,
         shared branch
  [ ] B. Many rules
         Finds more; users ignore warnings

## Q5 [waf.lint-runs-commands] -- Can Draft Lint run the draft commands before the human reviews them?

CONTEXT:
  Lint at save runs the check on the base commit. A slow or unsafe check
  runs before the human reads it.

OPTIONS:
  [x] A. Static lint only at save  (RECOMMENDED)
         No command runs before review; base run stays at lock
  [ ] B. Run base at save
         Earlier fail signal; runs agent-written commands unreviewed

## Q6 [waf.kill-rule] -- What result makes us remove Discovery again?

CONTEXT:
  Falsifiability: if replays show no gain, TB-7c is cost with no value.

OPTIONS:
  [x] A. Kill rule on replay  (RECOMMENDED)
         If both replays fail 2 of 4 pass rules, revert Discovery and
         keep the card only
  [ ] B. No kill rule
         Keeps the work whatever the result

## TERMS

  Discovery: The step before a draft where the agent finds existing
  code, tests and docs for the outcome.
  Draft Lint: Warnings shown at save, before lock.
  Review Card: The fixed view of a draft, with one next-step line.
  Owning Repo: The repository that holds the code that the goal changes.
