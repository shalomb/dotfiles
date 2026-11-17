# Glossary: strategy hierarchy

Bounded context: the strategy tree that /vision, /goal and /next read and write.
Terms from the parent context are in [../GLOSSARY.md](../GLOSSARY.md).

**Vision**:
The north star: where the work in one repo must be in the long term.
_Avoid_: end-state, destination

**Goal**:
An outcome above key results that serves one pillar. It contains no tasks and no tool names.
_Avoid_: epic (definition under review: see ladder.terms)

**Key result**:
One sentence and one command check that shows progress to one goal.
_Avoid_: OKR, KR target

**Hop**:
One locked, branch-scoped contract that turns one key result green. It is ephemeral.
_Avoid_: goal contract, sprint

**Guardrail**:
A check that must stay green on every hop. It is a counter-metric.
_Avoid_: constraint, policy

**Provisional stub**:
An upstream node that the agent wrote and the human did not ratify. Nothing locks on it.
_Avoid_: draft, placeholder

**Strategy tree**:
The visible markdown tree of upstream nodes in a repo, one file for each node.
_Avoid_: end-state doc, roadmap

**Shadow tree**:
The private store of hops under XDG state. Each hop has a TTL.
_Avoid_: goal store, cache
