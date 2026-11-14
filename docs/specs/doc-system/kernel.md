# Doc kernel

`docs/prototypes/doc_kernel.py` is the small shared core of `readout_render.py` and `decision_render.py`. Stdlib only. It enforces principles P2, P13 and P14 (see `principles.md`); the renderers still own their own schema and tone rules.

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
- Fields: `template`, `renderer_file` (base name only), `renderer_sha256` (renderer source + `doc_kernel.py` source), `input` (the input JSON, verbatim), `rebuild`, `note`.
- `rebuild` is `python3 docs/prototypes/<renderer>.py in.json out.html`. The note says the page alone is not enough: a rebuild needs the renderer.
- The page shows template, the first 12 hash characters and the rebuild command in a collapsed "How this page was made". No absolute or home paths are embedded.
- The hash covers the renderer and the kernel, not `readout_render.py` when `decision_render.py` imports from it.

Tests: `tests/doc/test_doc_kernel.py`, run against both renderers.
