---
status: proposed
related: [vision-and-roadmap.md, roadmap.md, decision-tree.md]
---

# /doc profiles: a schema-constrained document frame

## Problem

`/doc` today sends the LLM a prompt and lets it write free-form Markdown. Structure is checked after the fact by `doc-lint.ts`, as warnings. Shape, widgets and theme therefore vary from document to document, and an LLM that decides on its own to write a document may not use the skill at all. The delivery report published on 14 Nov 2026 showed it: a topic title, no table, no widgets, a literal `&amp;` in the heading.

## Decisions (settled with the owner, 14 Nov 2026)

| # | Decision | Choice |
|---|---|---|
| 1 | How strict | **Frame fixed, body free.** The schema pins the frame; section bodies stay Markdown. |
| 2 | How the LLM writes | **Markdown with a front-matter schema.** No JSON tool for writing. |
| 3 | Where profiles live | **Dotfiles repo**, `.pi/agent/extensions/_lib/doc-profiles/`. |

## Design

### One profile per document kind

A profile is a JSON Schema for the front-matter, a Markdown skeleton and a list of required body sections. Initial profiles: `decision`, `report`, `status`, `workshop`, `deck`. Later: `handoff`, `dashboard`, `dossier`.

Front-matter holds the frame, so the renderer builds the page furniture from data, not from prose:

```yaml
profile: report
title: "Four of ten /doc capabilities are libraries no command can reach"   # outcome, not topic
audience: dotfiles maintainer
ask: "One sentence the reader must act on."
status: draft
data_to: 2026-11-14
takeaways:                                   # 3 to 5
  - claim: "Six of ten capabilities are reachable."
    figure: "6 of 10"
    against: "expected 10"
    see: evidence                            # must match a section id
    source: roadmap                          # must match a sources id
decisions:                                   # decision, report asks
  - id: D1
    question: "..."
    owner: maintainer
    decide_by: 2026-11-21
risks: [{ kind: RISK, text: "..." }]
sources:
  - { id: roadmap, label: "Roadmap table", href: "docs/specs/doc-system/roadmap.md" }
```

The body is Markdown below the front-matter. The profile lists required section ids (for a report: `evidence`, `recommendations`, `method`). Widgets in the body (`::: kpis`, `::: bars`, `::: graph`) stay as the existing fenced divs, but the front-matter and the renderer own the masthead, takeaways, decisions, risks and sources.

### One path for humans and LLMs

```
/doc <kind> ...         ->  prompt includes the profile skeleton and schema
LLM decides to write    ->  doc_profile(kind) tool returns the same skeleton and schema
                            |
                  write Markdown with front-matter
                            |
                  doc_publish(source)  ->  validate  ->  render  ->  file
```

- New tool `doc_profile(kind)` returns the skeleton, the schema and the rules for one profile. The `docs-authoring` skill points at it, so the LLM does not have to read the skill text.
- `doc_publish` validates the front-matter against the profile. **Errors block** (missing ask, takeaway without a matching section or source, unknown profile). **Warnings** (tone, figure without a comparison) do not. Every error names the field and the fix.
- The `/doc` command and `doc_publish` use the same validator, so both paths give the same result.

### Theme and brand stay outside the LLM's hands

The brand comes from one resolver, in this order: explicit flag, source path, repo remote domain. `style` stays a separate choice between house and formal. Nothing the LLM writes can pick a corporate stylesheet. The profile never names colours; widgets use theme tokens, including new series tokens for categorical colour.

## Out of scope for the first slice

- Importing existing free-form Markdown or external HTML into a profile.
- The `::: graph` widget and series-colour tokens (tracked separately).
- Changing library isolation by brand.

## Slices

1. **Validator.** Parse front-matter, validate against the `report` schema, cross-reference checks. Tests first, as a pure module.
2. **Profiles for the other four kinds.** Same validator.
3. **Wire into `doc_publish`.** Errors block, warnings do not.
4. **`doc_profile` tool and prompt changes.** `/doc` and the skill point at it.
5. **Renderer reads the front-matter** for masthead, takeaways, decisions and sources; fix the `&amp;` title escaping on the way.

## Open questions

- Is a takeaway's `against` field required, or only warned on? The authoring rules say every number needs a comparison.
- Does `deck` use the same frame, or a slide-per-section profile?
- Should existing documents in the library be re-validated and flagged, or left alone?
