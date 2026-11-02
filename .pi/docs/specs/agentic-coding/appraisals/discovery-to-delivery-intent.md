# Intent: connecting discovery to delivery

- **Type:** Intent note. It records a direction to explore. It is not a decision and not a spec.
- **Date:** 2026-11-02
- **Sits beside:** `goal-system-intent-layers-appraisal.md` (same directory)
- **Changes made by this note:** None. No code, spec or ADR is touched.

## Intent

Product ownership and stakeholder work, such as discovery, story mapping and release slicing, should feed
`/goal` rather than sit beside it. Discovery would run in one session and produce starting material.
Delivery would then run in a fresh session, where `/goal` is used again for each slice.

## Why this is worth recording

- The spec starts from "the driver sets the goal". It does not say how the outcome was found.
- The `design-thinking` skill already runs discovery: a Jobs-To-Be-Done intake, a decision tree, falsifiable
  hypotheses, and a handoff of glossary, scenarios, ADRs, anti-goals and tracer-bullet tickets.
- The `marge-product-agent` skill covers user advocacy and the release boundary.
- The two are not connected to `/goal`. The tree's `Goal:` line, its anti-goals and its hypotheses
  have no link to `goal.md`.

## Observations (from reading, not from running anything)

- The long-horizon and mid-execution stances in `design-thinking` already match a discovery session and
  a delivery session.
- A hypothesis with a pass or kill threshold is close to a fail-first done-check.
- Handoff scenarios could be what a delivery goal's check runs, which relates to P5 in the appraisal.
- Neither skill models several stakeholders, personas, or a value-ordered story map.

## Open questions

1. Is discovery a goal that closes, or a standing activity that produces goals?
2. What closes a discovery goal if agreement alone is a weak signal?
3. Who is the driver when stakeholders are plural and may disagree?
4. Extend `design-thinking` with a stakeholder and story-map round, or keep that separate?
5. Where should story maps live: in the repo, or in notes linked from `spec_links`?

## Not intended

- Turning `/goal` into a product management tool.
- Adding schema before the basic goal flow has been used and measured (H5).
- Adding another persona before checking what `design-thinking` and Marge already cover.

## Related points in the appraisal

P1 (goal hierarchy), P2 (quality attributes), P4 (typed links), P5 (done-check tied to scenarios).
