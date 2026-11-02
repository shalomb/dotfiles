# GRILL ROUND 3 -- topic: /goal v2 — tamper store follow-up
# STANCE: mid-execution. The current code and accepted ADRs are the foundation.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [waf.tamper-store] -- Do we keep the Tamper Check hash on a private git ref?

CONTEXT:
  Idea: store the hash as a commit on a private ref (e.g.
  refs/goals/<branch>), not pushed.
  Gain: git history makes every edit visible, survives sessions, needs
  no new dir.
  Limit: the agent has bash and git, and your GPG agent signs for it
  too, so a signature does not prove a human wrote it.
  So a ref is tamper-evident (history), not tamper-proof, same as a
  guarded dir.

OPTIONS:
  [x] A. Private git ref per goal  (RECOMMENDED)
         Edit history for free; same trust level; slightly more git
         plumbing
  [ ] B. Separate store dir, guarded
         Simplest; history only in goal.md

DIAGRAM:
  refs/goals/feat-x:  c1 lock(hash A) -- c2 approve(hash B)
  /goal done: hash(current check) == tip hash?  else refuse
