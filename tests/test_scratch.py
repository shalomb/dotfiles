"""Behavioural tests for .local/bin/scratch, mirroring tests/features/scratch.feature."""

import os
import stat
import subprocess
from pathlib import Path

import pytest

SCRATCH = Path(__file__).resolve().parent.parent / ".local" / "bin" / "scratch"
GIT_ENV = {
    "GIT_AUTHOR_NAME": "t",
    "GIT_AUTHOR_EMAIL": "t@example.invalid",
    "GIT_COMMITTER_NAME": "t",
    "GIT_COMMITTER_EMAIL": "t@example.invalid",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
}


def git(cwd, *args):
    env = {**os.environ, **GIT_ENV}
    return subprocess.run(
        ["git", *args], cwd=cwd, env=env, check=True, capture_output=True, text=True
    ).stdout


def make_repo(path: Path, remote: str | None = None) -> Path:
    path.mkdir(parents=True)
    git(path, "init", "-q", "-b", "main")
    (path / "README").write_text("x\n")
    git(path, "add", "README")
    git(path, "commit", "-q", "-m", "init")
    if remote:
        git(path, "remote", "add", "origin", remote)
    return path


def add_worktree(repo: Path, name: str) -> Path:
    wt = repo.parent / name
    git(repo, "worktree", "add", "-q", "-b", name, str(wt))
    return wt


def scratch(cwd, root, *args, editor="true"):
    env = {**os.environ, **GIT_ENV, "SCRATCH_ROOT": str(root), "EDITOR": editor}
    env.pop("VISUAL", None)
    return subprocess.run(
        [str(SCRATCH), *args], cwd=cwd, env=env, capture_output=True, text=True
    )


@pytest.fixture
def root(tmp_path):
    return tmp_path / "store"


@pytest.fixture
def repo(tmp_path):
    return make_repo(tmp_path / "work" / "proj", "https://example.invalid/org/proj.git")


def test_scratch_is_executable():
    assert SCRATCH.is_file()
    assert SCRATCH.stat().st_mode & stat.S_IXUSR


def test_note_is_tied_to_repository_and_worktree(tmp_path, repo, root):
    wt = add_worktree(repo, "feat-x")
    result = scratch(wt, root, "ideas")
    assert result.returncode == 0, result.stderr
    note = root / "proj" / "feat-x" / "ideas.md"
    assert note.is_file()


def test_default_note_name_is_notes(repo, root):
    assert scratch(repo, root).returncode == 0
    assert (root / "proj" / "proj" / "notes.md").is_file()


def test_editor_receives_note_path(repo, root, tmp_path):
    stub = tmp_path / "stub"
    log = tmp_path / "args"
    stub.write_text(f'#!/bin/sh\necho "$1" > {log}\n')
    stub.chmod(0o755)
    assert scratch(repo, root, "ideas", editor=str(stub)).returncode == 0
    assert log.read_text().strip() == str(root / "proj" / "proj" / "ideas.md")


def test_notes_never_dirty_repository(repo, root, tmp_path):
    stub = tmp_path / "append"
    stub.write_text('#!/bin/sh\necho edit >> "$1"\n')
    stub.chmod(0o755)
    for _ in range(10):
        assert scratch(repo, root, "ideas", editor=str(stub)).returncode == 0
    assert git(repo, "status", "--porcelain") == ""
    note = root / "proj" / "proj" / "ideas.md"
    assert note.read_text().count("edit") == 10


def test_agent_finds_current_note_path(repo, root):
    scratch(repo, root, "ideas")
    result = scratch(repo, root, "path", "ideas")
    assert result.returncode == 0
    assert result.stdout.strip() == str(root / "proj" / "proj" / "ideas.md")


def test_path_defaults_to_notes_and_creates_no_file(repo, root):
    result = scratch(repo, root, "path")
    assert result.stdout.strip() == str(root / "proj" / "proj" / "notes.md")
    assert not Path(result.stdout.strip()).exists()


def test_notes_of_two_worktrees_stay_apart(tmp_path, repo, root):
    x = add_worktree(repo, "feat-x")
    y = add_worktree(repo, "feat-y")
    scratch(x, root, "ideas")
    scratch(y, root, "other")
    result = scratch(x, root, "list")
    assert result.returncode == 0
    assert "ideas" in result.stdout
    assert "other" not in result.stdout
    assert "orphan" not in result.stdout


def test_notes_outlive_removed_worktree_as_orphans(repo, root):
    x = add_worktree(repo, "feat-x")
    scratch(x, root, "ideas")
    git(repo, "worktree", "remove", str(x))
    result = scratch(repo, root, "list")
    lines = [l for l in result.stdout.splitlines() if "ideas" in l]
    assert len(lines) == 1
    assert "orphan" in lines[0]
    assert (root / "proj" / "feat-x" / "ideas.md").is_file()


def test_no_remote_uses_repository_directory_name(tmp_path, root):
    repo = make_repo(tmp_path / "work" / "localrepo")
    assert scratch(repo, root, "ideas").returncode == 0
    assert (root / "localrepo" / "localrepo" / "ideas.md").is_file()


def test_no_remote_slug_is_shared_by_linked_worktrees(tmp_path, root):
    repo = make_repo(tmp_path / "work" / "localrepo")
    x = add_worktree(repo, "feat-x")
    scratch(x, root, "ideas")
    assert (root / "localrepo" / "feat-x" / "ideas.md").is_file()


def test_note_persists_across_fresh_processes(repo, root):
    first = scratch(repo, root, "path", "ideas").stdout.strip()
    scratch(repo, root, "ideas")
    second = scratch(repo, root, "path", "ideas").stdout.strip()
    assert first == second
    assert Path(second).is_file()


def test_uses_no_lock_files_and_stays_outside_git_tree(repo, root):
    scratch(repo, root, "ideas")
    files = [p.name for p in root.rglob("*") if p.is_file()]
    assert files == ["ideas.md"]
    assert not str(root).startswith(str(repo))


def test_outside_git_repo_fails(tmp_path, root):
    plain = tmp_path / "plain"
    plain.mkdir()
    result = scratch(plain, root, "ideas")
    assert result.returncode != 0
    assert not root.exists()


def test_rejects_note_name_escaping_the_store(repo, root):
    result = scratch(repo, root, "path", "../evil")
    assert result.returncode != 0
