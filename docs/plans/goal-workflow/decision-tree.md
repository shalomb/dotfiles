# Goal workflow (grill -> plan -> goal -> drive): intent and decisions

Stance: mid-execution. /goal, /grill-me, /plan, /drive and todo exist and work.
Single source of intent for this work. Peer review folded in: see `review-response.md`. All design decisions settled 2026-11-15; /doc work is parked until this lands. `drive-roles.md` holds the /drive detail.

## Intent

1. **High friction on intent, low friction on execution.** Humans decide what
   and why, and lock it. Everything after the lock is DWIM, with few prompts.
2. **One coherent chain** from vision to code, each step with one job and one
   artefact, so short-term goals always serve the end-state.
3. **Feedback is first-class** at every human touchpoint (grill, goal review,
   close retro), captured as structured deltas and kept.
4. **DDD artefacts anchor development**: shared names, scopes and behaviour.
5. **The BDD spec set is a product asset**: living documentation that LT,
   compliance, QA and support can read and interrogate.
6. **Guardrails are mechanical where they can be**, and judgement (LLM review)
   is spent only where a machine cannot see.
7. **Agents are thin; skills do the work.**

## Chain

```
/grill-me   right thing?        decisions, handoff, TERMS -> glossary
/plan       vision, right way   end-state doc: objectives, KRs, goal queue;
            to build it         context map; example maps per KR; ADRs
/goal       done for branch     locked contract; serves KR; outcome check
                                runs the KR's scenarios
/drive      execute             waves: Steward (red specs) -> Builders
                                (outside-in) -> mechanical gate -> Verifier
close retro did the KR move?    feeds /plan (replan), prunes scenarios
```

## Anchors and coherence

- **DDD anchors**: glossary (names), context map (scope), domain events and
  aggregates (behaviour), ADRs (structure). Home: `docs/domain/` (Q7).
- **BDD anchors**: glossary (step words), events/aggregates (Given = state,
  When = command, Then = event), KRs (`@KR-n.m`), context map (one feature
  directory per context), anti-goals (negative scenarios).
- **Coherence chain**: Objective -> KR -> `@KR` scenarios -> goal `serves` +
  outcome check -> `// Scenario:` acceptance tests -> code names in glossary.
- **Rules**: every KR has a scenario, no orphan scenarios; a goal's outcome
  check runs its KR's scenarios; step words, DSL methods and identifiers are
  in the glossary, avoid-list names never appear; every scenario has a tagged
  acceptance test; a goal's features stay in one context.

## Tests: Adzic outside, Farley inside

- **Acceptance (outer loop)**: Adzic scenarios say what, as key examples.
  Farley's four layers make them run without becoming UI scripts:
  test case (scenario) -> DSL (glossary verbs) -> protocol drivers -> system.
  Spec Steward owns test cases and DSL; Builder owns drivers and system.
- **Unit (inner loop)**: Farley TDD by Builders: test first, small steps,
  Properties of Good Tests (fast, maintainable, repeatable, atomic,
  necessary, understandable). Unit tests are a design tool: they need not
  trace to a scenario.
- **Pipeline**: commit stage = repo fast target (unit); acceptance stage =
  scenarios. The gate runs both. G1 (red first) is at acceptance level.
- **Quality**: `test-design-review` scores tests on Farley's properties; the
  Verifier uses it when triggered; the close retro reports the trend.

## Living documentation

- Spec set conditions: domain language, key examples, organised by capability
  (goals reference scenarios, never own them), always executable and green,
  published.
- Feature home: `docs/domain/<context>/features/<capability>.feature`.
  Tags: `@KR-n.m`, `@control-<id>`, `@manual`.
- Readers: LT (objective > KR status), compliance (`@control` -> passing run
  -> commit, date), QA (gaps, single-example rules, missing negatives),
  support (search by glossary term).
- Guard against: UI-script scenarios, scenario bloat, red or skipped rot.

## Settled

| Node | Decision | State |
| :-- | :-- | :-- |
| goal.guard-reads | Goal-store reads with harmless redirects pass the write guard. | shipped 5d95468 |
| goal.lock-dialog | One dialog; the Outcome Check pick locks it; agent suggestion first. | shipped 42d30cd |
| goal.close-green | /goal on a green check offers Close / Not yet. | shipped f686907 |
| goal.next-dwim | After close, draft the next goal at once: end-state doc, backlog, chat; record `serves`. | built (45774e5) |
| drive.gate-goal | /drive refuses without an intact locked goal; motorway/scenic; checkpoint resume. | built (076a89d), not wired to a command |
| next.goal-aware | `todo next` scopes to the active goal; none ready -> point at /goal; `--all` = whole backlog. | built (agent-skills feat/todo-goal-aware) |
| prev.goal | `todo prev` also reports the last finished goal. | built (agent-skills feat/todo-goal-aware) |
| goal.start-from-grill-plan | Always auto-draft a goal when /grill-me or /plan finishes. | to build |
| goal.outcome-check | Preselect; Enter accepts. | shipped with lock-dialog |
| goal.default-branch | On main/develop: offer a worktree + branch first. | to build |
| review.engine | One shared review engine (grill_round machinery) for /grill-me, /plan, goal draft review, close retro. | to build |
| review.lock-gesture | Ticking `[x] Lock` in the final review round locks; the extension enforces the rules; /goal lock stays. | to build |
| review.scope | Vim rounds for review (draft, close retro); dialogs for gates. | to build |
| review.store | Goal round replies kept next to the goal in the cache store. | to build |
| roadmap.home | Structured end-state doc: headings = objectives, KRs with ids. | to build |
| plan.grill | Both: /grill-me stands alone; /plan uses the same engine. | to build |
| drive.spec-author | Separate Spec Steward per wave writes scenarios + red acceptance tests. | agent drafted |
| drive.gate-home | Gate as tested code the drive skill calls. | to build |
| drive.verifier-trigger | Verifier on gate warnings, hub/security files, retries, P0; Steward writes >= 2 contrasting examples per rule. | settled |
| drive.verifier-agent | Verifier = Bart (`bart-verifier`), read-only, different model family from the Builder. | agent drafted |
| agents.thin | Agent files are thin role boundaries; skills do the work. | settled |
| plan.output | /plan edits the end-state doc (objectives, KRs, goal queue) + ADRs. | to build |
| plan.kr-shape | KR = id (KR-n.m), one sentence, check command where possible, else `human`. | to build |
| plan.goal-link | Goal field `serves: KR-n.m`; review shows it; retro asks if it moved. | to build |
| plan.domain | `docs/domain/`: repo glossary, CONTEXT-MAP.md, per-context glossaries and features; agent maintains; review warns on drift. | to build |
| plan.mode | Keep the design-only guard; /plan ends by auto-drafting the first goal. | to build |
| plan.grill-use | /plan reads any /grill-me handoff first, grills vision, KRs, architecture. | to build |
| plan.replan | Offer /plan when an objective's KRs are all met, or a retro says a KR did not move. | to build |
| plan.bdd | Progressive: /plan example maps -> /goal full feature, runner = outcome check -> /drive outside-in; advisory chain linter. | to build |
| plan.living-docs | Living-docs page (objective > KR > feature > scenario, status, commit, `@control` evidence) published via /doc on goal close. | to build (after /doc) |
| drive.gate-strictness | G1-G3 reject; G4 warns, logged, promoted when precise; G5-G6 warn. | to build |
| drive.verifier-model | Not pinned in the agent file; each profile sets `subagents.agentOverrides.bart-verifier.model` to a non-Builder model family. | settled |
| review.f11 | Keep drafting the next goal at once (thesis: drafting is frictionless, lock is the gate); archive the closed goal first; add `/goal show <id>`. | to build |
| review.drivers | Builder owns drivers; driver/DSL diffs trigger the Verifier; Steward owns scenarios + DSL; G2 globs `features/**`, `*.acceptance.test.*`, `dsl/**`. | to build |
| review.verifier | ADR-004 Amendment 2: Verifier on unmeasured modules, driver/DSL changes, triggers; skip only at holdout >= 0.85 with no driver/DSL change. Brief includes raw outcome and anti-goals. | to build |
| tests.layers | Adzic scenarios outside via Farley's four layers; Farley TDD inside; G5 applies to acceptance tests only. | settled |

## Known gaps

- Repo agents deploy to `~/.pi/agent/agents/`; the personal profile reads
  `~/.pi/profiles/personal/agents/` (a real directory), so repo agents do not
  reach it. Fix in `lib/pi/profile.sh`.
- `g-develop` is a stale goal on a default branch (outcome "confirm"). With
  goal-aware `todo next` it now narrows `/next`. User to `/goal drop` it.
- Footer goal status is stale; a live one (`goal locked, check red, wave 2/3`)
  is wanted.
- todo-navigator changes live in a separate repo (agent-skills,
  `feat/todo-goal-aware`); they ship with that repo, not this branch.
