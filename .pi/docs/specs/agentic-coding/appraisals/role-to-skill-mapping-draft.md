# Role-to-skill mapping (draft)

- **Type:** Advisory mapping. It records a proposal and changes nothing.
- **Date:** 2026-11-02
- **Sits beside:** `goal-system-intent-layers-appraisal.md`, `discovery-to-delivery-intent.md`
- **Basis:** Roles come from `GLOSSARY.md`, `goal-contract.feature` and the ADRs. Skill fits come from
  skill descriptions only, except `design-thinking` (read in full) and `marge-product-agent` (read in part).
  Treat each "candidate" as a guess until the skill body has been read.

## How to read this

- **In use:** the spec or an existing skill already names the link.
- **Candidate:** the description suggests a fit that nobody has checked.
- **Gap:** no skill found for the need.

## Roles

| Role | What it does (source) | Skills in use | Candidate skills | Gap |
|---|---|---|---|---|
| **Human Partner** (driver) | Sets the outcome, confirms and locks done-checks, approves changes (feature file, ADR-009) | none, it is a person | `meeting-notes` (turn stakeholder conversations into recorded decisions) | Stakeholder model: nobody records whose needs the driver represents |
| **Discovery / product** (not a named role in the spec) | Finds the outcome, frames problems, writes first scenarios | `design-thinking`, `domain-modeling`, `adzic-bdd` | `marge-product-agent` (Feature Brief, scenario authorship) | A story map and value-ordered release slicing |
| **Planner** (not a named role in the spec) | Breaks a design into slices | `design-thinking` handoff (tracer-bullet tickets) | `to-tickets` (tickets with blocking edges), `lisa-planning-agent`, `iteration-planner` | Link from a ticket to a parent goal (appraisal P1) |
| **Main Copilot** | Partners with the human on intent and oversees delivery (GLOSSARY) | `todo-navigator`, `architecture-decision-records`, `c4-architecture`, `using-git-worktrees` | `verification-before-completion` (evidence before claims, matches `/goal done`) | none found |
| **Wave Scheduler** | Deterministic `todo batch` step, at most 3 disjoint tasks per wave (GLOSSARY) | none, it is code, not an agent | none | none, and it should stay deterministic |
| **Builder** (Task Run) | One task, one worktree, one commit (GLOSSARY) | `test-driven-development`, `farley-tdd`, `git-commit-formatter` | `test-accordion` (fast inner loop, full outer loop) | none found |
| **Critic Gate** | Rebases a batch, runs deterministic and adversarial checks (GLOSSARY, ADR-004) | `verify-receipt` (named in the glossary) | `bart-adversarial-reviewer`, `test-design-review` (test quality against Farley and Adzic) | Mutation scoring of check strength (appraisal P6) |
| **Intent Governor** | Filters findings and prunes inventory by convergence (ADR-007) | `todo-navigator` | none | none found |
| **Learning loop** | Turns execution evidence into backlog, defect and rule changes (ADR-006) | `lessons-learned` (the spec runs a lessons capture on `/goal done`) | `git-forensics` (risk areas from history) | none found |
| **Debugging** | Diagnoses failures | `systematic-debugging` | `test-accordion` (contract scope to a unit after a regression) | none found |

## Observations

- **Three skills read like a persona pipeline:** `marge-product-agent` (product), `lisa-planning-agent`
  (planning) and `bart-adversarial-reviewer` (adversarial review). The spec uses other names for similar
  jobs: Main Copilot, Builder and Critic Gate. I have not checked whether these are two models of one
  design or two separate designs.
- **Strongest candidate fits:** `meeting-notes` (stakeholder provenance), `to-tickets` (slicing with blocking
  edges), `test-accordion` (tiered done-checks) and `test-design-review` (an interim check-strength review).
- **Two roles have no named owner:** discovery and planning exist only as skills used by `design-thinking`.
  The spec describes delivery roles and not the upstream ones.
- **Wave Scheduler is code:** adding a skill there would work against ADR-001's deterministic design.

## Open questions

1. Is the persona pipeline the same model as the Main Copilot, Builder and Critic topology, or a separate one?
2. Should discovery and planning become named roles in the spec, or stay inside `design-thinking`?
3. Should this mapping live as prose only, or as a machine-readable registry that `/goal` could read? The
   MoE focus mentions a `skill-register.json`. I have not looked at it, so I do not know whether it fits.
4. Who decides which candidate skills to adopt, and on what evidence? The spec's H5 measurement is the
   nearest existing mechanism.

## Limits

- Fits are from descriptions, so some candidates may not suit the role once their bodies are read.
- The list of skills is incomplete. I searched descriptions with keyword filters and may have missed some.
- The mapping is a snapshot. Skills change, and nothing here keeps it current.
