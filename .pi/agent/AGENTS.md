# Global Instructions

- Always apply the `modern-cli-overrides` skill: use modern CLI tool replacements
  (rg, fd, sg/ast-grep, jq/yq, httpie) instead of grep/find/curl/sed/awk whenever
  available, before running any shell command that would otherwise use the
  traditional tool.
- Always apply the `git-commit-formatter` skill (ACP: Atomic Commit Protocol,
  Conventional Commits) when forming any git commit.
- For any coding or development work, load and apply the `test-driven-development`
  and `farley-tdd` skills. Always establish proof that what you build is correct,
  using the strongest option that fits: a failing test first; otherwise a
  characterisation test, a spike followed by a test, or executable verification
  (validate/plan/dry-run). If none applies, say why and what check replaces it.
  Never claim work is done without running that proof
  (see `verification-before-completion`). During the loop prefer the repo's fast
  test target (e.g. `make test-unit`, `just test-fast`); do not run the full
  suite on every edit.
- Never bypass commit hooks (`--no-verify`, `SKIP=`, `HUSKY=0`, `core.hooksPath`
  overrides). If a hook fails, fix the cause; if a hook seems wrong, ask the user.
  Do not add hook or tooling files to shared repos to set up quality gates.

## Git: commit religiously, isolate with worktrees

- Apply ACP (`git-commit-formatter`) religiously. Git makes commits cheap and
  reversible, so commit every self-contained, tested, single-purpose change as
  soon as it is green. Never sit on uncommitted work or batch unrelated changes.
  Tidy noisy history later with `smart-squash`.
- Committing is always fine. **Pushing** depends on repo context (shared branch,
  protected main, CI cost, ownership): check the repo's norms and ask if unsure.
- Read `git-safety-guardrails` before any git operation (GPG signing on, no
  interactive editors, prompts suppressed).
- Use `using-git-worktrees` for feature work needing isolation, parallel
  branches, sub-agent writers, or before executing a plan. Work in a worktree,
  not by switching branches in the main checkout. Close out with
  `finishing-a-development-branch`.

## Skills to apply by situation

- **Design/planning**: `brainstorming` before creative work; `writing-plans` for
  multi-step tasks; `executing-plans` to run them;
  `architecture-decision-records` for significant decisions.
- **Debugging**: `systematic-debugging` before proposing any fix.
- **Review**: `requesting-code-review` before merging;
  `receiving-code-review` before acting on feedback; `test-design-review` for
  reviewing tests.
- **Code exploration**: `codemap`, `ast-grep` (`sg`), `git-forensics`,
  `git-repo-discovery`.
- **Tooling**: `uv` instead of pip/venv; `justfile-assistant` for task runners;
  `github-cli` for GitHub; `aws-cli`, `terraform-dev`, `tfc-api` for infra.
- **Tasks/memory**: `todo-navigator` for backlog; `lessons-learned` and
  `software-design-principles` to capture takeaways.
- **Research/web**: `web-to-markdown` to ingest URLs/documents;
  `native-web-search` for quick research.
- **Interactive/long-running CLIs** (REPLs, debuggers, prompts needing
  keystrokes): `tmux-remote-control`. For non-interactive long-running
  commands use pi's `bg_run`, not tmux.

## Delegation and background work: use pi-native tools

- Use pi's built-in extensions, not the `*-sub-agent`, `dispatching-parallel-agents`
  or `subagent-driven-development` skills:
  - `bg_delegate` for read-only background investigation seeded with the
    current conversation (retrieve with `bg_result`).
  - `subagents_enable` then `subagent` for specialist, review or parallel work,
    only when the request or instructions authorise delegation.
  - `bg_run` for long-running commands (tests, builds, servers); don't poll,
    wait for the completion notification.
  - `fusion_*` for multi-model reasoning, research and validation.
- Parallel writers still need isolation: give each its own worktree
  (`using-git-worktrees`).
