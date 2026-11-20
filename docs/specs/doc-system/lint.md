# /doc checks and the principles

Status: delivered for Markdown documents. Spec for `_lib/doc-lint.ts`, `_lib/doc-principles.ts` and the rules block in the `/doc` prompt.
The templates enforce the same principles in `doc-render/templates/kernel.py`; see `kernel.md`. The `docs-authoring` skill (agent-skills, `skills/docs-authoring/SKILL.md`, sections 7 and 8) explains them in full.

## One source for the rules

`doc-principles.ts` holds the five rules the checks can speak to, the hype word list, the jargon list and the template hints. The `/doc` prompt, the lint and the tests all read it.
`doc-principles.test.ts` fails if `HYPE_WORDS`, `JARGON_TERMS` or the author-supplied labels drift from `kernel.py`, if the skill's list of banned words differs, or if a template's row in the skill names the wrong purpose.

## What the prompt says

Every Markdown writing prompt (`/doc`, `/doc <purpose>`, and revisions) carries `principleRules()`, about 1,300 characters: cite every claim, label the basis, state what you do not know, mark your recommendation, no hype. The writing prompt also carries `templateGuide()`, which says when to prefer `epicmap`, `readout` or `decision`, and to call `doc_template` first. A template prompt carries neither: the template enforces the rules.

## What the lint warns on (new codes)

| Code | Fires when | Principle |
|---|---|---|
| `hype-word` | a word from the hype list appears in prose (not in code, links or longer words) | P18 |
| `unglossed-jargon` | ALB, ACM, PITR, GSI, TFC, APMS, SG, EBS or ROAM is used without a plain meaning next to its first use | P18 |
| `label-title` | the title starts `Report:`, `Decision:` and similar, or is under four words and not a question | P9 |
| `takeaway-no-basis` | a takeaway has no `(measured)`, `(derived: ...)` or `(judged)` (not for decks) | P2 |
| `no-unknowns` | a report, brief or decision has no unknowns section, limits section or inline `[OPEN — ...]` | P6 |
| `recommendation-basis` | a decision names a recommendation without `Recommended (judged): <option>` | P5 |

All findings are warnings: a document is still rendered and filed. Existing codes are unchanged. Each new rule has a test that fails when the rule is removed (`doc-lint.test.ts`, `doc-principles.test.ts`, `doc-intent.test.ts`).

## Not covered

- P1 beyond figures (a claim with no source is not detected, only figures in takeaways are), P7 and P13 to P15 for Markdown.
- Jargon outside the fixed list, and hype words outside it. The lists are short on purpose; add a word in `doc-principles.ts` and in `kernel.py` together.
- The checks read text. They do not tell whether a label is true.
