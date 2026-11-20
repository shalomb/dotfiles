# /doc field report: PIC EKS 1.36 working guide (16 Nov 2026)

Status: feedback, not yet triaged. Source session: a pi agent session that wrote one document for the PIC EKS upgrade (epic TAKOSDSO-117) in `takos-infra-engineering-context`. The user asked for "one nice doc" and needed four rounds and a tooling fix to get it.

## What was asked

A detailed document on scope, timelines, ROAM risks, sources and testing, for engineers first and leadership second, published with `/doc` in the Takeda theme. The user then asked for a working guide rather than a report, then for "crisp" visuals, then for risks, testing patterns with Python excerpts, documentation practice and a QA kit.

## Timeline of what went wrong

| Round | What the agent did | What went wrong | Root cause |
|---|---|---|---|
| 1 | Wrote a `report` from `skeletons/report.md`: tables and prose | Read as a report, not as a guide; flat visually | The skill has no "working guide / playbook" purpose; it does not mention the widgets |
| 2 | Rewrote as `workshop`, still plain Markdown | "Isn't crisp at all" | Same: the agent did not know `::: spine`, `kpis`, `bars`, `compare`, `fold`, `engineers`, `decision` exist |
| 3 | Found the widgets by reading `~/.cache/agent-skills/docs/*/source.md` and `widgets.py`; rewrote | The published page still had no widgets | The agent called `write` and `doc_publish` in parallel; publish rendered the old file. Nothing showed it |
| 3b | Republished | Widgets rendered; the Gantt and flow diagrams still showed as raw text | `mmdc` was installed but its headless Chrome was not. `render_mermaid` returns `None` silently, and `doc_publish` said `Checks: clean` |
| 4 | Installed `chrome-headless-shell` for puppeteer by hand; republished | Worked | |

The user's summary: "I'm asking for one nice doc - why is this so hard?"

## Difficulties, by component

### docs-authoring skill (agent-skills, `skills/docs-authoring/SKILL.md`)

1. **Widgets are not documented.** Section 6 ("Markdown the renderer understands") lists headings, meta lines, GFM and anchors. It does not list the fenced-div widgets in `widgets.py` or the status pills and callouts. This was the single biggest cause of the poor first drafts.
   *Fix:* add a widget table to section 6 with one short example each (`spine`, `kpis`, `bars` with `kill:`, `compare`, `fold`, `engineers`, `decision`, `glossary`, pills `[done]` `[passed]` `[blocked]` `[untested]`, callouts `[RISK — …]`, mermaid with `**Notice:**`). Say when to use each.
2. **Skeletons do not use widgets.** `report.md` and the others are plain Markdown, so following a skeleton produces a flat page.
   *Fix:* each skeleton opens with `::: spine` and `::: kpis`, ends with `::: decision` cards, and puts detail in `::: engineers` folds.
3. **No purpose for a working guide or playbook.** The reader here acts over days (do, test, record), not once. `workshop` and `report` both fit badly.
   *Fix:* add a `guide` (or `playbook`) purpose: focus order, plan with gates, how-to loop, tests, evidence, risks, decisions. Or document `workshop` as covering it.
4. **No pointer to good examples.** The best reference was the library itself (`brief/2026-11-14-connecting-product-teams-to-platform-work/source.md`).
   *Fix:* name one or two exemplar sources per purpose in the skill.
5. **Two audiences in one page is not covered.** The pattern that worked (spine + KPIs + decisions for leadership, `engineers` folds for depth, "Readers:" meta line pointing leadership at sections) is in the exemplar but not in the skill.
   *Fix:* add it to section 4 "Audience and style".
6. **Risk/ROAM tables have no shape.** Several attempts. The version the user accepted had: ID, risk, L/I, early signal, response, owner, ROAM, closed when; plus a `kpis` block counting ROAM states and one `[RISK — …]` callout naming the top three.
   *Fix:* put this table shape in the skill or as a `risks` widget whose counts are derived (principle P3).

### doc_publish / renderer (dotfiles `.pi/agent/extensions/_lib/`)

7. **Silent Mermaid failure.** `story.render_mermaid` returns `None` when `mmdc` fails (here: puppeteer could not find `chrome-headless-shell`), the page falls back to a code block, and `doc_publish` reports `Checks: clean`.
   *Fix:* return a finding `mermaid-not-rendered: <first line of mmdc stderr>`; add a `doctor` check that runs `mmdc` on a one-line chart; document the install (`npx puppeteer browsers install chrome-headless-shell@<version>` from the mermaid-cli folder).
8. **No sign that a widget did not render.** A misspelt or unknown `::: name` passes through as a plain div.
   *Fix:* lint unknown fenced-div classes; after render, report counts ("spine 1, kpis 2, fold 7, decision 4, mermaid 1/1") so the agent and user can see what came out.
9. **Stale render from a race.** Publishing in the same batch as the write rendered the previous file.
   *Fix:* print the source's mtime and a short hash in the publish output; tell the agent in the tool description to publish only after the write has returned.
10. **Brand resolution only by accident.** `~/.config/agent-skills/brands/` has `takeda.css` but no `config.yaml`. The live `doc-publish.ts` falls back to "the only *.css in the folder", so formal style picked Takeda. The feat branch's `brands.py resolve` returns `none` for the same path. Once the branch lands, Takeda docs lose their brand unless a config is written.
    *Fix:* ship a migration or a `doctor` warning when there is no `config.yaml`; document the `~/oneTakeda` → `takeda` mapping.
11. **The lint checks fire on wording, not structure.** Every round passed or failed on `uncited-figure` and `takeaway-unlinked` (fixed by adding footnotes and `§` links). None of the checks noticed a page with no widgets, no diagram, or 250 lines of tables. The checks enforce the principles but not readability.
    *Fix:* add advisory findings: no `spine`/`kpis` on a page over N lines; more than N tables in a row; a section over N lines with no fold.
12. **Purpose changes the library folder and URL.** The first render went to `report/…`, the guide to `workshop/…`; the old one stays in the library with no link to the new one.
    *Fix:* let a later publish say `supersedes=<old id>`, or keep a stable id by source path (principle P15).

### /doc command and prompt

13. **The prompt does not ask about reader and action first.** The user's first message held both (engineers primary, leadership secondary; "what to do"), but the agent read "detailed report" as the purpose.
    *Fix:* have `/doc` echo the purpose it chose and offer `guide` when the request says "what to do", "approach", "playbook", "how to".
14. **Theme request had to be stated.** "Ensure /doc uses the takeda css theme" should be automatic for sources under a Takeda path.
    *Fix:* depends on 10.

## What worked and should be kept

- The widgets themselves: once used, the page was what the user wanted.
- `doc_publish` returning URLs, the brand path and findings in one call.
- The `[CHECK — …]` and `[OPEN — …]` callouts and the measured / derived / judged labels kept the doubt visible without extra prose.
- The `engineers` fold: long Python excerpts were acceptable to the user because they were folded.

## Suggested order

1. Skill: widget table and exemplars (items 1, 2, 4). Cheapest; removes most of the pain.
2. Renderer: Mermaid finding and widget counts (7, 8).
3. Brand config migration before the feat branch lands (10).
4. `guide` purpose and the risk table shape (3, 6).
5. Readability lints and supersedes (11, 12).
