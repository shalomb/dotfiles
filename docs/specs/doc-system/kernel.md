# Doc kernel

`.pi/agent/extensions/_lib/doc-render/templates/kernel.py` is the shared core of the doc template types (`readout`, `decision`; the epic map joins later). Stdlib only. It enforces principles P2, P13 and P14 (see `principles.md`). Each type has `<type>.py` (validation, `derive()`, `TEMPLATE`, `GATE_DETAIL`) and `<type>.html`; the shared styles and script are `kernel.css` and `kernel.js`.

## Run

    python3 .pi/agent/extensions/_lib/doc-render/templates/template.py <readout|decision> in.json out.html

`template.py` works from any directory. An unknown type or bad arguments print `error: ...` and exit non-zero.

## Shared rules
- Tone: `HYPE_WORDS` and `JARGON_TERMS` live here. Jargon needs a glossary entry. A title states a finding: 5+ words, not starting `Simulation:`, `Report:` or `Decision:`.
- Gate: `build_page` renders the banner "Nothing here is approved." plus the module's `GATE_DETAIL`. Templates hold only `__GATE__`; input cannot change it, and unknown keys such as `gate` are dropped.
- Placeholders filled by `build_page`: `__TITLE__`, `__DATA__`, `/*__KERNEL_CSS__*/`, `/*__KERNEL_JS__*/`, `__GATE__`, `__RECIPE__`.
- Style keys: `reject_style_keys` runs before anything is rendered. Any key named `brand`, `theme`, `style`, `styles`, `css`, `stylesheet`, `color`, `colour`, `colors`, `colours`, `font`, `fonts` or `palette` (any depth, any case) fails: `error: <field path>: brand, theme and styling are not part of the input`.

## References (P14)
- Input `refs`: list of `{id, title, href, kind}`. Optional. `id` looks like `r1`; `kind` is `decision`, `spec`, `ticket`, `source` or `edition`.
- `href` is a relative path or an `https://` URL, kept as data and never fetched. Absolute paths and other schemes are rejected.
- Free text cites with `[r1]`. A citation to an unknown id fails the build: `error: <field path>: unknown reference 'r9'`. Duplicate ids, bad kinds and bad hrefs are rejected naming the field.
- Refs are numbered by first citation in input order. Uncited refs go last, tagged "also relevant".
- The page script turns each citation into a link to `#ref-N` (DOM nodes only, never `innerHTML`). The References section links each title and has a back-link to the first citation.

## Claim labels (P2, P3)
- Every KPI and status shows `measured`, `derived` or `judged`.
- Numbers the renderer computes (plan counts, days left, counts) are `derived`, set by the renderer in `derived_basis`. The input cannot supply or change that.
- Author-supplied facts (decision `facts[]`, readout node `rag`) must carry `basis` of `measured` or `judged`. Missing or any other value fails naming `<field>.basis`.

## Recipe (P13)
- Embedded as `<script type="application/json" id="recipe">`, with `<` escaped as `\u003c`.
- Fields: `template`, `renderer_file` (base name only), `renderer_sha256` (renderer module, `kernel.py`, `kernel.css`, `kernel.js` and the template html), `input` (the input JSON, verbatim), `rebuild`, `note`.
- `rebuild` is `python3 doc-render/templates/template.py <type> in.json out.html`. The note says the page alone is not enough: a rebuild needs the renderer.
- The page shows template, the first 12 hash characters and the rebuild command in a collapsed "How this page was made". No absolute or home paths are embedded.

Tests: `tests/doc/test_doc_templates.py` (shared contract, every type), `tests/doc/test_doc_kernel.py` (kernel units).
