"""Behavioural tests for docs/prototypes/decision_render.py on a synthetic decision record."""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "docs" / "prototypes" / "decision_render.py"
FIXTURE = Path(__file__).parent / "fixtures" / "decision" / "sample.json"
GATE = "Nothing here is approved."


def fixture_doc():
    return json.loads(FIXTURE.read_text())


def render(doc, tmp_path):
    src, out = tmp_path / "in.json", tmp_path / "out" / "page.html"
    src.write_text(json.dumps(doc))
    result = subprocess.run([sys.executable, str(SCRIPT), str(src), str(out)], capture_output=True, text=True)
    return result, out


def page_data(doc, tmp_path):
    result, out = render(doc, tmp_path)
    assert result.returncode == 0, result.stderr
    html = out.read_text()
    match = re.search(r"const DATA=(\{.*?\});\s*\n", html, re.S)
    assert match, "DATA not found"
    return html, json.loads(match.group(1))


def test_page_is_self_contained(tmp_path):
    html, data = page_data(fixture_doc(), tmp_path)
    assert data["meta"]["title"] in html.replace("&#x27;", "'")
    assert not re.search(r'<script[^>]*\ssrc=|<link[^>]*href=["\']?https?:', html)


def test_countdown_is_derived_from_dates(tmp_path):
    _, data = page_data(fixture_doc(), tmp_path)
    d = data["derived"]
    assert d["days_left"] == 26 and d["options"] == 3 and d["needs"] == 3
    assert d["elapsed_pct"] == 33 and d["ask_by_pct"] == 90


def test_exactly_one_recommendation_is_carried(tmp_path):
    _, data = page_data(fixture_doc(), tmp_path)
    assert [o["id"] for o in data["options"] if o["recommended"]] == ["ask"]


def test_gate_is_fixed_and_cannot_be_overridden(tmp_path):
    for tamper in ({"gate": ""}, {"meta": {**fixture_doc()["meta"], "gate": "Approved."}}):
        html, data = page_data({**fixture_doc(), **tamper}, tmp_path)
        assert GATE in html and "gate" not in data and "gate" not in data["meta"]


def test_reply_is_text_and_never_sent(tmp_path):
    html, data = page_data(fixture_doc(), tmp_path)
    assert data["reply"]["text"].startswith("Re DEMO-12")
    assert "human posts it" in html and "mailto:" not in html


FAILURES = [
    ("no recommendation", lambda d: d["options"][1].pop("recommended"), "options"),
    ("two recommendations", lambda d: d["options"][0].update(recommended=True), "options"),
    ("one option", lambda d: d.update(options=d["options"][:1]), "options"),
    ("missing why", lambda d: d.pop("why"), "why"),
    ("need without by", lambda d: d["needs"][0].pop("by"), "needs[0].by"),
    ("bad date", lambda d: d["deadline"].update(date="10/12/2026"), "deadline.date"),
    ("today after date", lambda d: d["deadline"].update(today="2026-12-11"), "deadline.today"),
    ("ask_by outside range", lambda d: d["deadline"].update(ask_by="2027-01-01"), "deadline.ask_by"),
    ("fact without basis", lambda d: d["facts"][0].pop("basis"), "facts[0].basis"),
    ("reply without text", lambda d: d["reply"].pop("text"), "reply.text"),
]


@pytest.mark.parametrize("name,change,field", FAILURES, ids=[f[0] for f in FAILURES])
def test_validation_failure_names_the_field(tmp_path, name, change, field):
    doc = fixture_doc()
    change(doc)
    result, _ = render(doc, tmp_path)
    assert result.returncode != 0 and field in result.stderr


def test_reply_is_optional(tmp_path):
    doc = fixture_doc()
    doc.pop("reply")
    page_data(doc, tmp_path)


def test_tone_rules(tmp_path):
    doc = fixture_doc()
    doc["why"] = "A seamless way to drop it."
    result, _ = render(doc, tmp_path)
    assert result.returncode != 0 and "seamless" in result.stderr
    doc = fixture_doc()
    doc["options"][0]["con"] = "The ALB keeps billing"
    result, _ = render(doc, tmp_path)
    assert result.returncode != 0 and "ALB" in result.stderr
    doc["glossary"] = {"ALB": "the load balancer"}
    page_data(doc, tmp_path)
    doc = fixture_doc()
    doc["meta"]["title"] = "Decision: staging queue"
    result, _ = render(doc, tmp_path)
    assert result.returncode != 0 and "meta.title" in result.stderr


def test_no_network_or_innerhtml(tmp_path):
    html, _ = page_data(fixture_doc(), tmp_path)
    script = html.split("<script>")[1].split("</script>")[0]
    for banned in ("fetch(", "XMLHttpRequest", "WebSocket", "innerHTML"):
        assert banned not in script


@pytest.mark.skipif(shutil.which("node") is None, reason="node missing")
def test_page_script_parses(tmp_path):
    html, _ = page_data(fixture_doc(), tmp_path)
    src = html.split("<script>")[1].split("</script>")[0]
    run = subprocess.run(["node", "-e", "new Function(require('fs').readFileSync(0,'utf8'))"],
                         input=src, capture_output=True, text=True)
    assert run.returncode == 0, run.stderr
