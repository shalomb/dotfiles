# GRILL ROUND 3 -- topic: agentic-coding v1.1 — intent.north-star (/goal)
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [goal.store] -- Where is the goal contract stored?

CONTEXT:
  The spec names the North Star 14 times but stores it nowhere.
  ADR-002 puts all state in the out-of-repo todo store.

OPTIONS:
  [x] A. goal.md in todo store  (RECOMMENDED)
         One store (ADR-002); human-editable; todo replan can read it
  [ ] B. pi session state only
         Simple; lost across sessions and invisible to todo
  [ ] C. Frontmatter in TODO.md
         No new file; mixes intent with the task list

## Q2 [goal.contract] -- Which fields does the goal contract have?

CONTEXT:
  Proposed: outcome (1-2 lines), anti-goals, done-check commands, scope
  anchors (paths), spec links.

OPTIONS:
  [x] A. All five fields  (RECOMMENDED)
         Enough for gate, critic and governor; more to write
  [ ] B. Outcome + done-check only
         Minimal; no anti-goals or scope for pruning and drift checks

## Q3 [goal.done-check.author] -- Who writes the done-check, and when?

CONTEXT:
  H3: tests written against known defects scored 0.95; on unseen ones,
  0.63.
  If the agent writes the done-check while doing the work, the check
  fits the work.

OPTIONS:
  [x] A. Agent drafts, human confirms, then locked  (RECOMMENDED)
         Low effort for human; check exists before work
  [ ] B. Human writes it
         Strongest independence; more human effort
  [ ] C. Agent writes it, no lock
         Fastest; same overfit risk as H3

## Q4 [goal.done-check.change] -- Who can change a locked done-check?

CONTEXT:
  A locked check can be wrong, or the goal can change.
  If the agent can change it, it can move the target to fit its work.

OPTIONS:
  [ ] A. Human only, recorded with reason
         No target-moving; each change is visible in history
  [x] B. Agent proposes, human approves  (RECOMMENDED)
         Same safety; agent can start the change
  [ ] C. Agent, if check gets stricter
         Agent can add checks without asking; removing needs human

## Q5 [goal.scope] -- How many goals are active at one time?

CONTEXT:
  Feature worktrees run in parallel (one writer per worktree).
  The todo store is keyed by repo slug.

OPTIONS:
  [x] A. One goal per branch  (RECOMMENDED)
         Fits parallel worktrees; goal files keyed by branch
  [ ] B. One goal per repo
         Simplest; conflicts when two worktrees run
  [ ] C. Many goals, tasks pick one
         Flexible; harder to say what 'done' means

## Q6 [goal.task-link] -- How do tasks link to the goal?

CONTEXT:
  The governor prunes leaf tasks 'with no North Star link'.
  Today, tasks carry no goal reference.

OPTIONS:
  [x] A. Auto [goal: <id>] while active  (RECOMMENDED)
         Zero effort; pruning and H5 scope metric work
  [ ] B. Manual tag
         Explicit; often forgotten
  [ ] C. No link
         Simplest; governor pruning cannot use the goal

## Q7 [goal.close] -- What must be true before /goal done closes a goal?

CONTEXT:
  Close means the outcome is met.
  Spec: verification before assertion; OLA/RDS capture at the end.

OPTIONS:
  [x] A. Check green, then persist + lessons  (RECOMMENDED)
         Cannot close on assertion; captures learning
  [ ] B. Check green only
         Simpler; loses the learning capture
  [ ] C. Human closes at will
         Flexible; allows done-by-assertion

## TERMS

  Goal Contract: The stored record of one goal: outcome, anti-goals,
  done-check, scope anchors, spec links.
    Avoid: North Star (as a vague term)
  Done-check: An executable command that proves the goal is met; set and
  confirmed before work starts.
  Locked: The state of a done-check after the human confirms it; changes
  need human approval.
  Scope Anchor: Paths that the goal's work is expected to touch; used
  for drift and scope checks.
