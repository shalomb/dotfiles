"""Refuse to repoint $HOME at a checkout the pre-commit hook does not validate against."""

import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

ACCEPTED_BRANCHES = ("main", "master", "develop")


@dataclass
class GuardVerdict:
    """Outcome of checking where the manager is being run from."""

    refusal: Optional[str] = None
    warnings: List[str] = field(default_factory=list)


def _git(cwd: Path, *args: str) -> Optional[str]:
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else None


def _git_path(cwd: Path, flag: str) -> Optional[Path]:
    """Resolve a `git rev-parse` path flag (which may be relative to cwd) to a real path."""
    raw = _git(cwd, "rev-parse", flag)
    return (cwd / raw).resolve() if raw else None


def _refusal(main_checkout: Path) -> str:
    return f"refusing: run from the main checkout {main_checkout}"


def check_checkout(repo_root: Path, configured_repo_root: Optional[Path] = None) -> GuardVerdict:
    """Decide whether `repo_root` may export to / import from $HOME.

    Linked worktrees are refused. When `configured_repo_root` is set, any other
    checkout is refused too. A main checkout on an unexpected branch only warns.
    Directories that are not git repositories are not checked.
    """
    verdict = GuardVerdict()
    git_dir = _git_path(repo_root, "--git-dir")
    common_dir = _git_path(repo_root, "--git-common-dir")

    if git_dir is not None and common_dir is not None and git_dir != common_dir:
        verdict.refusal = _refusal(common_dir.parent)
        return verdict

    if configured_repo_root is not None:
        canonical = configured_repo_root.expanduser().resolve()
        if repo_root.resolve() != canonical:
            verdict.refusal = _refusal(canonical)
            return verdict

    if git_dir is not None:
        branch = _git(repo_root, "branch", "--show-current") or "(detached HEAD)"
        if branch not in ACCEPTED_BRANCHES:
            verdict.warnings.append(
                f"warning: main checkout is on branch '{branch}', not one of "
                f"{', '.join(ACCEPTED_BRANCHES)}; exports use this branch's files"
            )
    return verdict
