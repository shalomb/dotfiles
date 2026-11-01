# GRILL ROUND 4 -- topic: agentic-coding v1.1 — stress-test and falsifiability
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [waf.h5] -- Is H5 the falsifiable hypothesis for /goal?

CONTEXT:
  With /goal active, sessions stop within 1 turn of a green done-check,
  and < 10% of commits fall outside scope anchors.
  Measured from session JSONL and git, as in agentic-falsify.

OPTIONS:
  [x] A. Adopt H5 as stated  (RECOMMENDED)
         Cheap to score with existing harness
  [ ] B. Add a token-cost metric
         Shows whether /goal saves cost; noisier (H1 variance)
  [ ] C. Scope metric only
         Simplest; ignores gold-plating after green

## Q2 [waf.h5-kill] -- What do we do if H5 fails?

CONTEXT:
  The failure: /goal shows no difference against sessions without it.
  Then the contract is a notes file with extra ceremony.

OPTIONS:
  [x] A. Downgrade to notes file  (RECOMMENDED)
         Keeps goal.md; drops injection, lock and done gate
  [ ] B. Remove /goal entirely
         Smallest system; loses the North Star anchor

## Q3 [waf.weak-check] -- How do we stop a done-check that is too weak?

CONTEXT:
  A done-check can pass trivially (e.g. `true`, or a test that asserts
  nothing).
  H3 showed that tests can pass while defects escape.

OPTIONS:
  [x] A. Must fail on base commit first  (RECOMMENDED)
         Proves the check can fail; cheap; does not prove it is complete
  [ ] B. Mutation-score the check
         Strong; slow; Python only today
  [ ] C. Trust human confirm
         No cost; weak checks get through

## Q4 [waf.no-command] -- What if a goal cannot have a command done-check?

CONTEXT:
  Some goals have no command check (docs, design, research).
  A forced fake check is worse than none.

OPTIONS:
  [x] A. Allow a human-confirm check  (RECOMMENDED)
         Covers design work; done becomes an assertion, recorded as such
  [ ] B. Command check required
         Strict; /goal is unusable for design sessions

## Q5 [waf.injection-cost] -- How often is the goal put into the prompt?

CONTEXT:
  The injection adds ~8 lines on every turn.
  H2: Main Copilot context stayed at 7%; injection cost is small.

OPTIONS:
  [x] A. Inject every turn, <= 10 lines  (RECOMMENDED)
         Survives compaction; small fixed cost
>> Or just a reminder with a reference i.e. "The goal is `do.foo` .. use `so and so` if a refresher is needed."  This is a good compromise between cost and goal drift.
  [ ] B. Inject only after compaction
         Cheaper; goal can drift between compactions

## Q6 [waf.stale-goal] -- What happens to the goal of a merged or deleted branch?

CONTEXT:
  A branch can end (merged, deleted) with its goal open.

OPTIONS:
  [x] A. Warn at session start  (RECOMMENDED)
         Visible; human chooses close or drop
  [ ] B. Auto-close on merge
         No clutter; closes without a green check
