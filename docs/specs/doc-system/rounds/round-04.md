# GRILL ROUND 4 -- topic: /doc system: final review
# STANCE: long horizon. The current code is evidence, not authority.
#
# KEYS:  ]q / [q  next / previous section
#        <Space>  select the option on this line
#        >>       write a reply under this line
#        :wq      send       :q!  quit without changes, then choose
#
# The recommended option is selected. Change it only if you disagree.
# Write a reply only where you disagree or know more.

## Q1 [final.approve] -- Do you approve the design and the handoff plan?

CONTEXT:
  Handoff spec will be docs/specs/doc-system/handoff-slice-1.md, with
  H1-H3 spikes first, then slices.
  Reply with >> notes to change anything.

OPTIONS:
  [x] A. Approve and write handoff spec  (RECOMMENDED)
         Writes the spec and tracer tickets.
  [ ] B. Change something first
         Use >> notes.

## REVIEW

  TREE
  - stance: long horizon [settled]
  - scope.first_slice: search UX + shadow scratch [settled]
    - scratch: store ~/.cache/agent-skills/scratch/<slug>/<worktree>/ (ADR-014)
      cli: scratch [name] | list | path ; agents use `scratch path`
      undo: documented only ; promote: deferred
    - search: CSS toggle landing->docked ; legend in <details> ; index.json unchanged
  - waf: client filter | O_APPEND no locks | orphans listed | dir-name slug fallback
  - deferred: doc CLI, navigator skill, dossiers

  HYPOTHESES (spikes first)
  - H1 filter < 50 ms at 2000 cards
  - H2 note present after reboot
  - H3 git status empty after 10 edits

  ARTEFACTS
  - docs/architecture/ADR-014-shadow-scratch-store-outside-git-tree.md
  - tests/features/scratch.feature, tests/features/doc-search.feature
  - docs/specs/doc-system/{decision-tree,GLOSSARY,rounds/}
  - pending: docs/specs/doc-system/handoff-slice-1.md + tracer tickets

  ANTI-GOALS: no server, no LLM in search, no index.json change, no files in the git tree.
