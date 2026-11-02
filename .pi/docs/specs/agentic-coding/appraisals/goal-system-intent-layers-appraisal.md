# Appraisal: Goal system against a layered model of intent

- **Type:** Structured appraisal and feedback. Advisory only. It changes no code, spec or ADR.
- **Date:** 2026-11-02
- **Subject:** `/goal`, the Goal Contract and the todo link (TB-7 / TB-8) on branch `feat/goal-tb7`
- **Inputs read:** ADR-008, ADR-009, `contracts/goal-todo-contract.md`, `features/goal-contract.feature`,
  and by search only: `_lib/goal.ts`, `_lib/goal-flow.ts`, `goal-command.ts`, and the cited test files.
- **External input:** Dave Farley, "The Industry Is Catching Up: The Only Way to Generate AI Code That Works"
  (Modern Software Engineering, https://youtu.be/EkH_uoybj8k), read from its auto-generated transcript.
- **Not done:** No tests, mutation runs or `/goal` sessions were executed. Statements about behaviour
  come from reading code and specs, so treat them as unverified until run.

## 1. The model being appraised

The driver sets a goal, the outcome wanted by the user. Other forms of intent cohere with it, at different levels:

| Level | Question it answers | Artefact |
|---|---|---|
| Goal | Why, and what outcome? | `goal.md` |
| Quality attributes | How good, under what constraints? | (not stored today) |
| ADRs | How, within those constraints? | `adr/ADR-*.md` |
| BDD | What behaviour shows we are converging on the goal? | `features/*.feature` |
| TDD | How does each unit of code behave? | `*.test.ts` and similar |

Intent is refined as clarity or uncertainty changes, until a decision can be made. Agents help with that.
Non-trivial decisions need a human.

## 2. Summary verdict

The implementation agrees with the model on three points: the driver owns the outcome, refinement is
gated by a human, and "done" is a command result rather than a claim. It is thinner than the model on
three others: goals have no hierarchy, quality attributes have no home, and the links between layers
are free text and naming conventions rather than checked relationships.

None of these is a defect in TB-7 or TB-8 as scoped. They are points to weigh before the design
hardens, and the ADR revisit criteria already anticipate some of them.

## 3. Where the implementation matches the model

| Point | Evidence | Why it matters |
|---|---|---|
| Driver owns the outcome | `/goal <outcome>` drafts at HEAD (`goal-command.ts` header) | Intent comes from a human, as the video argues. |
| Agent drafts, human locks | ADR-009 Decision; `goal-flow.ts` refuses agent changes to anti-goals, scope and spec links once locked | Matches "agents help, humans decide". |
| Check must fail first | ADR-009 fail-first gate; feature scenario "already passes on the base commit is refused" | A check that cannot fail proves nothing. |
| Closure is a command result | `/goal done` runs the check and refuses on non-zero exit | Removes "done by assertion" for code goals. |
| Honest about non-code goals | `closed_by: assertion` marker | Keeps weaker evidence separable for H5. |
| Changes leave a trail | History entries `{at, by, reason, old, new}` | Refinement is auditable. |
| Specs reach the tests | `goal-flow.test.ts` and `goal.test.ts` cite scenario names | An informal outer loop (BDD) over an inner loop (TDD). |
| Scope is bounded | Anti-goals and scope anchors | Gives the governor and critic something to prune against. |

## 4. Points to consider

Each point gives the observation, the rationale, the options and the trade-off. Priority is my judgement:
**H** worth deciding before the design hardens, **M** worth deciding soon, **L** can wait for H5 data.

### P1. Goals have no hierarchy (H)

- **Observation:** One goal per branch. The contract has no parent or child field. ADR-008 lists
  "work spans several branches for one outcome" as a revisit criterion.
- **Rationale:** Real outcomes often need splitting. Farley's chain runs from wish to story to example to
  executable spec, and each step adds precision. A branch-sized goal sits at one level of that chain.
  Without a parent link, "this branch serves that larger outcome" lives only in the human's head or in chat,
  which is the failure ADR-008 set out to remove.
- **When to split a goal:** When no single falsifiable command can serve as its done-check, or when it
  spans more than one branch or worktree. A goal whose check cannot fail quickly is probably two goals.
- **Options:**
  1. Add an optional `parent: <goal id>`, and let a parent close only when its children are closed.
  2. Keep goals flat and use a labelled epic in the backlog, with no enforcement.
  3. Do nothing until H5 shows the need.
- **Trade-off:** Option 1 adds a dependency between goal files and a rule for orphans and rename.
  Option 3 keeps scope small but leaves the spanning-goal case to ad hoc practice.

### P2. Quality attributes have no home in the goal (H)

- **Observation:** The Goal Contract holds an outcome, anti-goals, a done-check, scope anchors and spec links.
  Anti-goals are free prose. Quality attributes appear only inside each ADR's alignment section.
- **Rationale:** Outcomes are bounded by qualities such as latency, security and modifiability.
  Those constrain which ADR decisions are acceptable, so they sit between a goal and its ADRs.
  A goal that can close green while violating a quality constraint is the narrow-check problem ADR-009
  already admits.
- **Option:** A short, optional `quality_attributes` list on the goal, each paired with a check
  (a fitness function) that joins the done-check commands. ADR-009 already calls the done-check a fitness
  function, so this extends the same idea rather than adding a new one.
- **Trade-off:** More to specify per goal, and some qualities have no cheap command. Those would be
  human-confirm items, so they remain visible as assertions.

### P3. ADRs and BDD should not cohere directly (M)

- **Observation:** The model pairs BDD with ADRs. The video argues a specification states what, and says
  nothing about how. Gherkin that depends on an ADR's solution becomes a design and breaks when a better
  design appears.
- **Rationale:** ADRs and BDD sit on different axes. BDD ties to goals (behaviour). ADRs tie to quality
  attributes (how). The legitimate link runs from an ADR's consequences to new scenarios or fitness
  functions, not from a decision to a step definition.
- **Consideration:** Keep scenarios solution-independent. Let an ADR cite the scenarios it must not break,
  and let new scenarios or fitness functions cite the ADR that caused them.
- **Trade-off:** This costs a convention and some review attention. It protects the freedom the video
  says agents need over how while leaving no freedom over what.

### P4. Links between layers are untyped and unchecked (M)

- **Observation:** `spec_links` is a free-text list described as "Specs, ADRs or issues that define the
  outcome" (`goal-command.ts`). Nothing checks that a link resolves or says what kind it is.
- **Rationale:** The layered model only helps if it can be traversed: goal to features, to ADRs, to tests.
  Free text cannot be validated, and drift between layers goes unseen. This is the same problem the video
  raises about prose specs, nothing goes red.
- **Options:** Typed links (`adr`, `feature`, `issue`) with a resolve-or-warn check at lock time and at
  session start, reusing the stale-goal guard.
- **Trade-off:** Links to external issues cannot always be resolved offline, so the check would warn
  instead of block.

### P5. A done-check is not tied to scenarios (M)

- **Observation:** The done-check is any command. The feature file defines scenarios, and tests cite them
  by name, but nothing connects the check to the scenarios that define the goal.
- **Rationale:** A check can be green while none of the goal's scenarios are in it. Fail-on-base shows the
  check can fail, not that it covers the outcome (ADR-009 Consequences). Coverage of the *intended*
  behaviour is the weakest link in the chain.
- **Options:**
  1. A convention that each locked goal names its scenarios, and the lock step lists which ones the check
     exercises.
  2. Reporting only: show uncovered scenarios at lock and closure without blocking.
- **Trade-off:** Option 1 couples to the test framework's naming. Option 2 is cheap and informs the human
  at the confirmation point that already exists.

### P6. Check strength is deferred (M)

- **Observation:** ADR-009 lists mutation scoring as a revisit action if goals close green with the
  outcome unmet.
- **Rationale:** The video pairs acceptance tests with mutation testing, because a surviving mutant is a
  gap in the specification. Without it, nothing measures whether the assertions behind the check are strong
  enough, and acceptance-level scenarios are assertion-light by design. Detailed assertions belong in the
  unit and integration layers, and their strength is what mutation testing measures.
- **Consideration:** Run mutation scoring in report-only mode over the goal's scope anchors, so H5 gets
  data before any gate is chosen. Scope anchors already give the target paths.
- **Trade-off:** Runtime cost, tool availability per language, and noise from equivalent mutants.

### P7. Refinement is possible for the check only (L)

- **Observation:** On a locked goal the agent may propose only a done-check change. Anti-goals, scope and
  spec links need the human to edit them (`goal-flow.ts`).
- **Rationale:** This is cautious and consistent with human-owned intent. But it means learning that
  surfaces during work (a new anti-goal, a moved scope boundary) has no proposal path.
- **Consideration:** Allow agent proposals for those fields too, held as pending until the human approves,
  using the existing pending-change slot and history log.
- **Trade-off:** More approval traffic. The human confirmation per change is already named as a cost in ADR-009.

### P8. Test layers behind the check are unspecified (L)

- **Observation:** The contract's test seams are clock and store overrides. The example done-check calls a
  unit test target. The specs do not say which layers a done-check should draw on.
- **Rationale:** If the check is only a fast unit suite, no acceptance-level evidence exists. If it is
  only acceptance scenarios, edge cases are unchecked. A short guideline would help the agent draft better
  checks, since drafting is where the agent saves most time.
- **Consideration:** A short note in the contract on drafting checks: acceptance scenarios for the outcome,
  unit and property tests for logic, fitness functions for qualities.

### P9. Reviewing the evidence, not only the diff (L)

- **Observation:** Closure reports a check result and writes a hand-off with lessons.
- **Rationale:** The video's reviewing model asks which scenarios were added, what failed first and what
  survived mutation, with the diff sampled. A closure record that carries that evidence would make the
  human's review fast.
- **Consideration:** Add the scenarios touched, the base-commit failure output pointer and, if P6 lands,
  the mutation summary to the hand-off.

## 5. Risks and limits of this appraisal

- **Single source for the external model:** The video is one practitioner's view. The author also
  promotes his own training and a skill for coding agents. The claims are argued, not measured.
  H5 is this project's own measurement and is the better evidence.
- **Transcript quality:** It is auto-generated, with some mis-hearings, so points are summarised rather
  than quoted.
- **Implementation read-only:** I searched the code and read the specs. I did not run the suite.
  For example, I have not tested whether the lock gate refuses a vacuous check.
- **Scope of TB-7 and TB-8:** Several points go beyond what those items set out to do. They are inputs
  to later rounds, not defects.

## 6. Suggested order of consideration

1. P1 and P2, because they change the shape of the goal file and are cheaper to decide before more
   goals exist in the store.
2. P4 and P5, which make the existing links checkable at moments that already involve the human.
3. P6, as report-only, so H5 gets data.
4. P3, P7, P8 and P9, as conventions or later refinements.

Nothing here needs to block TB-7 or TB-8.
