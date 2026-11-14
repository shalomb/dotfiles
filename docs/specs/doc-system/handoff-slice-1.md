---
status: approved-design
version: 1
owner: repo owner
type: handoff-spec
related: [decision-tree.md, GLOSSARY.md, vision-and-roadmap.md]
promotes_to: [../../architecture/ADR-014-shadow-scratch-store-outside-git-tree.md]
---

# Handoff: /doc slice 1 (search UX and shadow scratch)

**Status:** approved after Round 4. **Audience:** implementers, testers, agents. **Scope:** slice 1 only. The doc CLI, navigator skill, dossiers and scratch promote are deferred.

## Who reads what

| Reader | Read in order |
|---|---|
| Implementer | At a glance, Spec units, Anti-goals |
| Tester | Hypotheses, `tests/features/*.feature` |
| Agent | Spec unit 1, contract block |

## At a glance

```
 shell / pi --> scratch [name|list|path] --> scratch store (outside git)
 browser    --> index.html (reads index.json) --> Landing state <-> Docked state
```

## Hypotheses and kill criteria (spikes come first)

| Id | Hypothesis | Pass | Kill or simplify |
|---|---|---|---|
| H1 | Client filter stays fast | < 50 ms at 2000 cards | Add a prebuilt token index |
| H2 | Notes survive reboot | Note present after reboot | Move the store to XDG state |
| H3 | Notes never dirty git | `git status` empty after 10 edits | Re-check the path rule |

## Spec unit 1: Shadow scratch

**Who / When:** a developer or agent, at any time in a repo or worktree.

```
 scratch path <name> --> ~/.cache/agent-skills/scratch/<repo-slug>/<worktree>/<name>.md
```

- The CLI MUST offer `scratch [name]`, `scratch list` and `scratch path [name]`.
- The store MUST be outside every git tree.
- The repo slug MUST fall back to the directory name when no remote exists.
- Appends SHOULD use `O_APPEND`. The CLI MUST NOT use lock files.
- `scratch list` MUST show notes whose worktree is gone as orphans.
- The CLI MUST NOT force `undofile`. The docs SHOULD say how to enable it.

<details><summary>Contract (YAML)</summary>

```yaml
store: ~/.cache/agent-skills/scratch/<repo-slug>/<worktree>/<name>.md
commands: [open, list, path]
slug_fallback: directory-name
locks: none
orphans: listed
```
</details>

## Spec unit 2: Search page

**Who / When:** a reader of the document library, on opening `index.html`.

```
 Landing --(query non-empty)--> Docked --(clear or Esc)--> Landing
```

- A CSS class MUST switch Landing and Docked states in one page.
- Docked state MUST pin the search box at the top and fold the legend into a `<details>` pill.
- The page MUST read `index.json` only. The `index.json` contract MUST NOT change.
- With no documents, the page MUST show guidance text.
- Filtering MUST run in the browser with no network and no LLM.

## Anti-goals

No server. No LLM in search. No change to `index.json`. No scratch files in a git tree. No promote, doc CLI or dossier work.

## Tracer-bullet tickets (in order)

1. Spike H3 and H2: path rule plus git-clean check.
2. Spike H1: filter 2000 synthetic cards, measure.
3. `scratch` CLI (open, list, path) against `scratch.feature`.
4. Search page state toggle and legend pill against `doc-search.feature`.

## Open decisions

None on the critical path. Deferred: scratch promote (slice 2), doc CLI, dossiers.

## Links

[Decision tree](decision-tree.md) · [Glossary](GLOSSARY.md) · [Vision](vision-and-roadmap.md) · [ADR-014](../../architecture/ADR-014-shadow-scratch-store-outside-git-tree.md) · [scratch.feature](../../../tests/features/scratch.feature) · [doc-search.feature](../../../tests/features/doc-search.feature) · [Rounds](rounds/)
