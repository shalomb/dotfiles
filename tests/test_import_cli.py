"""End-to-end `import` behaviour via the real CLI, a temp HOME and the real config."""

import os
import subprocess
import sys
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parent.parent / "src"
REAL_CONFIG = Path(__file__).resolve().parent.parent / ".dotfiles.toml"


@pytest.fixture
def env(tmp_path: Path):
    home, repo = tmp_path / "home", tmp_path / "repo"
    home.mkdir()
    repo.mkdir()
    (repo / ".dotfiles.toml").write_text(
        REAL_CONFIG.read_text()  # real config already carries the [import] deny list
    )
    agent = home / ".pi" / "agent"
    (agent / "sessions").mkdir(parents=True)
    (agent / "AGENTS.md").write_text("rules")
    (agent / "settings.json").write_text("{}")
    (agent / "auth.json").write_text("SECRET")
    (agent / "sessions" / "1.jsonl").write_text("SECRET")

    def run(*args: str):
        e = {**os.environ, "HOME": str(home), "PYTHONPATH": str(SRC)}
        return subprocess.run(
            [sys.executable, "-m", "dotfile_manager", *args],
            cwd=repo, env=e, capture_output=True, text=True,
        )

    return home, repo, run


def test_import_directory_hardlinks_everything_except_the_deny_list(env):
    home, repo, run = env

    result = run("import", ".pi/agent/")

    assert result.returncode == 0, result.stderr
    for name in ("AGENTS.md", "settings.json"):  # *.md must not be swallowed
        src, dst = home / ".pi/agent" / name, repo / ".pi/agent" / name
        assert dst.read_text() == src.read_text()
        assert dst.samefile(src) and dst.stat().st_nlink == 2
    assert not (repo / ".pi/agent/auth.json").exists()
    assert not (repo / ".pi/agent/sessions").exists()


def test_import_accepts_tilde_and_absolute_paths(env):
    home, repo, run = env

    assert run("import", "~/.pi/agent/settings.json").returncode == 0
    assert run("import", str(home / ".pi/agent/AGENTS.md")).returncode == 0

    assert (repo / ".pi/agent/settings.json").samefile(home / ".pi/agent/settings.json")
    assert (repo / ".pi/agent/AGENTS.md").samefile(home / ".pi/agent/AGENTS.md")


def test_import_twice_is_a_noop(env):
    home, repo, run = env
    run("import", ".pi/agent/")

    assert run("import", ".pi/agent/").returncode == 0

    assert (repo / ".pi/agent/settings.json").stat().st_nlink == 2


def test_import_missing_path_fails_loudly(env):
    _, _, run = env

    result = run("import", ".pi/nope")

    assert result.returncode != 0


def test_import_keeps_symlinks_as_symlinks(env):
    home, repo, run = env
    target = home.parent / "elsewhere" / "x"
    target.parent.mkdir()
    target.write_text("payload")
    (home / ".pi/agent/link").symlink_to(target)

    assert run("import", ".pi/agent/link").returncode == 0

    dst = repo / ".pi/agent/link"
    assert dst.is_symlink() and dst.readlink() == target
