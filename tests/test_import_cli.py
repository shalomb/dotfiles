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
    target = home / "elsewhere" / "x"
    target.parent.mkdir()
    target.write_text("payload")
    (home / ".pi/agent/link").symlink_to(target)

    assert run("import", ".pi/agent/link").returncode == 0

    dst = repo / ".pi/agent/link"
    assert dst.is_symlink() and dst.readlink() == target


def test_import_refuses_a_denied_file_named_directly(env):
    home, repo, run = env

    result = run("import", ".pi/agent/auth.json")

    assert result.returncode != 0
    assert not (repo / ".pi/agent/auth.json").exists()


def test_import_glob_skips_denied_matches_but_imports_the_rest(env):
    home, repo, run = env

    result = run("import", ".pi/agent/*.json")

    assert result.returncode == 0, result.stderr
    assert (repo / ".pi/agent/settings.json").exists()
    assert not (repo / ".pi/agent/auth.json").exists()


def test_import_refuses_a_denied_directory_used_as_the_root(env):
    home, repo, run = env

    result = run("import", ".pi/agent/sessions")

    assert result.returncode != 0
    assert not (repo / ".pi/agent/sessions").exists()


def test_import_refuses_files_reached_through_a_directory_symlink(env):
    home, repo, run = env
    (home / "slink").symlink_to(home / ".pi/agent/sessions")

    for arg in ("slink/1.jsonl", "slink/*"):
        result = run("import", arg)
        assert result.returncode != 0, arg
    assert not (repo / "slink/1.jsonl").exists()


def test_import_refuses_denied_paths_via_dotdot_chains_and_nested_symlinks(env):
    home, repo, run = env
    agent = home / ".pi/agent"
    (agent / "sub").mkdir()
    (home / "slink").symlink_to(agent / "sessions")
    (home / "chain").symlink_to(home / "slink")
    (home / "d").mkdir()
    (home / "d/inner").symlink_to(agent)
    (home / "dlink").symlink_to(home / "d")

    for arg in (
        ".pi/agent/sub/../auth.json",
        "chain/1.jsonl",
        "chain/*",
        "d/inner/auth.json",
        "dlink/inner/auth.json",
        "dlink/inner/sessions/1.jsonl",
    ):
        assert run("import", arg).returncode != 0, arg
    assert not any(
        p.name in ("auth.json", "1.jsonl") for p in repo.rglob("*") if p.is_file()
    )


def test_import_directory_walk_never_hardlinks_denied_files_via_symlinked_dirs(env):
    home, repo, run = env
    (home / "walk").mkdir()
    (home / "walk/f").write_text("ok")
    (home / "walk/sl").symlink_to(home / ".pi/agent/sessions")
    (home / "walk/ag").symlink_to(home / ".pi/agent")

    run("import", "walk")
    run("import", "walk/*/*")

    leaked = [p for p in repo.rglob("*") if p.name in ("auth.json", "1.jsonl")]
    assert leaked == []


def test_import_parent_directory_honours_path_prefixed_deny_entries(env):
    home, repo, run = env
    pi = home / ".pi"
    for d in ("agent/install/releases", "agent/npm", "agent/missions/index", "tasks"):
        (pi / d).mkdir(parents=True)
        (pi / d / "x.json").write_text("STATE")
    (pi / "agent/npm/.gitignore").write_text("*")

    for arg in (".pi/", ".pi/agent/"):
        assert run("import", arg).returncode == 0
    run("import", ".pi/agent/")

    names = {p.relative_to(repo).as_posix() for p in repo.rglob("*") if p.is_file()}
    assert ".pi/agent/AGENTS.md" in names
    assert not [n for n in names if any(
        s in n for s in ("/install/", "/npm/", "/missions/", ".pi/tasks/"))], names


def test_import_skips_symlinks_that_point_outside_home(env, tmp_path):
    home, repo, run = env
    outside = tmp_path / "other-repo"
    outside.mkdir()
    (outside / "ext.ts").write_text("x")
    ext = home / ".pi/agent/extensions"
    ext.mkdir()
    (ext / "mine.ts").write_text("y")
    (ext / "foreign.ts").symlink_to(outside / "ext.ts")
    (ext / "inside.ts").symlink_to(home / ".pi/agent/settings.json")

    assert run("import", ".pi/agent/extensions/").returncode == 0

    got = repo / ".pi/agent/extensions"
    assert (got / "mine.ts").exists()
    assert (got / "inside.ts").is_symlink()
    assert not (got / "foreign.ts").is_symlink() and not (got / "foreign.ts").exists()
