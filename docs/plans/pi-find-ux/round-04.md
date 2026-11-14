# GRILL ROUND 4 -- topic: pi-find UX: final review
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [final.approve] -- Do you approve the design and the handoff?

CONTEXT:
  H means Hypothesis. A hypothesis is a claim we can prove false.
  Each H has a number. If the number is missed, we stop and change the
  design.
  H1 Recall: one term in three is wrong. The right session must be in
  the top 5. Kill below 90% of 20 real queries.
  H2 Speed: the first fzf frame must show in 300 ms. Kill above that at
  p95 with 5000 sessions.
  H3 Resume: Enter must never land at the repo top level when a worktree
  exists.

OPTIONS:
  [x] A. Approve the handoff  (RECOMMENDED)
         Spikes H1-H3 start first. Then build slices 4-8.
  [ ] B. Change something
         Reply with >> notes on the review text.

## REVIEW

  DECISION TREE
  pi-find UX
  +-- stance ................ settled (long horizon)
  +-- ladder.trigger ........ settled (one weighted list)       ADR-014
  +-- expand.source ......... settled (local vocab + fuzzy)
  +-- search.engine ......... settled (FTS5 + trigram)          ADR-015
  +-- ui.fzf ................ settled (fzf on TTY, table piped)
  +-- profile.scope ......... settled (all sessions, profile column)
  +-- resume.action ......... settled (worktree, never top level) ADR-016
  +-- worktree.target ....... settled
  +-- source.discovery ...... settled (known roots + config, gum repo roots)
  +-- pi-profile.seam ....... settled (pi-find owns resume)
  +-- waf.* (5) ............. settled

  ARTEFACTS (docs/plans/pi-find-ux/ and docs/architecture/)
   handoff.md, decision-tree.md, GLOSSARY.md, architecture.md (C4),
   features/pi-find.feature, round-01..03.md,
   ADR-014, ADR-015, ADR-016.

  HANDOFF DRAFT
   What: pi-find recalls a half-remembered session, opens fzf,
         and resumes in the right worktree and profile.
   Tickets: spikes H1, H2, H3 first, then slices 4-8.
   Anti-goals: no LLM in search, no file-system scan, no top-level start.

  NOTE: the design-thinking skill is not changed. Your request to explain
  H numbers each round is applied here only.
