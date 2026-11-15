# Goal workflow (grill -> plan -> goal -> drive): decision tree

Stance: mid-execution. /goal, /grill-me, /plan, /drive and todo exist and work.
Aim: high friction on intent, low friction on execution. DWIM by default.

## Chain

```
/grill-me   right thing?      decisions, handoff, TERMS -> glossary
/plan       vision + right    end-state doc: objectives, KRs, goal queue;
            way to build      context map; example maps per KR; ADRs
/goal       done for branch   locked contract; serves KR; outcome check
                              runs the KR's scenarios
/drive      execute           waves of Builders, outside-in; gates
close retro did KR move?      feeds /plan (replan), prunes scenarios
```

## Settled

| Node | Decision |
| :-- | :-- |
| goal.lock-dialog | One dialog; Outcome Check pick locks it; agent suggestion first. (shipped d053277..42d30cd) |
| goal.close-green | /goal on a green check offers Close / Not yet. (shipped f686907) |
| goal.guard-reads | Goal-store reads with harmless redirects pass the write guard. (shipped 5d95468) |
| goal.start-from-grill-plan | Always auto-draft a goal when /grill-me or /plan finishes. |
| goal.outcome-check | Preselect; Enter accepts. |
| goal.default-branch | On main/develop: offer a worktree + branch first. |
| goal.next-dwim | After close, draft the next goal at once: end-state doc, then backlog, then chat. (branch feat/goal-next-dwim) |
| next.goal-aware | todo next scopes to the active goal; none ready -> point at /goal; --all = whole backlog. (agent-skills feat/todo-goal-aware) |
| prev.goal | todo prev also reports the last finished goal. (agent-skills feat/todo-goal-aware) |
| review.lock-gesture | Ticking `[x] Lock` in the final review round locks; extension enforces rules; /goal lock stays. |
| review.scope | Vim rounds for review (draft, close retro); dialogs for gates. |
| review.store | Goal round replies kept next to the goal in the cache store. |
| roadmap.home | Structured end-state doc: headings = objectives, KRs with ids. |
| plan.grill | Both: /grill-me stands alone; /plan uses the same grill_round engine. |
| drive.spec-author | Separate Spec Steward per wave writes scenarios + red acceptance tests; Builders cannot touch them. |
| drive.gate-home | Gate as tested code the drive skill calls, not skill text. |
| drive.verifier-trigger | LLM Verifier on gate warnings, hub/security files, retries, P0. Steward writes >= 2 contrasting key examples per rule, so example-overfitting fails a test. |
| agents.thin | Agent files are thin role boundaries (model, tools, extensions, `skills:`, brief, do/never, receipt); skills do the work. |
| drive.verifier-agent | Verifier = Bart: a `bart-verifier` agent definition (beside lean-worker) that loads `bart-adversarial-reviewer`, read-only tools, pinned to a different model family from the Builder; brief = diff, scenarios, glossary, gate warnings; returns a verdict receipt. |

## Open: round 1 (where artefacts live, how they link)

| Node | Recommended |
| :-- | :-- |
| plan.output (Q1) | /plan edits the end-state doc (objectives, KRs, goal queue) + ADRs. |
| plan.kr-shape (Q2) | KR = id, one sentence, check command where possible, else `human`. |
| plan.goal-link (Q3) | Goal field `serves: KR-n.m`; review shows it; retro asks if it moved. |
| plan.domain (Q7) | `docs/domain/`: repo glossary, CONTEXT-MAP.md, per-context glossaries; agent maintains; review warns on drift. |

## Open: round 2 (when things run)

| Node | Recommended |
| :-- | :-- |
| plan.mode (Q4) | Keep the design-only guard; end with "draft first goal and leave plan mode". |
| plan.grill-use (Q5) | /plan reads any /grill-me handoff first, grills vision/KR/architecture. |
| plan.replan (Q6) | Offer /plan when an objective's KRs are all met or a retro says a KR did not move. |
| plan.bdd (Q8) | Progressive: /plan example maps (titles) -> /goal full feature, runner = outcome check -> /drive outside-in; advisory chain linter. |
| plan.living-docs (Q9) | Generated living-docs page (Objective > KR > Feature > Scenario, status, commit, @control evidence) published via /doc on goal close. |

## Open: round 3 (/drive division of labour, BDD guardrails)

See `drive-roles.md`. Open: drive.gate-strictness (user is reading the context in drive-roles.md, section "Gate strictness: context").

## Notes

- DDD artefacts are the anchors: glossary (names), context map (scope), domain events/aggregates (behaviour), ADRs (structure).
- BDD anchors: glossary (step words), events/aggregates (Given=state, When=command, Then=event), KRs (@KR tags), context map (feature dirs), anti-goals (negative scenarios).
- Coherence chain: Objective -> KR -> @KR scenarios -> goal serves + outcome check -> `// Scenario:` tagged tests -> code names in glossary.
- Spec set = living documentation for LT, compliance, QA, support. Conditions: domain language, key examples, organised by capability (goals reference, never own), always executable and green, published.
- Adzic failure modes to guard: UI-script scenarios, scenario bloat, red/skipped rot.
- Feature home: `docs/domain/<context>/features/<capability>.feature`. Tags: `@KR-n.m`, `@control-<id>`, `@manual`.
