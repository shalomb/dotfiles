# Review brief: feat/goal-workflow

Worktree: `~/.config/dotfiles/.worktrees/feat-goal-workflow`. Base: `develop`.
Read-only review. Do not push, rebase or commit; report findings.

## What this branch is

The design of the pi development workflow (grill -> plan -> goal -> drive),
plus the first two code pieces. Mostly docs. All design decisions are settled;
the build is planned in slices, not started.

## Read in this order

1. `decision-tree.md`: intent, chain, anchors, coherence rules, test layers,
   decisions, known gaps.
2. `drive-roles.md`: /drive roles, wave, gate G1-G6, escalation, strictness.
3. `component-map.md` (+ `.mmd` sources): diagrams. Rendered draft:
   http://idun/r/docs/report/2026-11-15-goal-workflow-component-map/index.html
4. The code below.

## Code changes

| Commit | Files | Change |
| :-- | :-- | :-- |
| fbb115b | `.pi/agent/extensions/_lib/goal-flow.ts`, `goal-flow.test.ts` | After a goal closes, bare `/goal` drafts the next goal from the end-state doc, then `todo next --all`, then chat, without asking; records `serves`. Adds `findEndStateDoc`. (`serves` is prose in the prompt only; a field comes in slice 2.) |
| 92a28dd | same files | `driveGoal`: refuses without an intact locked goal; motorway/scenic; checkpoint path and resume; checkpoint cleared on `/goal done`. Not wired to a command yet. |
| 019d873, 292ab1a | `.pi/agent/agents/spec-steward.md`, `bart-verifier.md` | Thin agent definitions; skills do the work. Verifier model not pinned (set per profile via `subagents.agentOverrides`). |

## How to verify

```
cd ~/.config/dotfiles/.worktrees/feat-goal-workflow
make test-fast                                  # expect 0 fail
cd .pi/agent/extensions && bun test _lib/goal*.test.ts
```

`bun test` run for the whole of `.pi/agent/extensions/` fails
`registry-node` (cwd-dependent transpile path); the same happens on develop.
`make test-fast` is the authoritative result.

## Review focus

- Design: do the chain, anchors and coherence rules hang together? Gaps,
  contradictions, or steps that add friction to execution?
- `drive-roles.md`: are G1-G3 precise enough to reject? Can a Builder still
  self-grade? Is the Steward/Builder file boundary mechanically enforceable?
- `driveGoal` and the next-goal prompt: correctness, refusal paths, prompt
  injection through checkpoint contents or extra instructions.
- Agent files: do the frontmatter fields match the pi-subagents schema
  (`skills`, `extensions: ""`, `subagentOnlyExtensions`, `tools`)?

## Out of scope

- The /doc system (worktree `feat-doc-system`, parked).
- agent-skills `feat/todo-goal-aware` (goal-aware `todo next`/`prev`): a
  separate repo, reviewed there.
- Known gaps at the end of `decision-tree.md`.

## Output wanted

`bart-adversarial-reviewer` format: Correct / Finding (P0-P2, file:line,
evidence, smallest fix) / Merge verdict.
