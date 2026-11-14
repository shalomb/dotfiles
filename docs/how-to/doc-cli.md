# How to find and inspect filed documents with `doc`

`doc` is a headless, read-only CLI over the `/doc` library. It reads
`index.json` and each document's `meta.json`. It never changes the library.
Slice context: [vision-and-roadmap](../specs/doc-system/vision-and-roadmap.md), section 2.

## Library root

`doc` uses the first of these that is set:

1. `DOC_ROOT`
2. `LEAD_DOCS_ROOT`
3. `$XDG_CACHE_HOME/agent-skills/docs` (default `~/.cache/agent-skills/docs`)

This matches `docRoot()` in `.pi/agent/extensions/_lib/doc-library.ts`.
If `index.json` is missing, `doc` prints an error and exits 1.

## Commands

```bash
doc find <query...>                 # all words must match title, summary, kind, repo, date or tags
doc list [--tag T] [--kind K]       # newest first
doc origin <ref>                    # repo, worktree and origin source path
doc source <ref> [--open]           # print source.md, or open it in $VISUAL/$EDITOR
doc export <ref> --zip [-o FILE]    # pack index.html, source.md, assets and meta.json
```

`<ref>` is one of: the document id (its directory name, e.g. `2026-11-14-connecting-product-teams`),
`kind/id`, a unique id prefix, a unique substring of the id or title,
or a path to the document's `index.html` or directory.

## Output formats

- Default: an aligned table.
- `--paths` (`-p`): one path per line, for `xargs` or `fzf`.
- `--json`: machine-readable JSON. Cards carry `id` and `abs_path`.

```bash
doc list --tag takos --paths | fzf | xargs xdg-open
doc find postgres --json | jq -r '.[].title'
doc origin database-decision --paths
```

## Export

`doc export <ref> --zip` writes `<id>.zip`. The default folder is
`<DOC_ROOT>-exports/` next to the library, for example `~/.cache/agent-skills/docs-exports/`.

- The zip holds `index.html`, `source.md` (if stored), `assets/` and `meta.json`.
- Old `versions/` are left out.
- `meta.json` keeps only the file name of `origin`, so no private absolute path leaves the machine.
- `doc` refuses to write inside a git tree and exits 2. Pick another `-o`.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | success |
| 1 | no index, no matching document, or no `source.md` |
| 2 | ambiguous ref, `export` without `--zip`, or export target inside a git tree |

## Tests

```bash
uv run pytest tests/doc -q
```

The tests build a temporary `DOC_ROOT`. They do not touch the real library or network.
