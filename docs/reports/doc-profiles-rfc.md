---
title: "Should /doc fix the frame of every document and leave the argument free?"
eyebrow: "dotfiles · RFC · /doc"
tags: [doc, rfc, decision, schema]
---

# Should /doc fix the frame of every document and leave the argument free?

**Owner:** dotfiles maintainer · **Status:** Proposed · **Decide by:** [OPEN — date]
**Consulted:** none yet · **Data to:** 14 Nov 2026

**The ask in one sentence:** Choose by [OPEN — date] whether /doc documents carry a validated front-matter frame (option B), so that a reader at any level finds the same shape every time.

::: compare
### Today
The model writes freehand. Two reports on one subject differ in title, order and evidence. A shape fault is a lint *warning*, found after writing.
### With a fixed frame
The model fills title, ask, takeaways, decisions, risks and sources. A bad frame is *refused* with the field named. The argument below the frame stays free.
:::

## Takeaways

1. Doing nothing keeps shape dependent on the model's mood: our own delivery report shipped with a topic title, no table and a literal `&amp;` in the heading ([§1](#context))[^1].
2. We recommend option B, a validated front-matter frame over a free body, because it fixes shape without taking away the author's voice ([§3](#recommendation)).
3. The main risk is rigidity: an unusual document may not fit the frame, so the body stays free and the frame can be extended per profile ([§4](#revisit)).

## 1. Context {#context}

/doc turns Markdown into a themed page and files it. Structure is checked after writing by `doc-lint`, and findings are warnings, so a page with a topic title and no takeaways still publishes. When the model decides to write a document on its own, nothing makes it use the skill at all. The 14 Nov delivery report is the evidence: it overstated delivery, cited nothing and rendered a broken title[^1].

The constraint is that readers range from the team to a manager's manager, and the same document must serve both: a one-sentence ask and takeaways for the first minute, evidence and risks for the people who must act.

## 2. Options {#options}

| Option | Consistency | Cost | Risk | Reversible? |
|---|---|---|---|---|
| A. Free Markdown, make lint blocking | Low: rules only catch what they test | Small | Rejects good documents for rule quirks | Yes |
| **B. Front-matter frame, free body** | **High for the frame, free for the argument** | **Medium: a schema and template per kind** | **Frame too rigid for some documents** | **Yes: relax a profile** |
| C. Fully structured, model fills typed fields only | Highest | Large: every section typed | Output reads as a form; hard to tell a story | Costly |
| D. Do nothing | None | None | Inconsistent output continues | n/a |

Cost sizes are relative and are an [assumption].

## 3. Recommendation {#recommendation}

Choose **B**. The one reason that decides it: the frame is what a reader scans (title, ask, takeaways, decisions, risks, sources), and the body is where the author tells the story. Fixing the first and freeing the second gives consistency without a form-like read.

What we give up: some freedom in the masthead and takeaways, and the cost of one profile per document kind. Doing it for `report` first limits that cost.

**Safeguards** that make B safe to adopt, in the way a program would phrase them:

- **Fail closed on the frame, open on prose.** Missing ask or a takeaway pointing at nothing blocks publishing; tone findings stay warnings.
- **One path for people and the model.** `/doc` and a model-initiated document use the same profile and validator, so there is no side door.
- **Brand stays outside the model's hands.** The corporate stylesheet is chosen by path and domain, never by anything the model writes.
- **Definition of done:** a report with a missing ask is refused naming the field; a valid report publishes; doc tests stay green.

## 4. What would change our mind {#revisit}

[RISK — if more than one in five real documents need a frame exception in the first month, the profile is wrong for the work and we relax it or add a second profile.]

[CHECK — a deck is one idea per slide and may need its own frame rather than this one.]

We would also revisit if authors work around the frame, for example by leaving required fields as placeholders, which would show up as validator passes with empty values.

## Decision needed

::: decision
### Adopt a validated front-matter frame for `report` first, then the other kinds?
- **Id:** D1
- **Recommend:** B for `report`, then decision, status, workshop; deck after a separate look.
- **Owner:** maintainer
- **Decide by:** [OPEN — date]
- **Blocks:** the `doc_profile` tool and the renderer changes
:::

If yes, the next step is a validator with tests first. If no, we make lint blocking (option A) and accept lower consistency.

## Sources

[^1]: [Delivery report, as first published, and its rewrite](docs/reports/doc-system-delivery.md)
