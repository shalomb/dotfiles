# Contract: todo store ⇄ /goal (TB-7 / TB-8)

Status: Draft for TB-7/TB-8 parallel build, 2026-11-01. Owner: coordinator (Main Copilot).
Both builds code against this file. Change it only through the coordinator.

## 1. Store location (fixes a worktree bug)

`<store> = ${XDG_CACHE_HOME:-~/.cache}/agent-skills/todos/<repo_slug>/`

`repo_slug` MUST be derived from the **main worktree root**, not the current checkout:
`dirname(realpath(git rev-parse --git-common-dir))`, then the existing slug rule
(strip `/`, replace `/ \ :` with `-`, collapse `-+`). Outside git: fall back to cwd.
All linked worktrees of one repo therefore share one store (ADR-002, DRV-02).
Applies to `todo_navigator.parser.get_repo_slug` and `_lib/persist.ts repoSlug` callers.

## 2. Goal file

Path: `<store>/goals/<branch_slug>.md`, `branch_slug` = branch name with `/` → `-`.
Detached HEAD: no goal.

```markdown
---
id: g-<branch_slug>
branch: feat/export
status: draft            # draft | active | closed | dropped
outcome: Users can export a backlog as CSV
done_check:
  kind: command          # command | human
  commands:
    - make -C skills/todo-navigator test-unit
  locked_at: ""          # ISO-8601 UTC, set on lock
  locked_by: ""          # "human"
  base_commit: ""        # sha the check failed on at lock time
created_at: 2026-11-01T10:00:00Z
closed_at: ""
closed_by: ""            # check | assertion
---

## Anti-goals
- …

## Scope anchors
- skills/todo-navigator/src/

## Spec links
- …

## History
- 2026-11-01T10:05:00Z human: locked (base a1b2c3d failed: exit 1)
```

## Pending change
- (optional; one entry, written by goal_propose on an active goal; `todo` ignores it)

Rules: a draft MAY have an empty done-check; `/goal lock` refuses until it has one.
History and pending entries are encoded so free text cannot break parsing.
`loadGoal` treats a file whose `branch` differs from the current branch as no goal
(slug collisions such as `feat/x` vs `feat-x`). Front matter is YAML; sections are optional except none are required by `todo`.
`todo` only **reads** `id` and `status`. Only `/goal` writes goal files.

## 3. Task metadata (todo-navigator)

- `todo add` writes `[created: <ISO-8601 UTC>]`.
- `todo add` writes `[goal: <id>]` when `<store>/goals/<branch_slug>.md` exists with
  `status: active` for the current branch. Explicit `--goal <id>` overrides; `--goal none` suppresses.
- Closure: `todo done` already writes `done_at`. Any write that turns a task `[x]`
  without `done_at` (e.g. `todo edit` express ops, replan) MUST stamp `done_at` too.
- Round-trip: parse → to_markdown_line → parse preserves `created`, `goal`, `done_at`.

## 4. CLI surface consumed by /goal

- `todo brief --json` gains `"goal": {"id": …, "status": …} | null` for the current branch.
- `todo list --goal <id>` (filter) — optional for TB-8, used later by H5.
- Exit codes unchanged.

## 5. Known limits (accepted)
- Stores keyed by the old per-worktree slug are not migrated; they stay in the cache, unused.
- Store sharing needs a `.git` common dir; bare-repo layouts (`.bare`, `foo.git`) and a symlinked `.git` fall back to per-checkout.
- `/persist` (`_lib/persist.ts repoSlug`) still keys hand-offs per checkout: follow-up.

## 6. Test seams

- Store root override: env `XDG_CACHE_HOME` (existing). Tests MUST NOT touch the real cache.
- Clock: functions accept `now` (existing pattern in `claims.py`).
