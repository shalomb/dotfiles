# GRILL ROUND 2 -- topic: /worktree: naming, base, safety and first turn
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [slug.rules] -- What rules make the branch name?

CONTEXT:
  Round 1 settled: the extension makes the branch from a slug of the
  instruction text. `--branch` overrides.
  Branch names in this setup use a type prefix, for example
  feat/central-mode. The directory is the branch with / as -.

OPTIONS:
  [x] A. feat/<slug>, max 40, -2 on clash  (RECOMMENDED)
         Predictable. Prefix may not fit a fix.
>> This is correct but consult our git skills for how we do this today.
  [ ] B. Prefix from first word
         fix, test, docs map to types. Guess can be wrong.
  [ ] C. No prefix
         Short names. Not Conventional-style.

## Q2 [base.branch] -- Which commit is the base of the new branch?

CONTEXT:
  The using-git-worktrees skill says: branch from the branch the work
  belongs to, not from main by default.

OPTIONS:
  [x] A. Current HEAD of origin  (RECOMMENDED)
         Follows the skill. Work stays near what the user sees.
>> Current HEAD is the right choice but instructions provided by the user may have the agent decide otherwise.
  [ ] B. Default branch (main)
         Clean start. Loses work in progress on the current branch.
  [ ] C. Ask each time
         Explicit. Slows each hop.

## Q3 [dirty.origin] -- What happens when the origin checkout has uncommitted changes?

CONTEXT:
  A worktree starts from commits. It does not contain uncommitted edits
  of the origin checkout.

OPTIONS:
  [x] A. Allow, warn, list in brief  (RECOMMENDED)
         No blocking. The agent knows the edits are not in the worktree.
  [ ] B. Refuse until clean
         Safe. User must commit or stash first.
  [ ] C. Stash and apply in worktree
         Carries edits. Changes the origin and can conflict.

## Q4 [brief.content] -- How is the origin brief made?

CONTEXT:
  The brief is the first context of the new session. Round 1 chose:
  parent link, instructions, branch, short origin brief.
  A model-written summary costs one extra turn. Facts from git cost
  none.

OPTIONS:
  [x] A. Facts only, no model turn  (RECOMMENDED)
         Origin path, base, branch, short git status, parent session
         path, instructions. Fast and exact.
  [ ] B. Facts plus model summary
         Richer context. Extra turn and cost, and it can be wrong.

## Q5 [hop.existing] -- What happens when the branch or its worktree already exists?

CONTEXT:
  Branch may already exist, or may already have a worktree (for example
  from an earlier hop).
  The skill says one writer for each worktree.

OPTIONS:
  [x] A. Reuse and hop  (RECOMMENDED)
         Resumes work in place. Warn if the worktree is dirty.
  [ ] B. Refuse with message
         Safe. User must run /worktree back or pick a name.
  [ ] C. Make a -2 branch
         Never blocks. Leaves duplicate work.

## Q6 [first.turn] -- Does the new session start work at once?

CONTEXT:
  After the hop the new session is empty. The user typed instructions in
  /worktree.
  The skill's Step 3 (install, baseline check) is a task for the agent,
  not for the extension.

OPTIONS:
  [x] A. Auto-send brief and instructions  (RECOMMENDED)
         Work starts at once. The brief asks the agent to run the
         baseline.
  [ ] B. Put text in the editor
         User can edit before sending. One extra step.

## TERMS

  Brief: The first message of the worktree session: facts about the
  origin checkout plus the user's instructions.
    Avoid: summary, handoff
  Slug: A short lowercase text made from the instructions. It forms the
  branch name.
    Avoid: name, label
  Base: The commit that the new branch starts from.
    Avoid: parent branch, source
  Worktree: A linked git checkout under <repo>/.worktrees/<dir>, made by
  the using-git-worktrees convention.
  Hop: The change of the pi session from the origin checkout to a
  worktree.
