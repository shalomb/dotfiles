"""Behavioural tests for docs/prototypes/readout_render.py on a synthetic read-out."""
import copy
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "docs" / "prototypes" / "readout_render.py"
FIXTURE = Path(__file__).parent / "fixtures" / "readout" / "sample.json"
GATE = "Nothing here is approved."
READ_ONLY = "Read-only"


def fixture_doc():
    return json.loads(FIXTURE.read_text())


def render(doc, tmp_path):
    src, out = tmp_path / "in.json", tmp_path / "out" / "page.html"
    src.write_text(json.dumps(doc))
    result = subprocess.run([sys.executable, str(SCRIPT), str(src), str(out)],
                            capture_output=True, text=True)
    return result, out


def render_ok(doc, tmp_path):
    result, out = render(doc, tmp_path)
    assert result.returncode == 0, result.stderr
    return out.read_text()


def data_of(html):
    start = html.index("const DATA=") + len("const DATA=")
    return json.JSONDecoder().raw_decode(html[start:])[0]


@pytest.fixture
def page(tmp_path):
    return render_ok(fixture_doc(), tmp_path)


@pytest.fixture
def data(page):
    return data_of(page)


def test_page_is_self_contained_and_data_parses(page, data):
    assert page.lstrip().lower().startswith("<!doctype html>")
    assert "__DATA__" not in page
    assert fixture_doc()["meta"]["title"] in page
    assert data["meta"]["title"] == fixture_doc()["meta"]["title"]


def test_plan_count_is_product_of_options(page, data):
    assert data["derived"]["plans"] == 27
    assert data["derived"]["layers"] == 5
    assert data["derived"]["conflicts"] == 2
    assert data["derived"]["choices"] == 3
    assert GATE in page and READ_ONLY in page


@pytest.mark.parametrize("tamper", ["meta", "top"])
def test_gate_cannot_be_removed(tamper, tmp_path):
    doc = fixture_doc()
    if tamper == "meta":
        doc["meta"]["gate"] = ""
    else:
        doc["gate"] = "Approved. Ship it."
    page = render_ok(doc, tmp_path)
    assert page.count(GATE) == 1 and READ_ONLY in page
    assert "Ship it" not in page
    assert "gate" not in data_of(page) and "gate" not in data_of(page)["meta"]


def test_nodes_sit_in_layer_columns_and_conflicts_are_edges(data):
    doc = fixture_doc()
    by_id = {n["id"]: n for n in data["nodes"]}
    for src in doc["nodes"]:
        assert by_id[src["id"]]["col"] == src["layer"]
    same_layer = [n for n in data["nodes"] if n["col"] == 3]
    assert sorted(n["row"] for n in same_layer) == [0, 1]
    conflicts = [e for e in data["edges"] if e["kind"] == "conflict"]
    assert {(e["a"], e["b"], e["label"]) for e in conflicts} == {("t", "d", "scope?"), ("w", "b", "duplicate?")}
    assert len([e for e in data["edges"] if e["kind"] == "link"]) == 5


BAD_INPUTS = [
    ("rag", lambda d: d["nodes"][0].update(rag="X"), "nodes[0].rag"),
    ("layer", lambda d: d["nodes"][1].update(layer=9), "nodes[1].layer"),
    ("conflict", lambda d: d["conflicts"][0].update(a="zz"), "conflicts[0].a"),
    ("link", lambda d: d["links"].append(["t", "zz"]), "links[5]"),
    ("one-option", lambda d: d["choices"][0].update(options=d["choices"][0]["options"][:1]), "choices[0].options"),
    ("feeds", lambda d: d["nodes"][0].update(feeds=["Z"]), "nodes[0].feeds"),
    ("roam", lambda d: d["risks"][0].update(roam="MAYBE"), "risks[0].roam"),
    ("missing", lambda d: d["meta"].pop("lede"), "meta.lede"),
]


@pytest.mark.parametrize("mutate,field", [(m, f) for _, m, f in BAD_INPUTS], ids=[i for i, _, _ in BAD_INPUTS])
def test_validation_failure_names_the_field(mutate, field, tmp_path):
    doc = copy.deepcopy(fixture_doc())
    mutate(doc)
    result, out = render(doc, tmp_path)
    assert result.returncode != 0
    assert field in result.stderr
    assert not out.exists()


def test_hype_word_is_rejected_by_name(tmp_path):
    doc = fixture_doc()
    doc["problem"] = "This is a Robust plan."
    result, _ = render(doc, tmp_path)
    assert result.returncode != 0
    assert "robust" in result.stderr.lower() and "problem" in result.stderr


def test_unglossed_jargon_is_rejected_then_accepted_when_glossed(tmp_path):
    doc = fixture_doc()
    doc["nodes"][0]["plain"] = "The TFC run is slow."
    result, _ = render(doc, tmp_path)
    assert result.returncode != 0
    assert "TFC" in result.stderr and "nodes[0].plain" in result.stderr
    doc["glossary"]["TFC"] = "the hosted service that runs our infrastructure plans"
    page = render_ok(doc, tmp_path)
    assert "In plain words" in page
    assert "TFC" in data_of(page)["glossary"]


def test_finding_title_rule(tmp_path):
    for bad in ("Simulation: DEMO-7 account", "report: the state of things today", "Too short to say"):
        doc = fixture_doc()
        doc["meta"]["title"] = bad
        result, _ = render(doc, tmp_path)
        assert result.returncode != 0, bad
        assert "meta.title" in result.stderr


def test_suggestion_options_are_tagged_and_footer_says_untested(page, data):
    suggested = [o["id"] for c in data["choices"] for o in c["options"] if o.get("suggestion")]
    assert suggested == ["A3"]
    assert data["derived"]["suggestions"] == 1
    assert 'text:"suggestion"' in page
    assert "untested" in page


def test_no_network_no_innerhtml_no_external_refs(page):
    for banned in ("fetch(", "XMLHttpRequest", "WebSocket", "innerHTML"):
        assert banned not in page
    assert not re.search(r"""<link\b""", page)
    assert not re.search(r"""\b(src|href)\s*=\s*["']?(https?:)?//""", page)


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_page_script_parses(page):
    src = re.search(r"<script>(.*)</script>", page, re.S).group(1)
    result = subprocess.run(["node", "-e", "new Function(process.env.SRC)"],
                            env={**os.environ, "SRC": src}, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
