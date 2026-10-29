# GRILL ROUND 1 -- topic: /worktree: change the pi working directory into a new worktree
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [stance] -- How much authority does the current code have?

CONTEXT:
  The request adds a new capability. No approved plan exists.
  The code is evidence of today, not a rule. An option can be: change
  the code.

OPTIONS:
  [x] A. Long horizon  (RECOMMENDED)
         Challenge limits that only come from the code.
  [ ] B. Mid-execution
         Keep the code and ADRs as the base.

## Q2 [cwd.mechanism] -- Which method changes the pi working directory?

CONTEXT:
  Pi binds the session cwd to the session header. It rebuilds cwd-bound
  services when the cwd changes.
  Extension commands can call newSession() and switchSession(path). No
  setCwd() exists.
  An extension can make a session file with
  SessionManager.create(worktreeDir) and then switchSession() to it. A
  spike must prove this.

OPTIONS:
  [x] A. New session in worktree  (RECOMMENDED)
         Real cwd change. Context does not carry over by itself.
  [ ] B. process.chdir() only
         Small code. Tools keep the old cwd. Likely wrong.
  [ ] C. Tell the agent to cd
         No cwd change. Each bash call must repeat it.

DIAGRAM:
  origin session --/worktree--> create worktree
         |                          |
         |                 SessionManager.create(wt)
         |                          |
         +--- parent link ---> switchSession(new file)
                                    |
                           tools, AGENTS.md, skills
                           now load from the worktree

## Q3 [hop.continuity] -- What context goes into the new session?

CONTEXT:
  A new session starts empty. The user gave instructions in /worktree.
  The origin session stays on disk and can be resumed.

OPTIONS:
  [x] A. Instructions plus brief  (RECOMMENDED)
         Parent link, instruction text, branch and a short origin
         summary. Small and clear.
  [ ] B. Instructions only
         Smallest. The agent can lack context from the origin.
  [ ] C. Fork full history
         Full context. Large, and it keeps old cwd assumptions.

## Q4 [worktree.create] -- Who makes the worktree and names the branch?

CONTEXT:
  The using-git-worktrees skill sets the place:
  <repo>/.worktrees/<branch with / as ->.
  It also needs .worktrees/ in git exclude and .gitignore.
  The instructions are free text. A branch name must come from
  somewhere.

OPTIONS:
  [x] A. Extension, slug from text  (RECOMMENDED)
         Fast and predictable. The user can override with --branch.
  [ ] B. Agent makes it with the skill
         Flexible. The cwd hop needs a second step.
  [ ] C. User must give --branch
         Explicit. More typing.

## Q5 [trigger] -- What starts a hop?

CONTEXT:
  Intent names /worktree <instructions>.
  A tool for the agent cannot call newSession(). Only command handlers
  can.

OPTIONS:
  [x] A. Command only  (RECOMMENDED)
         Simple and safe. The user is always in control.
  [ ] B. Command plus agent tool
         Agent can ask for a hop. The tool must queue a command.
         Complex.

## Q6 [return.path] -- How does the user come back to the origin checkout?

CONTEXT:
  The worktree session has a parent link to the origin session.
  /resume and /sessions already exist.

OPTIONS:
  [x] A. /worktree back  (RECOMMENDED)
         One subcommand switches to the parent session. Small.
  [ ] B. Use /resume only
         No new code. The user must find the session.
  [ ] C. Also remove worktree
         Cleans up. Risks lost work. Needs checks.

## TERMS

  Worktree: A linked git checkout under <repo>/.worktrees/<dir>, made by
  the using-git-worktrees convention.
    Avoid: workspace, sandbox
  Origin checkout: The directory that pi used when the user ran
  /worktree.
    Avoid: main dir, parent dir
  Hop: The change of the pi session from the origin checkout to a
  worktree.
    Avoid: jump, switch
  Session cwd: The directory stored in the session header. Tools and
  cwd-bound services use it.
