"""Behavioural tests for the headless `doc` CLI (.local/bin/doc) against a temp DOC_ROOT."""
import json
import os
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

DOC = Path(__file__).resolve().parents[2] / ".local" / "bin" / "doc"

CARDS = [
    dict(title="Connecting product teams", kind="brief", date="2026-11-14",
         summary="Agree one way to route requests.", tags=["takos", "triage"],
         repo="acme/infra", origin="/home/someone/acme/infra/.worktrees/rr/six-pager.md"),
    dict(title="Weekly status", kind="status", date="2026-11-10",
         summary="Green across the board.", tags=["weekly"], repo="", origin="/tmp/status.md"),
    dict(title="Database decision", kind="decision", date="2026-10-01",
         summary="Pick postgres.", tags=["takos", "db"], repo="acme/db", origin="/home/someone/db.md"),
]


def slug(title):
    return title.lower().replace(" ", "-")


@pytest.fixture
def root(tmp_path):
    r = tmp_path / "docs"
    index = []
    for c in CARDS:
        name = f"{c['date']}-{slug(c['title'])}"
        d = r / c["kind"] / name
        (d / "versions").mkdir(parents=True)
        (d / "index.html").write_text(f"<html>{c['title']}</html>")
        (d / "meta.json").write_text(json.dumps(c))
        (d / "versions" / "old.html").write_text("old")
        if c["kind"] != "status":  # status has no source.md
            (d / "source.md").write_text(f"# {c['title']}\n\nbody\n")
        (d / "assets").mkdir()
        (d / "assets" / "pic.txt").write_text("asset")
        index.append({**c, "path": f"{c['kind']}/{name}/index.html"})
    (r / "index.json").write_text(json.dumps(index))
    return r


def run(root, *args, env=None, cwd=None):
    e = {**os.environ, "DOC_ROOT": str(root)}
    e.update(env or {})
    return subprocess.run([sys.executable, str(DOC), *args], capture_output=True, text=True, env=e, cwd=cwd)


def test_executable_without_suffix():
    assert os.access(DOC, os.X_OK)
    assert DOC.suffix == ""


def test_list_table_newest_first(root):
    r = run(root, "list")
    assert r.returncode == 0
    lines = r.stdout.strip().splitlines()
    assert lines[0].split()[:2] == ["DATE", "KIND"]
    assert "Connecting product teams" in lines[1]
    assert "Database decision" in lines[3]


def test_list_filters_tag_and_kind(root):
    r = run(root, "list", "--tag", "takos", "--json")
    assert {d["title"] for d in json.loads(r.stdout)} == {"Connecting product teams", "Database decision"}
    r = run(root, "list", "--tag", "takos", "--kind", "decision", "--json")
    assert [d["title"] for d in json.loads(r.stdout)] == ["Database decision"]
    assert json.loads(run(root, "list", "--tag", "nope", "--json").stdout) == []


def test_list_paths_are_absolute_index_html(root):
    r = run(root, "list", "--paths")
    paths = r.stdout.split()
    assert len(paths) == 3
    assert all(Path(p).is_absolute() and Path(p).name == "index.html" and Path(p).exists() for p in paths)


def test_json_cards_carry_id_and_absolute_path(root):
    cards = json.loads(run(root, "list", "--json").stdout)
    first = cards[0]
    assert first["id"] == "2026-11-14-connecting-product-teams"
    assert first["abs_path"] == str(root / "brief" / first["id"] / "index.html")


def test_find_matches_all_words_across_fields(root):
    r = run(root, "find", "postgres", "takos", "--json")
    assert [d["title"] for d in json.loads(r.stdout)] == ["Database decision"]
    assert run(root, "find", "TRIAGE", "--paths").stdout.count("index.html") == 1
    assert json.loads(run(root, "find", "zzz", "--json").stdout) == []


def test_origin_by_id_reports_repo_worktree_source(root):
    r = run(root, "origin", "2026-11-14-connecting-product-teams", "--json")
    o = json.loads(r.stdout)
    assert o["repo"] == "acme/infra"
    assert o["origin"] == CARDS[0]["origin"]
    assert "worktree" in o


def test_origin_paths_only_and_table(root):
    assert run(root, "origin", "database-decision", "--paths").stdout.strip() == "/home/someone/db.md"
    out = run(root, "origin", "database-decision").stdout
    assert "repo" in out and "acme/db" in out


def test_origin_resolves_by_path_to_index_html_or_dir(root):
    d = root / "decision" / "2026-10-01-database-decision"
    for ref in (d / "index.html", d):
        assert run(root, "origin", str(ref), "--paths").stdout.strip() == "/home/someone/db.md"


def test_origin_worktree_detected_for_local_git_checkout(root, tmp_path):
    repo = tmp_path / "wt"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    (repo / "x.md").write_text("x")
    cards = json.loads((root / "index.json").read_text())
    cards[0]["origin"] = str(repo / "x.md")
    (root / "index.json").write_text(json.dumps(cards))
    o = json.loads(run(root, "origin", "connecting", "--json").stdout)
    assert Path(o["worktree"]).resolve() == repo.resolve()


def test_source_prints_markdown_or_path(root):
    assert "# Database decision" in run(root, "source", "database-decision").stdout
    p = run(root, "source", "database-decision", "--paths").stdout.strip()
    assert p == str(root / "decision" / "2026-10-01-database-decision" / "source.md")
    j = json.loads(run(root, "source", "database-decision", "--json").stdout)
    assert j["path"] == p and "body" in j["content"]


def test_source_missing_fails(root):
    r = run(root, "source", "weekly-status")
    assert r.returncode == 1 and "no source" in r.stderr.lower()


def test_unknown_and_ambiguous_ids(root):
    r = run(root, "origin", "nonexistent")
    assert r.returncode == 1 and "no document" in r.stderr.lower()
    r = run(root, "origin", "2026-1")  # prefix matches several
    assert r.returncode == 2 and "ambiguous" in r.stderr.lower()


def test_export_zip_contents_exclude_versions_and_private_origin(root, tmp_path):
    out = tmp_path / "out.zip"
    r = run(root, "export", "database-decision", "--zip", "-o", str(out), cwd=tmp_path)
    assert r.returncode == 0, r.stderr
    assert r.stdout.strip() == str(out)
    with zipfile.ZipFile(out) as z:
        names = set(z.namelist())
        assert {"index.html", "source.md", "meta.json", "assets/pic.txt"} <= names
        assert not any(n.startswith("versions/") for n in names)
        meta = json.loads(z.read("meta.json"))
        assert "/home/someone" not in json.dumps(meta)
        assert meta["origin"] == "db.md"
        assert meta["title"] == "Database decision"


def test_export_requires_zip_flag(root):
    assert run(root, "export", "database-decision").returncode == 2


def test_export_default_destination_is_outside_doc_dirs_and_cwd(root, tmp_path):
    cwd = tmp_path / "cwd"
    cwd.mkdir()
    r = run(root, "export", "database-decision", "--zip", cwd=cwd)
    assert r.returncode == 0, r.stderr
    z = Path(r.stdout.strip())
    assert z.exists() and cwd not in z.parents
    assert list(cwd.iterdir()) == []
    assert root not in z.parents


def test_export_refuses_destination_inside_git_tree(root, tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    r = run(root, "export", "database-decision", "--zip", "-o", str(repo / "x.zip"))
    assert r.returncode == 2 and "git" in r.stderr.lower()
    assert not (repo / "x.zip").exists()


def test_doc_root_precedence(tmp_path, root):
    other = tmp_path / "other"
    other.mkdir()
    (other / "index.json").write_text("[]")
    # DOC_ROOT beats LEAD_DOCS_ROOT
    r = run(root, "list", "--json", env={"LEAD_DOCS_ROOT": str(other)})
    assert len(json.loads(r.stdout)) == 3
    # LEAD_DOCS_ROOT beats XDG_CACHE_HOME
    env = {k: v for k, v in os.environ.items() if k not in ("DOC_ROOT",)}
    env.update(LEAD_DOCS_ROOT=str(other), XDG_CACHE_HOME=str(tmp_path / "xdg"))
    r = subprocess.run([sys.executable, str(DOC), "list", "--json"], capture_output=True, text=True, env=env)
    assert json.loads(r.stdout) == []
    # XDG fallback
    xdg = tmp_path / "xdg"
    (xdg / "agent-skills" / "docs").mkdir(parents=True)
    (xdg / "agent-skills" / "docs" / "index.json").write_text(json.dumps([CARDS[1] | {"path": "status/x/index.html"}]))
    env.pop("LEAD_DOCS_ROOT")
    r = subprocess.run([sys.executable, str(DOC), "list", "--json"], capture_output=True, text=True, env=env)
    assert [d["title"] for d in json.loads(r.stdout)] == ["Weekly status"]


def test_missing_index_json_is_a_clear_error(tmp_path):
    r = run(tmp_path / "empty", "list")
    assert r.returncode == 1 and "index.json" in r.stderr


def test_read_only_never_modifies_store(root):
    before = sorted((p.relative_to(root), p.stat().st_mtime_ns) for p in root.rglob("*"))
    for args in (["list"], ["find", "takos"], ["origin", "database-decision"], ["source", "database-decision"],
                 ["export", "database-decision", "--zip"]):
        run(root, *args)
    after = sorted((p.relative_to(root), p.stat().st_mtime_ns) for p in root.rglob("*"))
    assert before == after
