# GRILL ROUND 3 -- topic: /worktree: instruction handling, ignore, nesting, success
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [instr.interpret] -- Who turns the free text into type, branch and base?

CONTEXT:
  Round 2 notes: follow our git skills for branch names. The user
  instructions may make the agent choose another base.
  Our git skills use Conventional Commit types as prefixes (feat, fix,
  test, docs, chore ...). They set no stricter rule.
  Round 1 settled: command only, no agent tool. A tool-started hop is an
  unknown. Pi may not allow it from a tool.
  finishing-a-development-branch needs the base later, so the brief must
  record it.

OPTIONS:
  [x] A. Flags now, agent later  (RECOMMENDED)
         Reliable now. Type: from flag or feat. User can name any base.
         B waits for the spike.
  [ ] B. Agent decides, now
         Honours free text fully. Reopens trigger. Depends on an
         unproven tool hop.
  [ ] C. Flags and simple text rules
         Reads words like 'fix' or 'from main'. Fragile guesses.

DIAGRAM:
  A  /worktree [--type T] [--branch B] [--base R] text
        -> extension parses flags, uses defaults, hops

  B  /worktree text -> current agent picks type/branch/base
        -> tool worktree_hop(...) -> hop after the turn
        (needs spike: can a tool start the hop?)

  C  A first. A flag the user omits uses a default.
        B added later if the spike passes.

## Q2 [ignore.handling] -- What does the extension do when .worktrees/ is not ignored?

CONTEXT:
  The skill says: never make a worktree in .worktrees/ before git
  check-ignore passes.
  Step 1 adds .worktrees/ to the shared git exclude file, and to
  .gitignore with its own commit.

OPTIONS:
  [x] A. Exclude file only, tell the user  (RECOMMENDED)
         Safe and local. The .gitignore commit stays a user decision.
  [ ] B. Exclude file and .gitignore commit
         Full skill flow. A commit in a hop command is a surprise.
  [ ] C. Refuse until user fixes it
         No surprises. More friction.

## Q3 [nested.origin] -- What happens when /worktree runs inside a worktree?

CONTEXT:
  The user can run /worktree from inside a linked worktree. The skill's
  Step 0 says: do not make another one.
  That skill rule is about the agent working in a task, not about a user
  who asks for a sibling worktree.

OPTIONS:
  [x] A. Sibling under common root  (RECOMMENDED)
         Base is current HEAD. Directory is <main repo>/.worktrees/. No
         nesting.
  [ ] B. Refuse inside a worktree
         Follows Step 0 literally. Blocks stacked branches.

## Q4 [success.metric] -- How do we know that the feature works?

CONTEXT:
  The design needs a check that it works for users.
  A hop that loses the user's place costs trust.

OPTIONS:
  [ ] A. Hop in one command, no re-ask
         Measure: one /worktree call gives a session in the new cwd.
         pwd, AGENTS.md and git branch match.
  [x] B. Add: back returns exactly  (RECOMMENDED)
         Adds a check that /worktree back restores the origin cwd and
         session.

## TERMS

  Branch type: One of the Conventional Commit types (feat, fix, docs,
  refactor, chore, test, perf, style, ci). It starts the branch name.
    Avoid: prefix, kind
  Base: The commit that the new branch starts from.
  Hop: The change of the pi session from the origin checkout to a
  worktree.

>> I think we have to try and do a quick POC - the pi powerline extensions doees also render
>> the CWD and I want that to be updated when switching to worktree.
