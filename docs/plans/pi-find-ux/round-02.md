# GRILL ROUND 2 -- topic: pi-find UX: worktree resume, session roots, seam
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [worktree.target] -- Which worktree must receive a resumed session?

CONTEXT:
  A session may have run at the repo top level, in a worktree, or in a
  worktree now deleted.
  Goal: never start work at the repo top level.

OPTIONS:
  [x] A. Original worktree; else pick or create  (RECOMMENDED)
         Faithful. If gone or top level, fzf asks: pick existing or
         create a new one.
  [ ] B. Always create a new worktree
         Clean. Many worktrees pile up.
  [ ] C. Match by branch, else create
         Automatic. Branch may be stale or merged.

## Q2 [source.discovery] -- How must pi-find find every session root?

CONTEXT:
  Sessions exist under ~/.pi/agent/sessions and
  ~/.pi/profiles/*/sessions.
  Today the root is hard-coded to the personal profile.

OPTIONS:
  [x] A. Scan known roots; config adds more  (RECOMMENDED)
         Finds all. Needs a small root list in config.
>> So, just a thought, the gum(1) cli can give us repository roots. If that
>> will help at all.
  [ ] B. Ask pi-profile for its roots
         One owner. Misses sessions pi-profile does not manage.
  [ ] C. Scan the whole file system
         Complete. Slow and noisy.

## Q3 [pi-profile.seam] -- What must pi-profile own, and what must pi-find own?

CONTEXT:
  pi-profile selects the profile and agent dir.
  pi-find must resume in the right profile and worktree.

OPTIONS:
  [x] A. pi-find owns search and resume; pi-profile gives launch env  (RECOMMENDED)
         Clear split. pi-find calls pi-profile to launch.
  [ ] B. pi-profile owns resume; pi-find only selects
         Resume logic in one place. pi-find needs a pi-profile API.
  [ ] C. Merge into one command
         Simple for the user. Big change.

## TERMS

  Target worktree: The git worktree where a resumed session starts.
  Never the repo top level.
  Session root: A directory that holds session files. There can be many.
    Avoid: sessions dir
