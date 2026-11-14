# Design tree: /doc system evolution & shadow scratch

Goal: Ship a first slice that proves the /doc evolution: a docking search page and a persistent shadow scratch store.
Stance: long horizon (code is evidence, not authority)

- [settled] stance -- Long horizon. Round 1.
- [settled] scope.first_slice -- Homepage search UX + shadow scratch. Round 1.
  - [settled] scratch.storage_path -- XDG cache shadowed per repo slug (`~/.cache/agent-skills/scratch/<repo-slug>/`). Round 1.
  - [settled] scratch.key -- Repo slug / worktree name. Round 1.
  - [open] scratch.cli -- Command surface of `scratch` and `/scratch`.
  - [open] scratch.agent_access -- How other agents find and read a scratch note.
  - [open] scratch.promote -- Does promote to /doc ship in slice 1?
  - [open] scratch.undo -- Is Neovim undofile enforced for the store?
  - [settled] search.ui_transition -- CSS state toggle on non-empty query. Esc resets. Round 1.
  - [open] search.legend -- What does the idle legend show, and where does it fold?
  - [open] search.index_seam -- Does the page keep reading index.json only?
- [deferred] doc.cli -- Reason: full CLI and navigator skill are after slice 1.
- [deferred] doc.dossier -- Reason: dossier and meta-docs are after slice 1.
- [open] waf.* -- Stress-test round after the functional nodes settle.
