# GRILL ROUND 1 -- topic: /goal open questions
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [goal2.stance] -- Which stance applies to this session?

CONTEXT:
  /goal is built and reviewed on a feature branch; it is not live yet.
  Mid-execution: the built code is the authority; only change it where a
  decision forces it.
  Long horizon: the lock design can change shape (for example, git as
  the lock).

OPTIONS:
  [x] A. Mid-execution  (RECOMMENDED)
         Keeps the reviewed code; fast; small changes only
  [ ] B. Long horizon
         Can replace the lock model; may discard reviewed code

## Q2 [goal2.narrow-check] -- How do we reduce the risk of a narrow done-check?

CONTEXT:
  Risk 2: a done-check can be narrow, so it goes green before the
  outcome is met.
  Fail-on-base proves the check can fail. It does not prove it covers
  the outcome.

OPTIONS:
  [x] A. Human review + outcome check  (RECOMMENDED)
         Each goal needs one outside-in command (CLI, file, scenario);
         small effort
  [ ] B. Human review only
         No added rule; narrow checks stay likely
  [ ] C. Require a .feature scenario
         Strongest link to outcome; heavy for small goals; needs step
         runner
  [ ] D. Mutation-score the check
         Measures coverage; slow; Python only

## Q3 [goal2.rubber-stamp] -- How strong must a confirmation be?

CONTEXT:
  Risk 5: frequent yes/no prompts train the human to approve without
  reading.
  Lock and close happen once per goal. Check changes can happen many
  times.

OPTIONS:
  [x] A. Typed id to weaken  (RECOMMENDED)
         Weakening needs a deliberate act; others stay one click
  [ ] B. Yes/no for all
         Simplest; easy to approve by reflex
  [ ] C. Typed id for all
         Safest; friction on every lock and close

DIAGRAM:
  lock (once) --- change (n) --- close (once)
                    |
          strengthen: yes/no
          weaken:     type goal id

## Q4 [goal2.git-lock] -- Where is the lock for a code goal?

CONTEXT:
  Today: lock state (locked_at, base_commit) is in goal.md, and /goal
  runs the check in a temporary worktree.
  Option: commit the check file first as a red commit; the gate refuses
  later commits that change it without approval.

OPTIONS:
  [x] A. Keep goal.md lock  (RECOMMENDED)
         Built and reviewed; works for any command check
  [ ] B. Git red commit as lock
         Less custom state; only for file-based checks; new gate rule
  [ ] C. Both: red commit if file-based
         Best fit per goal; two lock paths to keep

## Q5 [goal2.enforcement] -- Must the agent be unable to escape the lock?

CONTEXT:
  The write guard on the goals directory is best-effort (bash regex, no
  symlink check).
  Two sessions can race on a save.
  Hard enforcement needs file permissions or a separate process that
  owns the store.

OPTIONS:
  [ ] A. Best-effort + visible history
         Cheap; bypass is possible but leaves a trace in git and history
  [ ] B. Hard enforcement
         Agent cannot escape; needs a store owner process; much more
         work
  [x] C. Best-effort + tamper check  (RECOMMENDED)
         Hash of locked check stored outside the goals dir; detects
         edits at close

## Q6 [goal2.base-env] -- How do we stop an environment failure from locking a check?

CONTEXT:
  The base check runs in a bare temporary worktree: no node_modules,
  .venv or build outputs.
  A check can fail there for an environment reason and still lock.

OPTIONS:
  [ ] A. Show output; human judges
         Current design; cheap; relies on human reading the failure
  [x] B. Classify the failure  (RECOMMENDED)
         Refuse lock when failure is 'command not found' or import
         error; heuristic
  [ ] C. Install deps in base worktree
         Real failure only; slow; repo-specific setup

## Q7 [goal2.when] -- When should a session use /goal?

CONTEXT:
  Risk 1: /goal costs more than it gives on small work.
  Value grows with the length and width of the work.

OPTIONS:
  [x] A. Opt-in; agent suggests on > 1 task  (RECOMMENDED)
         Low friction; agent may nag
  [ ] B. Opt-in; agent never suggests
         No nagging; often not used
  [ ] C. Required on feature branches
         Always on; ceremony on small work

## TERMS

  Outcome Check: A done-check command that tests the outcome from
  outside (CLI output, files, a scenario), not unit internals.
  Weakening Change: A change that removes or loosens a command in a
  locked done-check.
  Tamper Check: A hash of the locked done-check stored outside the goals
  directory, compared at close.
