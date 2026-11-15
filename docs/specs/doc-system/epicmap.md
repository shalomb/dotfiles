# Epic map template

A local Jira cache plus an epic key become one self-contained HTML map: the epic, what blocks it, what it
unblocks, what relates to it, and one level down the deliverables from each cached neighbour's Scope.
Code: `.pi/agent/extensions/_lib/doc-render/templates/` (`epicmap.py`, `epicmap.html`, shared `kernel.*`).

## Run

    python3 .pi/agent/extensions/_lib/doc-render/templates/template.py epicmap in.json out.html

## Input

`{"cache": "<folder holding issues.jsonl, or the issues.jsonl path>", "epic": "KEY"}`. A relative `cache`
resolves against the input file's folder; an absolute path is allowed (local tool). Other keys are dropped;
style keys are refused (see `kernel.md`). The renderer reads the file only: no Jira call, no network.

## Errors

All `error: <field path>: <reason>`, non-zero, no page written: `cache` or `epic` missing or not a non-empty
string; unreadable cache (`cannot read`); epic not in the cache (`is not in`); a bad jsonl line (names the line number).

## Labels

- Derived: node RAG and every KPI count (rule printed in the footer). Measured: status and owner, copied from Jira.
- Each issue shown is a reference `KEY: summary` linking to `JIRA_BASE`; its panel text cites it as `[rN]`.
- The gate is the kernel banner plus `GATE_DETAIL` in `epicmap.py`.

## Recipe

The recipe input holds `epic`, `cache` (folder name only), `issues` (count read) and `read_at` (date of
`issues.jsonl`). No path is embedded. Rebuilding needs the same Jira cache, as well as this renderer.

## Tone

Text read from Jira is not authored here, so hype and jargon checks do not run on it. They do run, in tests,
on text the template generates. The derived headline (`summary: status, but N blockers not started`) is
exempt from the 5-word title rule; a test asserts it names the status.

## Defects fixed

1. KPIs are computed per view in Python (`derived.kpi.top`, `derived.kpi.sub[key]`); the page only renders them. The
   drill view shows deliverables, out of scope and "tracked in Jira", and says why when that is 0.
2. Edge labels get positions in Python (`edges[].lx, ly`), moved along the edge and nudged until no two label
   boxes (6.2px per character, 14px high) meet and none leaves the viewBox.
3. Node titles wrap to 3 lines and are cut only beyond that. `full` holds the whole title; the SVG node has a
   `<title>` child and an `aria-label` with it.

## Not covered
No live Jira fetch, no write-back, no status for deliverables (Jira holds none).
