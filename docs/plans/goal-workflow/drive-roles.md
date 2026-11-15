# /drive: division of labour and BDD guardrails (proposal, round 3 open)

## Today

- Main Copilot orchestrates; one Builder per task (`lean-worker`) does
  everything: reads the spec, writes tests, writes code, commits.
- Critic (`bart-adversarial-reviewer`) runs only for hub files, public API,
  security paths or retries.
- Gate: rebase, repo test target, ff-merge, `todo done`.

## Problems

1. **Self-grading.** The agent that writes the code also writes the test that
   judges it. Tests drift to fit the code; scenarios get edited to pass.
2. **No spec ownership.** Nothing stops a Builder from changing a `.feature`,
   deleting an assertion, or tagging a scenario `@skip`.
3. **Only some guards reach Builders.** `lean-worker` loads no ambient
   extensions; `subagentOnlyExtensions` adds the commit, hooks, signing and
   CLI guards only. Spec, goal-store and scan guards do not run inside it, so
   BDD guardrails must be mechanical, in the gate the Copilot runs on the diff.
4. **Red is never proven.** No step shows the acceptance test failed before
   the change, so a test that cannot fail passes the gate.
5. **Critic is rare and judgement-only.** Cheap mechanical checks are missing;
   the expensive LLM review is the only review.

## Proposed roles

| Role | Model tier | Writes | Never writes |
| :-- | :-- | :-- | :-- |
| Copilot (orchestrator) | session model | todo, checkpoint, merges | features, tests, src |
| Spec Steward | sonnet | `.feature`, scenario-level acceptance tests (red), glossary deltas | src |
| Builder (`lean-worker`) | sonnet / haiku for mechanical | src, unit tests, test plumbing | `.feature`, acceptance assertions |
| Verifier | different model from Builder | receipt only | anything |

## Wave sequence

```
todo batch --goal --claim
  -> Steward (one per wave, all tasks): scenarios + red acceptance tests,
     commit "test(...): ... (red)" on the feature branch      [G1a red]
  -> Builders in parallel, one worktree each, rebased on the red commit
  -> Gate per task (mechanical, Copilot runs it)              [G1b..G6]
  -> Verifier only on gate warnings, hub files, retries
  -> ff-merge, todo done, checkpoint
```

## Builder steps (brief contract)

1. Restate task id and scenario ids in one line.
2. Run the scenario(s): confirm red. Already green -> stop, receipt `already-green`.
3. Inner TDD: unit test red -> code -> green, small steps.
4. Run scenario(s) + repo fast target: green.
5. Spec looks wrong -> do not edit it; receipt `spec-dispute: <scenario> <why>`.
6. One ACP commit. Receipt <= 25 lines: sha, scenarios red->green, tests added, disputes.

## Mechanical gate (Copilot, on the Builder diff)

| Id | Check | On fail |
| :-- | :-- | :-- |
| G1 | Scenario fails at wave base, passes at Builder head (reuse `runChecksAtCommit`) | reject |
| G2 | Diff touches no Steward path: `docs/domain/<ctx>/features/**`, `**/*.acceptance.test.*`, `**/dsl/**` (unless a spec task) | reject |
| G3 | No scenario removed, `@skip`/`@wip` added, or assertion deleted | reject; needs human (as goal weakening) |
| G4 | Diff stays inside task scope / one context | warn (logged; promote to reject when precise) |
| G5 | Each new test names a scenario or rule (`// Scenario:` / `@KR`) | warn -> Verifier |
| G6 | New identifiers and step words in glossary; no avoid-list names | warn -> Verifier |

## Escalation

- `spec-dispute` -> Steward re-reads; if the spec stands, Builder retries once;
  else glovebox (motorway) or rest stop (scenic). Never a Builder spec edit.
- Two failed gates on one task -> stop the task, report, carry on with others.

## Gate strictness (settled: G1-G3 reject, G4 measured, G5-G6 warn)

A reject costs one Builder retry. A warn costs a Verifier call, or noise.
Reject only where the check is precise.

| Check | Precision | False positives | Mitigation |
| :-- | :-- | :-- | :-- |
| G1 red-first | high | refactor/chore tasks: no behaviour change, already green | task kind; refactor = green at base and head |
| G2 spec untouched | high (paths) | Builder needs test plumbing | plumbing outside Steward dirs; spec edits are Steward tasks |
| G3 no weakening | high for .feature; rough for assertion counts | rare for Builders | - |
| G4 in scope | medium | coarse scopes, shared helper, lockfile | allow-list shared paths; measure first |
| G5/G6 trace, glossary | low (heuristic) | frequent | warn only |

Recommendation: G1-G3 reject from day one; G4 warns, every gate result is
logged to trajectories.jsonl, promote G4 when its false-positive rate is low;
G5-G6 warn.

## Verifier (settled)

Catches what the gate cannot: code that fits the example, not the rule;
glossary words used in the wrong sense; side effects, security, public API.
Runs on triggers. Agent: `bart-verifier` (Bart skill, read-only, different
model family from the Builder).

## Agents: thin definitions, skills do the work

Principle: an agent file is a role boundary, not a manual. It holds only
frontmatter (model pin, tools, extensions, `skills:`) and a short body:
brief inputs, do / never, receipt shape. Method lives in skills.

| Agent | File | Skills (the heavy lifting) |
| :-- | :-- | :-- |
| Builder | `.pi/agent/agents/lean-worker.md` | test-driven-development, farley-tdd, git-commit-formatter, git-safety-guardrails, verification-before-completion |
| Spec Steward | `.pi/agent/agents/spec-steward.md` | adzic-bdd, domain-modeling, test-driven-development, git-commit-formatter, git-safety-guardrails, verification-before-completion |
| Verifier | `.pi/agent/agents/bart-verifier.md` | bart-adversarial-reviewer, test-design-review, adzic-bdd, domain-modeling |

Verifier model: not pinned in the agent file; set per profile via
`subagents.agentOverrides.bart-verifier.model`.
Known gap: the repo deploys agents to `~/.pi/agent/agents/`, but the personal
profile reads `~/.pi/profiles/personal/agents/` (a real directory, not a
symlink), so repo agents do not reach the profile. Fix in
`lib/pi/profile.sh` (profile prepare should link `agents/`).

## Review amendments (2026-11-15, see review-response.md)

- Builder owns protocol drivers; any Builder diff to `**/drivers/**` or
  `**/dsl/**` triggers the Verifier. Steward owns scenarios and the DSL.
- Verifier brief adds the goal's raw `outcome` and `anti_goals`.
- Verifier policy (ADR-004 Amendment 2): runs on unmeasured modules, on
  driver/DSL changes, and on triggers; skips only when holdout >= 0.85 and no
  driver/DSL change.
- Builder step 2 honours task kind (refactor: green at base and head).
  `already-green` on a behaviour task: orchestrator checks G1-G6 at head.
- Confirmed `spec-dispute`: Steward fixes and recommits in-wave; escalate to
  the human only when the locked contract is wrong.
- G1a red run is recorded at the Steward commit in the feature worktree;
  G1b runs at Builder head.
