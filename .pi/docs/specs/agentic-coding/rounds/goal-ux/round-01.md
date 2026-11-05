# GRILL ROUND 1 -- topic: /goal drafting UX
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [goalux.stance] -- Which stance applies to this session?

CONTEXT:
  /goal TB-7 and TB-7b are live. The first live run (g-develop) showed
  weak drafting.
  Mid-execution keeps the lock model and changes only the drafting step.

OPTIONS:
  [x] A. Mid-execution  (RECOMMENDED)
         Keeps ADR-008/009/010 and the live code; drafting changes only
  [ ] B. Long horizon
         Can change the goal model itself; may discard live code

## Q2 [goalux.discover] -- What must the agent do before it drafts a contract?

CONTEXT:
  In g-develop the agent drafted a check for work that TB-8 had mostly
  done.
  It did not read the todo-navigator source.

OPTIONS:
  [x] A. Discover first, always  (RECOMMENDED)
         Reports already true / partly true / not there; costs one
         search step
  [ ] B. Draft at once (as now)
         Fast; repeats the g-develop failure
  [ ] C. Discover only on request
         Cheap; the user must know to ask

## Q3 [goalux.clarify] -- When can the agent ask questions before it drafts?

CONTEXT:
  A one-line intent can omit the owning repo and an observable done.
  Always asking is slow. Never asking gives confident wrong drafts.

OPTIONS:
  [x] A. Only on a gap, max 2  (RECOMMENDED)
         Gaps: repo or path unknown, no observable done, outcome already
         true
  [ ] B. Always ask 1-3 first
         Better drafts; friction on trivial goals
  [ ] C. Never ask (as now)
         Review must catch everything

## Q4 [goalux.draft-lint] -- When does /goal report problems in a draft?

CONTEXT:
  The exit-127 base failure, the anchors on an installed copy, and the
  shared branch were known at save time.
  Lock enforces only some of these, and only later.

OPTIONS:
  [x] A. Lint at save, warn only  (RECOMMENDED)
         Early signal; lock still enforces; user can fix by hand
  [ ] B. Lint at save, refuse save
         Strict; blocks drafts that the user wants to edit
  [ ] C. Lock only (as now)
         No new code; problems found late

## Q5 [goalux.shared-branch] -- What does /goal do when it starts on develop or main?

CONTEXT:
  g-develop was started on develop, a shared branch that was pushed the
  same day.

OPTIONS:
  [x] A. Warn, offer a worktree  (RECOMMENDED)
         User chooses; no block on solo repos
  [ ] B. Refuse
         Safe; blocks quick goals
  [ ] C. Allow silently (as now)
         No change

## Q6 [goalux.review-card] -- How does /goal show a draft for review?

CONTEXT:
  Now the agent writes a free-text summary. The user asked 'how do we
  proceed?'.

OPTIONS:
  [x] A. Fixed card from extension  (RECOMMENDED)
         Outcome, checks with kind and base result, anti-goals, anchors,
         warnings, one next-step line
  [ ] B. Agent summary (as now)
         No code; varies per run
  [ ] C. Card only on /goal
         Less noise; user must ask

## Q7 [goalux.cross-repo] -- Where does a goal live when the code is in a different repo?

CONTEXT:
  g-develop started in dotfiles; the code is in agent-skills.
  ADR-008: one goal per branch, in the todo store of that repo.

OPTIONS:
  [x] A. Move goal to owning repo  (RECOMMENDED)
         Discovery names the repo; agent proposes /goal there; ADR-008
         unchanged
  [ ] B. Cross-repo goals
         Fits the real case; new ADR; check runs across repos
  [ ] C. Defer, document limit
         No work; the case stays unsupported

## TERMS

  Discovery: The step before a draft where the agent finds existing
  code, tests and docs for the outcome and reports how much is already
  true.
  Draft Lint: Warnings that /goal shows when a draft is saved, before
  lock.
  Review Card: The fixed view of a draft that the extension prints,
  which ends with one next-step line.
  Owning Repo: The repository that holds the code that the goal changes.
