# ADR-017: /doc as spec plus slots: living, reproducible, visual-first documents

- **Status:** Proposed
- **Date:** 2026-11-16
- **Deciders:** shalomb
- **Context branch:** `feat/doc-system`

## Context

`/doc` renders Markdown or structured JSON into self-contained HTML and files it in a
library (`~/.cache/agent-skills/docs/<kind>/<date>-<slug>/`) behind a stable URL on idun.

What works today:

- **Fast, deterministic rendering.** `doc-render/build.py` renders the 2026-11-16 EKS
  working guide in about 0.65 s with no LLM.
- **Building blocks exist.** `widgets.py` turns Markdown conventions into components:
  `kpis`, `spine`, `compare`, `folds`, `decisions`, `bars`, `glossary`, `pills`,
  `callouts`, and Mermaid rendered to SVG with brand tokens. The JSON templates
  (`decision`, `readout`, `epicmap`) share `kernel.css`, `kernel.js` and `kernel.py`.
- **A partial record.** `meta.json` stores `origin` (an absolute source path), `repo`,
  `kind` and `date`. A provenance recipe is embedded only when a prompt is passed.

What hurts:

1. **The LLM decides both content and layout.** Every refresh is a full rewrite: slow,
   costly, and different each run.
2. **Docs cannot be replayed.** Nothing records the inputs (the queries, JQL and files
   that produced the figures), the source commit or the branch, and no command reruns
   them.
3. **Visuals are opt-in.** Widgets depend on the author remembering conventions, so
   many docs come out as walls of prose. Figures are typed by hand and drift from
   their sources.
4. **The widget set is thin for operations work.** The EKS heat grid and timeline were
   hand-built.
5. **Few types.** The purposes are decision, report, status, workshop and deck. There
   is no guide, runbook, change record (CR), postmortem or one-pager.
6. **Two pipelines build the same blocks:** Markdown widgets and JSON templates.
7. **The branch has not landed.** The live `~/.pi` copy is the 14 Nov build. A partial
   deploy on 2026-11-16 overwrote the live `doc-publish.ts` with a branch version whose
   imports did not exist there.

## Decision

### 1. A doc is a **spec** plus **slots**

- **Spec** (deterministic, no LLM): the type, the layout of blocks, and the data
  inputs each block binds to.
- **Slots** (the only LLM-written text): the lede, the "so what" line, and a one-line
  reading under each figure. Each slot records the hash of the data it was written
  from.
- **Numbers come from inputs, not prose.** A figure in a slot must cite an input id.
  Lint enforces this (this supersedes the "figures uncited" heuristic).

### 2. The record is a replayable recipe

`meta.json` grows into `record.json`:

```yaml
origin: {repo, branch, worktree, path, sha}
type: workshop
inputs:
  - {id: deploys, kind: cmd,  run: "kubectl get deploy -A -o json | jq ...", ttl: 1h, hash: ...}
  - {id: epic,    kind: jira, jql: "parent = TAKOSDSO-117", hash: ...}
  - {id: guide,   kind: file, path: how-to/eks-1-36-upgrade-guide.md, sha: ...}
slots:
  lede:          {inputs: [deploys, epic], hash: ...}
  risks.reading: {inputs: [risks],         hash: ...}
render: {renderer: <sha>, brand: takeda, art: circuit}
```

The rules:

- Input commands must only read data. A `kind: cmd` input runs under the same
  allowlist as the drive gate.
- Results are cached by hash with a TTL, and secrets are never stored.

### 3. Refresh by URL

`/doc refresh <url>[#section]`, or the CLI `doc refresh <url>`, does this:

1. URL → library path → `record.json`.
2. Find the worktree: `git worktree list` → `origin.worktree`. If it is gone, recreate
   it from `origin.branch`. As a fallback, use repo discovery (`gum`).
3. Re-run the inputs. The fragment (`#risks`) limits the refresh to that section's
   blocks.
4. Re-render the blocks (no LLM).
5. Regenerate only the slots whose input hash changed, using a small model. Changes
   are written to the source on a `refresh/<date>` commit in that worktree.
6. Republish to the same URL. The previous render moves to `versions/`, and
   `doc diff <url>` shows the changes.

### 4. Visual first, by default

- **One block model.** Markdown widgets and JSON templates converge on a single
  registry: block name → schema → renderer (Python) → CSS (tokens only).
- **Standard blocks** in addition to today's: risk heat grid, Gantt/timeline, RAG
  board, progress ring, sparkline KPI, swimlane, dependency graph, checklist with
  status, big-number slide.
- **A density lint.** At most N paragraphs between visuals. An executive summary must
  be blocks only. Every type declares its required blocks.
- **Palettes and art are token packs.** Light and dark come from one variable set.
  House, takeda and future packs are swapped by `style:`/`brand:`, and edge art by
  `art:` (as in `doc-art.ts`).

### 5. Types are layouts over blocks

Each type is a list of required and optional blocks plus lint rules. A new type should
not need new rendering code.

| Type | Required blocks |
|---|---|
| decision | spine, decisions, ask |
| report | lede, method, findings, sources |
| status | RAG board, delta KPIs, next |
| workshop / guide | steps, checklist, folds |
| runbook | steps, commands, checks, rollback |
| change record | scope, risk grid, plan, back-out |
| postmortem | timeline, impact KPIs, actions |
| one-pager | KPIs, spine, ask |
| deck | any type, in present mode |

### 6. Speed budget (acceptance criteria)

| Path | Budget | LLM |
|---|---|---|
| render or republish | < 1 s | none |
| refresh, data unchanged | < 2 s + input time | none |
| refresh, data changed | seconds | changed slots only |
| new doc | one pass for spec and slots | once |

- Mermaid SVGs and input results are cached by content hash.
- A cached re-render must make no network calls and no LLM calls.

## Consequences

**Positive**

- Refreshes are cheap and stable. Unchanged data gives a byte-identical page apart from
  the timestamp.
- Figures are traceable to their inputs, so docs are reproducible from the record and
  its commit SHA.
- Visual consistency comes from the block registry, not author memory.

**Negative / risks**

- **Spec authoring cost.** The first draft of a doc needs a spec. Mitigation: the LLM
  drafts the spec once, and types provide skeletons.
- **Input commands are an execution surface.** Mitigation: commands only read data, run
  under an allowlist, and are shown before the first run.
- **Migration cost.** Existing docs have no inputs. Mitigation: they stay valid as
  "static" records, and refresh simply re-renders them.

## Sequencing

0. Land `feat/doc-system` on `develop` (prerequisite; see Context item 7).
1. `record.json` with origin, branch, worktree and commit SHA, written on publish.
2. `doc refresh <url>` that only re-renders (worktree lookup, no inputs yet).
3. Inputs: a cached runner for `file`, `cmd` and `jira`.
4. Slots with hashes: regenerate only the changed slots.
5. A unified block registry, then the new blocks and the density lint.
6. Palette and art packs.
7. New types: guide, runbook, change record, postmortem, one-pager.

## Related

- ADR-005 (test before deploy)
- `docs/reports/doc-field-report-2026-11-16-pic-eks-guide.md`
- `.pi/agent/extensions/_lib/doc-art.ts`
