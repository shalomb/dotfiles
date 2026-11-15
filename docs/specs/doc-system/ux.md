# Document UX: adaptive nav, mobile and print

## What adapts

- **Rendered docs** (`doc-render/build.py`, doc and deck modes): the contents nav is
  `nav.doc-nav[data-nav-layout="sidebar|floating|hidden"]`.
  - Desktop at the top of the page: `sidebar`.
  - Scrolled `>= SCROLL_FLOAT_PX`, or after the toggle button: `floating` (sticky bar).
  - Viewport `<= MOBILE_MAX`: always `floating`.
  - `?present` or the in-page present mode: `hidden`.
- **Readout and decision templates** (`.pi/agent/extensions/_lib/doc-render/templates/kernel.css`, shared): a
  `@media (max-width:768px)` block (single-column grids, smaller h1, tables scroll
  sideways) and an `@media print` block (white, black text, nothing sticky, controls
  hidden, cards not split, gate banner and references kept, "How this page was made"
  opened for print).

## Constants

`MOBILE_MAX = 768` and `SCROLL_FLOAT_PX = 80` live in
`.pi/agent/extensions/_lib/doc-nav.ts` (source of truth, with `resolveNav` and `navCss`).

## Mirroring rule

`build.py` cannot import TypeScript, so it copies the numbers, the layout logic and the
`navCss` rules (only the sidebar rule differs: it keeps the page grid instead of
`position: fixed`). `kernel.css` hard-codes 768 in its media query.
`tests/doc/test_doc_ux.py` reads the numbers from `doc-nav.ts` and fails if `build.py`
or a template differs. Change the TS first, then the mirrors.

## Not covered

No browser test: layout switching, sticky behaviour and print output are checked only by
asserting the emitted CSS/JS text (and that the script parses under node). Content is
unchanged: a test compares `<main>` with and without `--no-adaptive-nav`.
