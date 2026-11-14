"""Behavioural tests for docs/prototypes/epic_map_from_jira.py on a synthetic Jira cache."""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "docs" / "prototypes" / "epic_map_from_jira.py"
FIXTURE = Path(__file__).parent / "fixtures" / "jira_epic"
FOCUS = "DEMO-1"


def run_map(cache, focus, out):
    return subprocess.run([sys.executable, str(SCRIPT), str(cache), focus, str(out)],
                          capture_output=True, text=True)


def data_of(html):
    start = html.index("const DATA=") + len("const DATA=")
    return json.JSONDecoder().raw_decode(html[start:])[0]


@pytest.fixture
def cache(tmp_path):
    dest = tmp_path / "cache"
    shutil.copytree(FIXTURE, dest)
    return dest


@pytest.fixture
def page(cache, tmp_path):
    out = tmp_path / "out" / "map.html"
    result = run_map(cache, FOCUS, out)
    assert result.returncode == 0, result.stderr
    return out.read_text()


@pytest.fixture
def data(page):
    return data_of(page)


def node(data, key):
    return next(n for n in data["top"]["nodes"] if n["id"] == key)


def edge(data, src, dst):
    return next(e for e in data["top"]["edges"] if e[0] == src and e[1] == dst)


def test_page_is_self_contained(page, tmp_path):
    assert len(list((tmp_path / "out").iterdir())) == 1
    assert not re.search(r"<link[^>]+href=[\"']?https?:", page)
    assert not re.search(r"<script[^>]+src=", page)
    assert data_of(page)["top"]["title"] == "Shared intake queue"
    assert "Shared intake queue" in page


def test_front_page_structure(data):
    assert data["top"]["cols"] == ["Blocked by", "This epic", "Unblocks", "Related"]
    nodes = {n["id"]: n for n in data["top"]["nodes"]}
    assert set(nodes) == {"DEMO-1", "DEMO-2", "DEMO-3", "DEMO-4", "DEMO-5", "DEMO-6"}
    assert nodes["DEMO-2"]["x"] == nodes["DEMO-3"]["x"] < nodes[FOCUS]["x"] < nodes["DEMO-4"]["x"]
    for blocker in ("DEMO-2", "DEMO-3"):
        assert edge(data, blocker, FOCUS)[2] == "blocks"
    assert edge(data, "DEMO-2", FOCUS)[3] == 1 and nodes["DEMO-2"]["rag"] == "R"
    assert edge(data, "DEMO-3", FOCUS)[3] == 0 and nodes["DEMO-3"]["rag"] == "G"
    assert edge(data, FOCUS, "DEMO-4")[3] == 0
    assert edge(data, FOCUS, "DEMO-5")[3] == 2
    assert nodes["DEMO-6"]["rag"] == "X"


def test_focus_rag_is_amber_with_one_unstarted_blocker(data):
    assert node(data, FOCUS)["rag"] == "A"
    assert data["top"]["rag"] == "A"
    assert "but 1 blocker not started" in data["meta"]["title"]


def test_title_pluralises_blockers(cache, tmp_path):
    lines = (cache / "issues.jsonl").read_text().splitlines()
    focus = json.loads(lines[0])
    focus["fields"]["issuelinks"].append(
        {"type": {"name": "Blocks"}, "inwardIssue": {
            "key": "DEMO-7", "fields": {"summary": "Budget released", "status": {"name": "Funnel"}}}})
    lines[0] = json.dumps(focus)
    (cache / "issues.jsonl").write_text("\n".join(lines) + "\n")
    out = tmp_path / "map.html"
    assert run_map(cache, FOCUS, out).returncode == 0
    assert "but 2 blockers not started" in data_of(out.read_text())["meta"]["title"]


def test_drill_shows_scope_of_cached_neighbour(data):
    drillable = node(data, "DEMO-4")
    assert drillable["drill"] == "DEMO-4"
    assert "drill" not in node(data, "DEMO-3")  # not in the cache
    sub = data["sub"]["DEMO-4"]
    assert sub["cols"] == ["We will produce", "We will not"]
    assert sub["vw"] and sub["vh"]
    produce = [n for n in sub["nodes"] if n["id"].startswith("DEMO-4-p")]
    out_of_scope = [n for n in sub["nodes"] if n["id"].startswith("DEMO-4-n")]
    assert len(produce) == 2 and len(out_of_scope) == 2
    assert all(n["rag"] == "N" and n["s"] == "Not tracked in Jira" for n in produce)
    assert all(n["rag"] == "X" for n in out_of_scope)


def test_click_panel_data_on_focus(data):
    focus = node(data, FOCUS)
    assert "In short" in focus["plain"]
    assert "Every request lands in one queue within a day." in focus["plain"]
    assert focus["needs"] == "Pick the owner of the intake queue."
    assert focus["refs"][0]["href"] == "https://onetakeda.atlassian.net/browse/" + FOCUS
    assert "Ada Example" in focus["h"]


def test_unknown_epic_fails(cache, tmp_path):
    result = run_map(cache, "DEMO-999", tmp_path / "map.html")
    assert result.returncode != 0
    assert "is not in" in result.stderr


def test_missing_cache_fails(tmp_path):
    result = run_map(tmp_path / "nope", FOCUS, tmp_path / "map.html")
    assert result.returncode != 0
    assert "cannot read" in result.stderr


def test_malformed_line_names_line_number(cache, tmp_path):
    path = cache / "issues.jsonl"
    path.write_text(path.read_text() + "{not json\n")
    lines = len(path.read_text().splitlines())
    result = run_map(cache, FOCUS, tmp_path / "map.html")
    assert result.returncode != 0
    assert f"line {lines}" in result.stderr


def test_page_makes_no_network_calls(page):
    script = page[page.index("<script"):]
    for banned in ("fetch(", "XMLHttpRequest", "WebSocket"):
        assert banned not in script
