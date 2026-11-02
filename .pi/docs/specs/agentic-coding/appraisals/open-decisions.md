# Open decisions

Goal: Decide how discovery, goals, skills and agent topology fit together without adding machinery too early.
Stance: long horizon

- **Type:** Decision log in the decision-tree format from the `design-thinking` skill. Every node is open
  unless marked otherwise. Nothing here is settled by this document.
- **Date:** 2026-11-02
- **Owner of all decisions:** unop

## Goals and layers of intent

- [open] goal.hierarchy -- Should goals have a parent link, and when should a goal be split?
    Reason: one goal per branch today; ADR-008 lists the spanning case as a revisit criterion. Appraisal P1.
- [open] goal.quality-attributes -- Should a goal carry quality attributes, each with a fitness-function check?
    Reason: goals can close green while violating a quality constraint. Appraisal P2.
- [open] goal.typed-links -- Should `spec_links` be typed and checked?
    Reason: free text cannot be validated, so drift goes unseen. Appraisal P4.
- [open] goal.check-covers-scenarios -- Should a done-check be tied to the scenarios that define the goal?
    Reason: a green check can exclude the scenarios that matter. Appraisal P5.
- [deferred] goal.check-strength -- Add mutation scoring of the check.
    Reason: ADR-009 defers this until the H5 measurement (2026-12-15). Appraisal P6.

## Discovery and product ownership

- [open] discovery.is-a-goal -- Is discovery a goal that closes, or a standing activity that produces goals?
- [open] discovery.closing-signal -- Does a discovery goal close on agreement, or on a verdict (hypothesis pass or kill)?
- [open] discovery.stakeholder-model -- Does the system need to record whose needs the driver represents?
- [open] discovery.skill-home -- Extend `design-thinking` with a stakeholder and story-map round, or keep it separate?
- [open] discovery.artifact-home -- Do story maps live in the repo, in notes, or both?

## Planes and topology

- [open] plane.critic-split -- Should the Critic be split into a gate (flow plane) and a review (execution plane)?
- [open] topology.record-in-goal -- Should the goal record the chosen topology and the reason?
    Reason: it would make each choice reviewable, and it would give H5 a variable to compare.
- [open] topology.chooser -- Is a deterministic chooser worth building, or are named conventions enough?

## Skills

- [open] skills.persona-vs-topology -- Do Marge, Lisa and Bart and the Copilot, Builder and Critic describe one design or two?
- [open] skills.taxonomy-tags -- Should skills carry a kind tag (capability, role, flow, tool)?
- [open] skills.tier-overlap -- Does the skill-tier commit already cover routing or tiering?
    Reason: commit named `feat(pi): add skill-tier signals ...`; not yet read.
- [open] skills.role-mapping-home -- Should the role-to-skill mapping stay as prose or become machine-readable?
    Reason: the MoE focus mentions a `skill-register.json`, which has not been checked.

## Evidence still needed

- H5 (2026-12-15) is the project's own measurement of whether `/goal` helps. Several nodes above wait on it.
- The skill bodies for `meeting-notes`, `to-tickets`, `test-accordion` and `test-design-review` have not been read.
