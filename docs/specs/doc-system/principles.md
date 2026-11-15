# /doc principles

Status: proposed. Applies to `/doc`, the `docs-authoring` skill and every template (epic map, readout, decision, status).

A document is an argument that a reader can check. It carries data, claims, hypotheses, risks, solution paths, costs and value, and it lets the reader test each one without trusting the author. Each principle below came from something that went wrong, or went right, while building this system. The "Seen" line says what.

## 1. Claims and evidence

**P1. Every claim has a visible basis.** A claim is a number, a status, a cause or a recommendation. Each one links to its source (ticket, file, query, commit) or says "author's judgement".
*Seen:* a summary said recent commits "address Bart's review findings". Nothing supported it, and it was retracted.

**P2. Say which kind of claim it is.** Three labels, shown on the page: *measured* (a tool produced it), *derived* (computed from measured data by a stated rule), *judged* (a person's reading). Colour and RAG are judged unless a rule is printed.
*Seen:* the epic map's footer states its colour rule. The status mock's grid says "the engineer's reading, not a measurement".

**P3. Derive numbers, never type them.** A count, total or percentage comes from the data on the page, so it cannot drift from the table beside it.
*Seen:* a KPI tile said 2 problems while the table listed 3. It now counts the rows.

**P4. The reader can check it themselves.** Give the path: the command, the file, the ticket id, the date the data was read. "As of" is part of every claim about state.
*Seen:* the delivery doc said "delivered" for four capabilities that no command used. A grep of importers showed it.

## 2. Bias and uncertainty

**P5. Expose bias, don't claim neutrality.** Say who wrote it, what they wanted to be true, what they did not look at, and which option the author prefers. A recommendation is marked as the author's, and the template, not the author, enforces the mark.
*Seen:* the decision template requires exactly one marked recommendation and a reason, and its footer says it is untested.

**P6. Separate known, unknown and untested.** Unknowns are listed as unknowns, not filled with a guess. Suggestions that were never tried say so on the page.
*Seen:* the simulation findings list "unknowns to report, not fill"; options A3 and C3 in the onion mock carry "untested".

**P7. Show what would change the answer.** For each recommendation: the cheapest fact that would flip it, and who holds that fact.
*Seen:* "the one real risk is a hidden user, and one question closes it".

**P8. Keep options open until evidence closes them.** Set-based: list the viable paths with costs and benefits side by side, and prune on evidence, not on enthusiasm.

## 3. Structure the reader can use

**P9. The title is the finding.** A reader who stops at the title still knows the conclusion. "Simulation: X" and "Report: X" are labels, not findings.

**P10. Solution paths carry cost, risk and value.** Each option shows what it costs, what it risks (in ROAM terms: resolved, owned, accepted, mitigated) and what it buys. No option without a downside listed.

**P11. State what is needed, from whom, by when.** A decision doc ends in asks with owners and dates, not in a summary.

**P12. Click for depth, one level at a time.** The page reads in a minute; detail is a click away, and one click deep is enough.

## 4. Reproducible and linked

**P13. A page can say how it was made.** Embed the input, the template and its version, and the audience rules. Don't claim a rebuild needs nothing local when it needs the renderer.

**P14. Link back to anchors.** Cite decisions, specs, tickets and earlier editions as numbered references with titles, and link each citation. An unknown reference is a build error.

**P15. Living docs keep their history.** A new edition never overwrites an old one. A stable id stays the same when the title changes.

## 5. Safety and tone

**P16. The agent never approves.** Every page that proposes an action carries a fixed "nothing here is approved" banner that the author cannot remove. Drafts of outbound text (a reply, a comment) are shown as text for a human to post.

**P17. Frame is fixed, body is free.** The template owns the masthead, banner, brand and validation; the author owns the argument. Brand and theme stay out of the author's hands.

**P18. Plain, calm, specific.** Write for a manager's manager and for the team. Define jargon on the page. No hype words. A little dry wit is fine; a claim of "robust" is not.

**P19. Only as polished as the decision needs.** Prove the shape on one real case before polishing it. Mock first, then lock.

## Checks that follow from these

| Principle | Check a template or the renderer can run |
| :-- | :-- |
| P1, P14 | every cited reference id exists; a "why" block without a citation warns |
| P2 | each KPI and RAG carries a measured, derived or judged label |
| P3 | KPIs are computed from the data, never accepted as input |
| P5, P6 | exactly one recommendation; untested suggestions carry the tag |
| P9 | title rule: 5+ words, not a label prefix |
| P16 | gate banner present, input cannot override it |
| P18 | hype list and jargon-needs-gloss |

Enforced by the templates (`.pi/agent/extensions/_lib/doc-render/templates/kernel.py`): P1, P2, P3, P5, P6, P9, P13, P14, P16, P18. Warned on in Markdown by `doc-lint.ts` (see `lint.md`): P2, P5, P6, P9, P18. Carried in the `/doc` prompt and the `docs-authoring` skill: P1, P2, P5, P6, P18. Not enforced anywhere yet: P4, P7, P8, P10 to P12, P15, P17, P19.
