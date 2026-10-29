# GRILL ROUND 4 -- topic: /worktree: final review
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [handoff.next] -- What happens after you approve this review?

CONTEXT:
  The handoff spec goes to .pi/docs/specs/worktree-cwd/spec.md, next to
  the tree, glossary and rounds.
  Tickets go to the todo backlog for this directory. The POC file is
  throwaway.

OPTIONS:
  [x] A. Write spec and tickets, delete POC  (RECOMMENDED)
         Closes the design. POC lesson moves into the spec.
  [ ] B. Write spec only, keep POC
         Keeps POC for later tests. No backlog items yet.
  [ ] C. Write spec, tickets, keep POC
         POC stays until the extension replaces it.

## REVIEW

  DECISION TREE (all settled except one deferred)

  /worktree: change pi cwd into a new worktree      stance: long horizon
   |- [settled] cwd.mechanism   new session, header cwd = worktree, switchSession()
   |- [settled] spike.in-pi     proven live: bash pwd/branch, powerline dir + branch
   |- [settled] spike.agents-md worktree AGENTS.md loads after the hop
   |- [settled] spike.back      /worktree back via parentSession works
   |- [settled] hop.continuity  parent link + instructions + branch + brief
   |- [settled] brief.content   facts only, no model turn
   |- [settled] first.turn      auto-send brief; agent runs baseline
   |- [settled] worktree.create extension makes it (using-git-worktrees layout)
   |- [settled] slug.rules      <type>/<slug>, max 40, -2 on clash, default type feat
   |- [settled] base.branch     current HEAD; --base overrides; recorded in brief
   |- [settled] instr.interpret flags now (--type --branch --base)
   |- [settled] trigger         command only
   |- [settled] return.path     /worktree back; never auto-remove
   |- [settled] dirty.origin    warn, list in brief
   |- [settled] hop.existing    reuse branch/worktree and hop
   |- [settled] ignore.handling shared git exclude only; tell user about .gitignore
   |- [settled] nested.origin   sibling under common root, base = HEAD
   |- [settled] success.metric  one call -> pwd, AGENTS.md, branch match; back restores
   '- [deferred] spike.tool-hop agent-started hop; later, needs a tool-to-command bridge

  DRAFT HANDOFF SPEC  (.pi/docs/specs/worktree-cwd/spec.md)

   Goal: /worktree <instructions> makes a worktree and moves the session into it.
   Success: one call; pwd, AGENTS.md and branch match; back restores origin.

   Spec unit 1: Hop
     MUST make the worktree under <repo>/.worktrees/<branch with / as ->.
     MUST add .worktrees/ to the shared git exclude file before git worktree add.
     MUST create a session whose header cwd is the worktree and whose parent is
          the origin session.
     MUST write the brief as a user message BEFORE switchSession().
          (Pi writes the file only after a message exists. Without it the hop
           silently stays in the old directory. Proven by POC.)
     MUST send the instructions as the first turn.
     SHOULD warn when the origin checkout is dirty and list the files.
     MAY reuse an existing branch or worktree.

   Spec unit 2: Back
     /worktree back MUST switch to the header parentSession.
     MUST NOT remove the worktree.

   Spec unit 3: Naming
     Flags: --type, --branch, --base. Type is a Conventional Commit type.

   Anti-goals: no process.chdir(); no auto-remove; no .gitignore commit;
               no model-written brief; no agent-started hop in v1.

   Open decisions: spike.tool-hop (deferred).

   Tickets (tracer bullets):
     1 Hop with explicit --branch, brief seeded, first turn sent  (core)
     2 Slug, type and base defaults plus flags
     3 /worktree back
     4 Guards: dirty origin warn, existing worktree reuse, nested origin, exclude file
     5 Replace POC; delete worktree-poc-command.ts

   Where artefacts go: spec.md, decision-tree.md, GLOSSARY.md, rounds/ in
   .pi/docs/specs/worktree-cwd/. No ADR (the hop method is cheap to change).
   Scenarios go to features/worktree.feature with the tickets.
