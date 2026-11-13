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


class TestWorktreeExport:
    def test_export_from_worktree_is_refused_and_links_nothing(self, sandbox, worktree):
        result = run_manager(worktree, sandbox["home"], "export", MANAGED_FILE)

        assert result.returncode != 0
        assert refusal(sandbox["main"]) in result.stdout + result.stderr
        assert not (sandbox["home"] / MANAGED_FILE).exists()

    def test_allow_worktree_overrides_with_a_warning(self, sandbox, worktree):
        result = run_manager(worktree, sandbox["home"], "export", "--allow-worktree", MANAGED_FILE)

        assert result.returncode == 0, result.stderr
        assert "warning" in result.stderr.lower()
        linked = sandbox["home"] / MANAGED_FILE
        assert linked.stat().st_ino == (worktree / MANAGED_FILE).stat().st_ino

    def test_export_from_main_checkout_succeeds(self, sandbox):
        result = run_manager(sandbox["main"], sandbox["home"], "export", MANAGED_FILE)

        assert result.returncode == 0, result.stderr
        assert (sandbox["home"] / MANAGED_FILE).stat().st_ino == (sandbox["main"] / MANAGED_FILE).stat().st_ino

    def test_dry_run_from_worktree_prints_notice_and_changes_nothing(self, sandbox, worktree):
        result = run_manager(worktree, sandbox["home"], "export", "--dry-run", MANAGED_FILE)

        assert result.returncode == 0, result.stderr
        assert refusal(sandbox["main"]) in result.stdout + result.stderr
        assert list(sandbox["home"].iterdir()) == []

    def test_help_lists_allow_worktree_for_export_and_import(self, sandbox):
        for command in ("export", "import"):
            result = run_manager(sandbox["main"], sandbox["home"], command, "--help")
            assert "--allow-worktree" in result.stdout


class TestWorktreeReadOnlyAndImport:
    def test_status_from_worktree_is_allowed(self, sandbox, worktree):
        result = run_manager(worktree, sandbox["home"], "status", MANAGED_FILE)

        assert result.returncode == 0, result.stderr
        assert "refusing" not in result.stdout + result.stderr

    def test_diff_from_worktree_is_allowed(self, sandbox, worktree):
        result = run_manager(worktree, sandbox["home"], "diff", MANAGED_FILE)

        assert "refusing" not in result.stdout + result.stderr

    def test_import_from_worktree_is_refused_and_leaves_repo_untouched(self, sandbox, worktree):
        (sandbox["home"] / MANAGED_FILE).write_text("edited in home\n")

        result = run_manager(worktree, sandbox["home"], "import", MANAGED_FILE)

        assert result.returncode != 0
        assert refusal(sandbox["main"]) in result.stdout + result.stderr
        assert (worktree / MANAGED_FILE).read_text() == "from repo\n"
        assert (sandbox["home"] / MANAGED_FILE).read_text() == "edited in home\n"


class TestCanonicalCheckout:
    @pytest.fixture
    def stray(self, sandbox):
        path = sandbox["root"] / "stray"
        subprocess.run(["git", "clone", str(sandbox["main"]), str(path)], check=True, capture_output=True)
        return path.resolve()

    def test_stray_clone_is_refused_when_repo_root_env_names_another_checkout(self, sandbox, stray):
        result = run_manager(
            stray, sandbox["home"], "export", MANAGED_FILE,
            extra_env={"DOTFILES_REPO_ROOT": str(sandbox["main"])},
        )

        assert result.returncode != 0
        assert refusal(sandbox["main"]) in result.stdout + result.stderr
        assert not (sandbox["home"] / MANAGED_FILE).exists()

    def test_stray_clone_is_refused_when_dotfiles_toml_sets_repo_root(self, sandbox, stray):
        (stray / ".dotfiles.toml").write_text(f'repo_root = "{sandbox["main"]}"\n{EXCLUSIONS_ONLY_TOML}')

        result = run_manager(stray, sandbox["home"], "export", MANAGED_FILE)

        assert result.returncode != 0
        assert refusal(sandbox["main"]) in result.stdout + result.stderr
        assert not (sandbox["home"] / MANAGED_FILE).exists()

    def test_main_checkout_named_by_repo_root_is_allowed(self, sandbox):
        result = run_manager(
            sandbox["main"], sandbox["home"], "export", MANAGED_FILE,
            extra_env={"DOTFILES_REPO_ROOT": str(sandbox["main"])},
        )

        assert result.returncode == 0, result.stderr

    def test_non_default_branch_in_main_checkout_only_warns(self, sandbox):
        git(sandbox["main"], "checkout", "-b", "topic")

        result = run_manager(sandbox["main"], sandbox["home"], "export", MANAGED_FILE)

        assert result.returncode == 0, result.stderr
        assert "topic" in result.stderr
        assert (sandbox["home"] / MANAGED_FILE).exists()
