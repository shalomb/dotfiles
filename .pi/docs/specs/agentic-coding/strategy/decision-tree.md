# Design tree: strategy hierarchy for /vision, /goal, /next

Goal: an agent drives progress toward a locked goal; every locked goal has an enforceable contract that traces
up to the vision; each hop's TDD lessons refine the next goal.
Stance: long horizon. The feat/goal-workflow code is evidence of the emerging design, not authority.
The intentional architecture is `~/obsidian/Tech/AI/agentic-goals-system/spec.md`.

Inputs: spec.md (intentional), [goal-system](../../../../../docs/explanation/goal-system.md),
[end-state](../../../../../docs/explanation/end-state-evolution.md), ADR-008..ADR-012 (emerging).
Rounds: [rounds/](rounds/). Glossary: [GLOSSARY.md](GLOSSARY.md).

## Round 1 (settled)

- [settled] stance -- Long horizon: the code is evidence. Round 1.
- [settled] reach -- Any repo, one node format; each repo owns its tree. No cross-repo links yet. Round 1.
- [settled] ladder.direction -- Goal above key result; the branch unit is a hop.
    vision > pillar > goal > key result (check) > hop (branch) > task. Round 1.
    Note: agents reach goals in minutes or hours; use industry OKR practice, with shorter horizons.
  - [open] ladder.terms -- Industry names: does "goal" mean the OKR objective?
  - [open] cadence.horizon -- What time horizon does each rung have at agent speed?
- [settled] authority.upstream -- The agent proposes upstream nodes as provisional stubs; the human ratifies.
    Nothing locks on a stub. Round 1.
  - [open] cmd.bootstrap -- First run: grill-style questionnaire rounds build vision, principles and goals,
      and iterate until the tree is coherent.
- [settled] trust.guardrail -- A guardrail is a check that must stay green on every hop. Round 1 (changed from
    "check where possible").
  - [open] guardrail.nonchecks -- Where does a constraint that cannot be a command go?
- [settled] store.home -- Visible strategy tree in the repo; hops in a shadow tree under XDG state. Round 1.
    Hops are ephemeral and noisy. Each hop has a TTL; the system does not read a hop after its TTL.
  - [open] hop.ttl -- TTL value, and what must survive expiry.

## Later

- [open] ladder.layers -- Which layers survive (mission, principles, pillars, initiatives)?
- [open] schema.enforce -- How is a schema enforced (parser, lint, gate)?
- [open] learn.upflow -- How does a lesson that contradicts intent reach the human?
- [open] learn.refine -- How does a lesson change the next goal draft?
- [open] cmd.vision -- What does /vision do?
- [open] cmd.goal -- What does /goal do (reframe task leakage, anti-scope)?
- [open] cmd.next -- What does /next do?
- [open] migrate -- What happens to end-state-evolution.md and the goal store?
