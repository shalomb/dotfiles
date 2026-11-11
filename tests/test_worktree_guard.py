"""The manager must not repoint $HOME at a linked worktree or a stray clone.

Every test runs the CLI against a throwaway repo and a throwaway HOME;
the developer's real HOME is never touched.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
MANAGED_FILE = "managed.txt"
# Without a config the default exclusions drop any path containing a "tmp" directory (pytest's tmp_path).
EXCLUSIONS_ONLY_TOML = "[exclusions]\npatterns = []\n"


def git(cwd: Path, *args: str) -> None:
    subprocess.run(
        ["git", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", *args],
        cwd=cwd, check=True, capture_output=True,
    )


@pytest.fixture
def sandbox(tmp_path):
    """A main checkout (branch main) with one tracked file, plus an empty HOME."""
    home = tmp_path / "home"
    home.mkdir()
    main = tmp_path / "main"
    main.mkdir()
    git(main, "init", "-b", "main")
    git(main, "config", "user.name", "t")
    git(main, "config", "user.email", "t@example.com")
    (main / MANAGED_FILE).write_text("from repo\n")
    (main / ".dotfiles.toml").write_text(EXCLUSIONS_ONLY_TOML)
    git(main, "add", MANAGED_FILE, ".dotfiles.toml")
    git(main, "commit", "-m", "init")
    return {"root": tmp_path, "home": home, "main": main.resolve()}


@pytest.fixture
def worktree(sandbox):
    path = sandbox["root"] / "wt"
    git(sandbox["main"], "worktree", "add", "-b", "feature", str(path))
    return path.resolve()


def run_manager(cwd: Path, home: Path, *args: str, extra_env=None):
    env = {k: v for k, v in os.environ.items() if k != "DOTFILES_REPO_ROOT"}
    env.update(HOME=str(home), PYTHONPATH=str(SRC_DIR), COLUMNS="500")
    env.update(extra_env or {})
    return subprocess.run(
        [sys.executable, "-m", "dotfile_manager", *args],
        cwd=cwd, env=env, capture_output=True, text=True,
    )


def refusal(path: Path) -> str:
    return f"refusing: run from the main checkout {path}"


class TestDryRun:
    def test_dry_run_from_main_checkout_changes_nothing(self, sandbox):
        result = run_manager(sandbox["main"], sandbox["home"], "export", "--dry-run", MANAGED_FILE)

        assert result.returncode == 0, result.stderr
        assert list(sandbox["home"].iterdir()) == []
