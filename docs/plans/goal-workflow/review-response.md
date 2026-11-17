# Review response: feat/goal-workflow (2026-11-15)

Review: `/tmp/goal-review/feedback.md` (19 findings, F-01..F-19).
Owner decisions below are settled and folded into `decision-tree.md`,
`drive-roles.md` and the build slices.

## Disposition

| Finding | Disposition | Action | Slice |
| :-- | :-- | :-- | :-- |
| F-01 /drive bypasses driveGoal | partial: premise wrong (goal-command.ts does not register /drive; brief said not wired) | wire `/goal drive` + `/drive` alias to `driveGoal`; retire `prompts/drive.md` | 1 |
| F-02 Builder self-grades via drivers | accept | any diff to `**/drivers/**` or `**/dsl/**` triggers the Verifier | 5 |
| F-03 G2 path convention | accept | Steward owns `docs/domain/<ctx>/features/**`, `**/*.acceptance.test.*`, `**/dsl/**`; G2 checks these globs | 5 |
| F-04 agent/skill prompts lag design | partial: build not started | update `lean-worker.md` (already-green, spec-dispute, no Steward files, red->green receipt) and the drive skill before the first new-style drive | 5 |
| F-05 Verifier lacks outcome, anti-goals | accept | add the goal's raw `outcome` and `anti_goals` to the Verifier brief | 5 |
| F-06 Steward lacks DSL, farley-tdd | accept | add `farley-tdd`; Steward writes scenario + DSL | 5 |
| F-07 spec corpus drift (approve/reject/check, auto-persist) | accept | amend ADR-009/010, handoff-spec, goal-todo-contract, goal-contract.feature, goal-command.ts header; delete dead `proposeChange`/`applyApprovedChange`/`applyReject`, `Deps.runCommand` | 2 |
| F-08 Discovery missing (ADR-011) | accept | Discovery + <=2 gap questions in `startGoal` and post-close draft; `discovery` on `goal_propose`; Draft Lint implemented or deferred explicitly | 2 |
| F-09 stale checkpoint, injection | accept | clear on drop and fresh lock; tag checkpoint with goal id + lock hash, refuse mismatch; fence contents as untrusted data | 1 |
| F-10 plan mode traps session | accept | plan mode exits on hand-off to /goal and on successful lock | 4 |
| F-11 post-close draft overwrites, no ask | partial: **thesis defended** | keep draft-at-once (drafting is frictionless; lock is the gate; assumptions stated in the draft). Fix the data loss: archive the closed goal to `goals/archive/<id>-<date>.md` with history, link it from the new draft; add `/goal show <id>` | 2 |
| F-12 stale warning on deleted branch | accept | `/goal drop <id>` from any branch | 2 |
| F-13 already-green, spec-dispute exits | partial: refactor kind already designed | Builder step 2 honours task kind; already-green -> orchestrator verifies G1-G6 at head; confirmed spec-dispute -> Steward fixes in-wave; escalate only when the locked contract is wrong | 5 |
| F-14 trigger-only Verifier vs ADR-004 Am.1 | accept | ADR-004 Amendment 2: Verifier on unmeasured modules (Am.1 holds), on driver/DSL changes, and on triggers; skip only when holdout >= 0.85 and no driver/DSL change | 5 |
| F-15 internal doc contradictions | accept | reconcile drive-roles (G4 row, verifier model) and component-map open list | now |
| F-16 `serves` not a field | accept | `serves?: string` on Goal and `goal_propose`; in all three draft prompts; brief overstated it | 2 |
| F-17 G1 in bare tmp worktree | partial | record G1a red run at Steward commit in the feature worktree, G1b at Builder head; keep env classification at lock but exclude a missing module the goal creates | 5 |
| F-18 two dialogs on weakened relock | **defended** | intentional: weakening a locked check takes two acts (ADR-010) | - |
| F-19 hygiene | accept | keep whitespace in /drive extra instructions; drop `goal_changed`, add `goal_started`/`goal_unlocked` to ADR-009 | 1 |

## Thesis, restated

Drafting is frictionless; locking is the gate. Every act that commits intent
(lock, unlock, close, weakening) stays with the human and stays deliberate.
Everything else, including drafting the next goal, is DWIM, and its
assumptions are visible at the gate.
