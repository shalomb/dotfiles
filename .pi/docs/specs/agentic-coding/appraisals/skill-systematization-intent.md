# Intent: systematizing skills with higher-order skills

- **Type:** Intent note. It records a direction to explore. It is not a decision and not a spec.
- **Date:** 2026-11-02
- **Sits beside:** the other documents in this directory (see `README.md`)
- **Changes made by this note:** None. No skill, spec or ADR is touched.

## Intent

The skills grew organically. The aim is to give them structure, perhaps with meta or higher-order skills,
so that a cohort of agents arranged in a topology is focused on reaching a `/goal`.

## Problem to diagnose first

The right meta-skill depends on what is failing today:

| Symptom | Likely need |
|---|---|
| Wrong skills fire | A curator that finds colliding triggers and overlapping descriptions |
| The right skill does not fire | A router |
| The cohort drifts from the goal | A shared frame, which `goal.md` already partly provides |

Which symptom applies is not yet known.

## Observations

- Skills seem to be at least four kinds: capability (for example `adzic-bdd`), role or persona (Marge, Lisa,
  Bart), flow (`design-thinking`) and tool wrapper. A meta-skill would treat each kind differently.
- A deterministic router is a checkable claim, because it can have golden tests such as "given this goal kind
  and phase, this bundle loads". An LLM-judged router is an unchecked claim.
- The dotfiles history includes the commit `feat(pi): add skill-tier signals and drop modern-cli from tier1`.
  It has not been read for this note. It may overlap with any tiering or routing idea.
- Each loaded skill uses context (ADR-005). A meta-skill should load pointers and pull bodies in only when
  needed, as `design-thinking` does with its just-in-time skill gate.
- Passing the same `goal.md` to every role gives the cohort one frame, and each role adds its own lens.

## Higher-order skill candidates

| Candidate | Purpose |
|---|---|
| Cohort composer | Given a goal and its phase, names the roles, each role's skill bundle and its authority limits |
| Phase flow | Ties active skills to goal state: draft, active, closed |
| Curator or auditor | Finds overlapping triggers, stale descriptions and oversized bodies |

## Not intended

- A new LLM-judged layer with no way to test it.
- Adding schema or machinery before H5 reports.
- Replacing skills that work.

## Open questions

1. Is a taxonomy tag in skill front matter the cheapest useful first step?
2. Does the skill-tier work already cover part of this?
3. Do the persona skills (Marge, Lisa, Bart) and the Copilot, Builder and Critic roles describe one design or two?

See `role-to-skill-mapping-draft.md` and `open-decisions.md`.
