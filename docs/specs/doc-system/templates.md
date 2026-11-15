# Doc templates

Status: three template types on one kernel (`readout`, `decision`, `epicmap`). Sibling of `kernel.md`, `readout.md`, `decision.md`, `epicmap.md`.

## Where they live

`.pi/agent/extensions/_lib/doc-render/templates/`: `kernel.py`, `kernel.css`, `kernel.js` (shared); one `<type>.py` and `<type>.html` per type; `template.py` is the dispatcher. Tests: `tests/doc/` (`test_doc_templates.py` is the contract every type runs; `test_<type>.py` hold the rest).

## Registry and dispatcher

    python3 .pi/agent/extensions/_lib/doc-render/templates/template.py <type> in.json out.html

`template.py` holds `REGISTRY`, a map from type name to module in the same directory. It reads the JSON, rejects style keys, calls `module.build(doc)` and writes one page. Any failure prints `error: <reason>` and writes nothing. A module with `NEEDS_BASE = True` also gets the input's folder.

## Adding a template

1. Add `<type>.py` (`build(doc)`) and `<type>.html`; add the type to `REGISTRY` and to `TEMPLATES` and `CASES` in `test_doc_templates.py`.
2. Style keys (brand, theme, css, font, colour, palette) are rejected by `kernel.reject_style_keys`; do not read them.
3. The gate "Nothing here is approved." comes from `kernel.build_page`; input cannot change it.
4. Tone: all author prose goes through `check_tone` (hype words, unglossed jargon, label-style titles), including date labels, ref titles and conflict labels. The lists are pinned in `test_doc_templates.py`; changing one means editing both.
5. References: author citations `[r1]` go through `check_refs` and are numbered by first citation.
6. Labels: every computed number is `derived`; author facts carry `measured` or `judged`.
7. The embedded recipe holds the validated input (known fields only; a cache is kept by folder name), `href` must be `http(s)` or relative, and private paths in any key or value are rejected except the `PATH_FIELDS` of the module; Jira text is redacted instead, and the finished page is gated (the rule and its three checkpoints are in `kernel.md`) and a hash over `kernel.*` and the type's files.
8. Mobile and print: the page needs the `@media (max-width:768px)` and `@media print` blocks (kernel.css has them). Wide diagrams go in `.mapwrap`. A sticky or fixed bar must be static below 768px.
9. No network, no `innerHTML`, no external `src` or `href`.
10. The shared contract tests must pass for the new type; skips need a written reason.

## Defects fixed

| ID | Defect | Pinned by |
| :-- | :-- | :-- |
| D1 | Epic map KPIs wrong per view | `test_epic_map.py`, section D1 (wave 2, `epicmap.md`) |
| D2 | Epic map edge labels overlap | `test_epic_map.py`, section D2 (wave 2) |
| D3 | Epic map titles cut short | `test_epic_map.py`, section D3 (wave 2) |
| D4 | Readout map unreadable and plan counter covering content at 390px | `test_readout.py` `test_phone_*`, `test_desktop_plan_counter_*` (headless browser) |
| D5 | Decision dates in ISO; "days to" label special-cased for `renews` | `test_decision.py` `test_dates_are_shown_in_words_not_iso`, `test_the_tile_and_the_bar_end_*`, `test_label_is_a_short_noun_phrase` |
| D6 | Hype-word test ran over the list it checked | `test_doc_templates.py` `test_hype_word_list_is_pinned`, `test_jargon_term_list_is_pinned` |
| D7 | `&` in a markdown title shown as `&amp;amp;` | `doc-render/tests/test_cli.py` `test_an_ampersand_in_*title_is_escaped_once` |
| D8 | `::: bars` dropped the last bar when a caption followed it | `doc-render/tests/test_widgets.py` `test_a_caption_*_keeps_*` |

All of D4 to D8 reproduced and were fixed in one commit (`fix: pin the tone lists and fix readout mobile layout, ...`).

## Reaching the templates

The three types are reachable the same way the Markdown purposes are: one tool, one command, one library.

- **`doc_publish` with `template`.** `template` is `epicmap`, `readout` or `decision`; `source` is then the structured input (a JSON file), not Markdown. The page is written to `<downloads>/<json file stem>.html` and filed in the library. The Markdown lint is skipped (`findings` is empty): the renderer enforces its own rules and answers a bad input with `error: <field path>: <reason>`, which `doc_publish` returns as its error. Calls without `template` behave exactly as before.
- **Purpose and kind.** They come from the type: `decision` files as `decision`, `readout` as `report`, `epicmap` as `status`. A `purpose` that differs is refused with `template <type> files as purpose <p>`.
- **`/doc <type> <input.json> [formal]`.** When the second word ends with `.json` and the file exists, the page is published directly, with no model, and the urls and any brand line are shown like the tool does. Renderer errors are shown as errors. Otherwise `/doc epicmap [topic]` and `/doc readout [topic]` ask the model to write the input and publish it. `decision` is also a purpose word, so `/doc decision [topic]` still writes a Markdown decision; use `/doc decision template [topic]` for the structured one.
- **`doc_template {type}`.** Read-only: returns the purpose the type files as, a valid example input and the pointer to this file. The same example is `template.py --example <type>` (files in `doc-render/templates/examples/`); `template.py --list` prints the types as a JSON array. `_lib/doc-templates.ts` keeps the same list, and a test compares the two.
- **Brand, nav and provenance** apply after rendering, as for Markdown: `nav` injects the navigation style; `style: formal` injects the brand stylesheet found for the input path (`<style id="doc-brand-css">`), and the corporate-context brand css is injected the same way; `prompt` adds the folded provenance block. The page then holds two blocks: the kernel's `#recipe` (the input and the rebuild command) and the provenance block (the request and parameters). Both are free of absolute paths, the home folder and temp folders (template pages mask `os.tmpdir()`, `/tmp`, `/var/folders` and `/private/var` as well). Brand and theme are never read from the input: a style key is rejected with its field path.
- **Library limitation.** `fileDoc` ties a document's origin to its `source`, so the library keeps the JSON input as the source copy, not Markdown. The library shows its text and the page's lede as summary (the caller's `summary` wins); `doc-library.ts` is unchanged.

Not covered: there is no live Jira fetch (`epicmap` reads a local cache folder only), and the pointer from the docs-authoring skill to these types is still missing.
