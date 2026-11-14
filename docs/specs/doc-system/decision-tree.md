# Design tree: /doc system evolution & shadow scratch

Goal: Ship a first slice that proves the /doc evolution: a docking search page and a persistent shadow scratch store.
Stance: long horizon (code is evidence, not authority)

- [settled] stance -- Long horizon. Round 1.
- [settled] scope.first_slice -- Homepage search UX + shadow scratch. Round 1.
  - [settled] scratch.storage_path -- XDG cache shadowed per repo slug (`~/.cache/agent-skills/scratch/<repo-slug>/`). Round 1. ADR: ../../architecture/ADR-014-shadow-scratch-store-outside-git-tree.md
  - [settled] scratch.key -- Repo slug / worktree name. Round 1.
  - [settled] scratch.cli -- `scratch [name]`, `list`, `path` only. Round 2.
  - [settled] scratch.agent_access -- `scratch path` prints the note path; no dedicated tool. Round 2.
  - [deferred] scratch.promote -- Reason: slice 2; slice 1 targets the capture loop.
  - [settled] scratch.undo -- No enforcement; document it. Round 2.
  - [settled] search.ui_transition -- CSS state toggle on non-empty query. Esc resets. Round 1.
  - [settled] search.legend -- Folds into a `<details>` pill. Round 2.
  - [settled] search.index_seam -- Page reads index.json only; contract unchanged. Round 2.
- [deferred] doc.cli -- Reason: full CLI and navigator skill are after slice 1.
- [deferred] doc.dossier -- Reason: dossier and meta-docs are after slice 1.
- [settled] waf.cost-overhead-cap -- Client filter, no LLM, no network. Round 3.
- [settled] waf.concurrency -- Key by worktree; O_APPEND; no locks. Round 3.
- [settled] waf.partial-salvage -- Notes keep old key; list shows orphans. Round 3.
- [settled] waf.cold-start -- Empty-state text; slug falls back to directory name. Round 3.
- [settled] waf.falsifiable-hypotheses -- H1-H3 accepted. Round 3.
