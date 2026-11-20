# Doc kernel

`.pi/agent/extensions/_lib/doc-render/templates/kernel.py` is the shared core of the doc template types (`readout`, `decision`, `epicmap`). Stdlib only. It enforces principles P2, P13 and P14 (see `principles.md`). Each type has `<type>.py` (validation, `derive()`, `TEMPLATE`, `GATE_DETAIL`) and `<type>.html`; the shared styles and script are `kernel.css` and `kernel.js`.

## Run

    python3 .pi/agent/extensions/_lib/doc-render/templates/template.py <readout|decision|epicmap> in.json out.html

`template.py` works from any directory. An unknown type or bad arguments print `error: ...` and exit non-zero.

## Shared rules
- Tone: `HYPE_WORDS` and `JARGON_TERMS` live here. Jargon needs a glossary entry. A title states a finding: 5+ words, not starting `Simulation:`, `Report:` or `Decision:`.
- Gate: `build_page` renders the banner "Nothing here is approved." plus the module's `GATE_DETAIL`. Templates hold only `__GATE__`; input cannot change it, and unknown keys such as `gate` are dropped.
- Placeholders filled by `build_page`: `__TITLE__`, `__DATA__`, `/*__KERNEL_CSS__*/`, `/*__KERNEL_JS__*/`, `__GATE__`, `__RECIPE__`.
- Style keys: `reject_style_keys` runs before anything is rendered. Any key named `brand`, `theme`, `style`, `styles`, `css`, `stylesheet`, `color`, `colour`, `colors`, `colours`, `font`, `fonts` or `palette` (any depth, any case) fails: `error: <field path>: brand, theme and styling are not part of the input`.

## References (P14)
- Input `refs`: list of `{id, title, href, kind}`. Optional. `id` looks like `r1`; `kind` is `decision`, `spec`, `ticket`, `source` or `edition`.
- `href` is an `http(s)` URL with a host, or a relative path, kept as data and never fetched. Any control character or whitespace (U+0000 to U+0020, U+007F to U+009F, U+2028, U+2029) rejects it, because browsers strip those and then run what is left. Other schemes (`javascript:`, `data:`, `file:`, any case), `//host`, backslash starts and absolute or `~` paths are rejected: `error: refs[0].href: href must be an http(s) link or a relative path`.
- Free text cites with `[r1]`. A marker written `\[r1]` is literal text (the epic map escapes Jira text this way, so only its own markers cite). A citation to an unknown id fails the build: `error: <field path>: unknown reference 'r9'`. Duplicate ids, bad kinds and bad hrefs are rejected naming the field.
- Refs are numbered by first citation in input order. Uncited refs go last, tagged "also relevant".
- The page script turns each citation into a link to `#ref-N` (DOM nodes only, never `innerHTML`). The References section links each title and has a back-link to the first citation.

## Claim labels (P2, P3)
- Every KPI and status shows `measured`, `derived` or `judged`.
- Numbers the renderer computes (plan counts, days left, counts) are `derived`, set by the renderer in `derived_basis`. The input cannot supply or change that.
- Author-supplied facts (decision `facts[]`, readout node `rag`) must carry `basis` of `measured` or `judged`. Missing or any other value fails naming `<field>.basis`.

## Recipe (P13)
- **Private paths: one classifier, three checkpoints** (`private_tokens`, `has_private`, `redact` in `kernel.py`; spec test `tests/doc/test_doc_paths.py`). Text is decoded first (HTML entities, percent-encoding, `\uXXXX`, NFKC, up to three rounds; backslashes read as slashes) and split into tokens. A token is a **private path** if it holds this machine's home, temp dir, the input's folder or the working directory (and their real paths); or is a `file:` URL, a UNC path (`\\host\share`, `//host/share`), a drive path (`C:\`, `d:/`) or `~/…` and `~user/…`; or holds a personal-location marker (`/home`, `/Users`, `/root`, `/tmp`, `/var/folders`, `/private`, `/mnt`, `/media`, `/Volumes`, `/run/user`) with at least one more segment (inside a longer token it needs two more, so `docs/home/guide.md` passes). **Never private:** an http(s) link with a host (its path is not judged), a bare mention (`/tmp`, `the /tmp/ directory`, `/home`) and system paths (`/etc/nginx/x`, `/usr/bin/env`, `/var/log/x`).
  1. **Input**, in the dispatcher: every key and value at any depth, glossary terms included, fails with `error: <field path>: private paths are not allowed in a document` (`(key)` is added for a key). Only the values of a module's `PATH_FIELDS` (epic map: `cache`) are exempt; the cache location is never embedded.
  2. **Derived text**: text read from the Jira cache is redacted to `\u2039local path\u203a`, not rejected, because the author cannot edit Jira. The count is `derived.redactions` and the page foot says how many were removed.
  3. **The finished page** is the authority: after the build, `gate_page` checks the recipe, `DATA` and the visible text and fails with `error: final page: a private path survived in <recipe|DATA|page text>`. A hit here is a renderer bug, so it fails and nothing is written; it is never silently redacted. `template.py --check-page FILE` runs the same gate; `template.py --redact` redacts stdin. `doc_publish` redacts the prompt and sources of a template page through `--redact` before embedding them, and runs `--check-page` after nav, brand and provenance are in (template pages only; the Markdown path is unchanged).
  **Does not catch:** exotic encodings such as base64, paths drawn inside images, or paths spelled out in words.
- The recipe `input` is the validated, normalised input only: each renderer's `SCHEMA` lists its known keys and `keep_known` drops the rest before checks, page and recipe.
- Tone covers all prose the author supplies, including `deadline.date_label`, `deadline.ask_by_note`, ref titles and readout conflict labels; only dates, ids and enum values are exempt.
- Optional fields are type-checked (`error: nodes[0].needs: must be text`); `cite()` in the page tolerates a non-string.
- Embedded as `<script type="application/json" id="recipe">`, with `<` escaped as `\u003c`.
- Fields: `template`, `renderer_file` (base name only), `renderer_sha256` (renderer module, `kernel.py`, `kernel.css`, `kernel.js` and the template html), `input` (the input JSON, verbatim), `rebuild`, `note`.
- `rebuild` is `python3 doc-render/templates/template.py <type> in.json out.html`. The note says the page alone is not enough: a rebuild needs the renderer.
- The page shows template, the first 12 hash characters and the rebuild command in a collapsed "How this page was made". No absolute or home paths are embedded.

Tests: `tests/doc/test_doc_templates.py` (shared contract, every type), `tests/doc/test_doc_kernel.py` (kernel units).
