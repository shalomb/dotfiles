# Handoff: make dotfile_manager refuse exports from a worktree

Branch `feat/dotfile-manager-worktree-guard` (worktree of this file's location,
based on `develop`). Backlog card: `dm-worktree-guard` (`todo claim dm-worktree-guard`).
Work test-first; commit each green step (ACP, Conventional Commits, GPG signed, hooks on).

## Problem
`dotfile_manager export` hardlinks files in `$HOME` to *whichever checkout runs it*
and trusts it. The pre-commit hook (`.config/git/hooks/pre-commit-consistency-check`)
validates `$HOME` against the **main checkout** (`~/.config/dotfiles`). So an export from
a linked worktree repoints `~` at the worktree, and the next commit anywhere is blocked
with "Files not hardlinked ... Repository inode: X, Home inode: Y". Removing the
worktree later leaves `~` linked to orphan inodes. This broke commits twice on 2026-11-11.

Second symptom: exporting from a stale branch uses that branch's `.dotfiles.toml`.
`feat/session-registry` predated `909b446` (re-include `.pi/agent/extensions/*`), so every
`.ts` extension looked excluded and the export silently skipped them.

## Required behaviour (acceptance criteria)
1. `export` and `import` exit non-zero, change nothing, and print
   `refusing: run from the main checkout <path>` when the repo is a **linked worktree**
   (detect: `git rev-parse --git-dir` != `--git-common-dir`; do not shell out
   to parse paths).
2. `--allow-worktree` overrides it (explicit, documented in `--help`).
3. `export --dry-run` and `status`/`diff` from a worktree stay allowed (read-only).
   `--dry-run` should still print the refusal as a notice so the user learns early.
4. Canonical-checkout check: if `repo_root` (new optional key in `.dotfiles.toml`,
   default `~/.config/dotfiles`) is set and the repo is a different, non-worktree
   clone, refuse the same way (stray clones such as prune-stale-clones targets).
5. Non-default branch in the main checkout: warn only (stderr), do not block.
6. Hook message improvement: when files are not hardlinked, name which checkout
   currently owns the links (resolve the home inode back to a path with
   `fd`/`find -samefile` limited to `~/.config/dotfiles*`) and print the exact restore
   command: `cd ~/.config/dotfiles && PYTHONPATH=src uv run python -m dotfile_manager export .config/bash/ .bashrc`.

## Tests (write first, pytest, tmp repo + `git worktree add`)
New file `tests/test_worktree_guard.py`:
- export from worktree: returncode != 0, no links created under a tmp `HOME`.
- same with `--allow-worktree`: succeeds.
- export from main checkout: succeeds (control).
- `--dry-run` from worktree: no side effects, notice printed.
- `status` from worktree: allowed.
- stray clone with `repo_root` configured elsewhere: refused.
- all tests use a tmp `HOME`; never touch the real one (see `tests/conftest.py`).

Existing suites that call the CLI (`tests/test_behavior.py`, `test_orphan_cleanup.py`,
`test_parent_directory_safety.py`) must stay green; check none run from inside a worktree.

## Where to change
- CLI: `src/dotfile_manager/cli.py` (click; `export` ~L26, `import`), add a shared guard
  decorator or a call at the top of both commands.
- Logic: `src/dotfile_manager/core.py` / new `guard.py`; config key in
  `src/dotfile_manager/config.py` (`DotfileConfig`).
- Hook: `.config/git/hooks/pre-commit-consistency-check` (hardlinked to
  `~/.config/git/hooks/`; deploy only from the main checkout, see below).
- Docs: AGENTS.md "Individual File/Directory Deployment" (state the rule and that the
  tool enforces it), `docs/reference/` if flags are documented there.

## Gotchas
- Run the manager as `PYTHONPATH=src uv run python -m dotfile_manager ...`.
- **Do not export from this worktree** (that is the bug). Edit, test, commit here; to
  deploy the hook change, merge, then export from `~/.config/dotfiles`.
- `make test` is now safe to run in a worktree (fixed in 44f6fae on
  `fix/test-no-relink`; if that is not yet on `develop`, do not run `make test`
  here before it merges, or re-export from main afterwards to restore the links).
- 5 pre-existing failures in `make test` (3 `test_tmux.py`, 2 `test_shell_integration.py`)
  also fail on `develop`; not part of this task.
- Never bypass hooks; GPG signing must work (stop and ask if the key is locked).

## Done when
New tests pass, existing manager tests unchanged, `uv run pytest tests/test_worktree_guard.py -q`
green, AGENTS.md updated, `todo done dm-worktree-guard --commit HEAD`.
