# Readout template

A structured read-out (JSON) becomes one self-contained HTML page: headline finding,
KPI strip, layer map, problem, set-based options with a live plan count, needs, ROAM
risks, a fixed gate banner and a footer. Look and behaviour follow `docs/prototypes/onion-state.html`.

## Run

    uv run python docs/prototypes/readout_render.py in.json out.html
    uv run pytest tests/doc/test_readout.py -q

A worked input lives at `tests/doc/fixtures/readout/sample.json` (synthetic scenario).

## Input

- `meta`: `eyebrow`, `title`, `lede`, `asof`, `foot` (all required strings).
- `layers`: list of column names.
- `nodes[]`: `id`, `layer` (index into `layers`), `kind`, `title`, `rag` (`R|A|G|N`), `plain`;
  optional `needs`, `feeds` (choice ids). Nodes stack in a column in input order.
- `conflicts[]`: `a`, `b` (node ids), `label`. Drawn as red dashed edges.
- `links[]`: `[a, b]` node-id pairs. Drawn as plain edges.
- `problem`: one string.
- `choices[]`: `id`, `question`, `why`, `options[]` (at least 2): `id`, `title`, `pro`, `con`;
  optional `suggestion: true`.
- `needs[]`: `need`, `from`, `settles`.
- `risks[]`: `risk`, `roam` (`RESOLVE|OWN|ACCEPT|MITIGATE`), `action`.
- `glossary` (optional): `{term: plain meaning}`.

## Rules the renderer enforces

Any failure prints `error: <field>: <reason>` and exits non-zero; no page is written.

- Required fields present; indexes, ids, `rag` and `roam` values valid.
- No hype words (whole word, any case); the list is `HYPE_WORDS` in the script.
- Jargon needs a gloss: a term in `JARGON_TERMS` found in any text field must be a
  `glossary` key. The glossary shows as "In plain words" at the page foot.
- `meta.title` is a finding: at least 5 words, not starting `Simulation:` or `Report:`.
- A `suggestion` option shows a visible tag; the footer says suggestions are untested.

## Fixed in the template

The gate banner ("Nothing here is approved." plus the read-only line) is template text.
Input keys named `gate`, anywhere, are never copied to the page. The page makes no
network calls, uses no `innerHTML`, and has no external `src` or `href`.

## Plan count

Product over choices of the options not yet pruned. Click prunes, double-click chooses.
KPIs (layers, conflicts, choices, plans) come from the data.
