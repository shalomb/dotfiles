"""Readout-specific behaviour, run through template.py. Shared rules live in test_doc_templates.py."""
import copy
import html
import json
import re
import shutil
import subprocess

import pytest

from doc_helpers import data_of, fixture_doc, render, render_ok

NAME = "readout"


@pytest.fixture
def data(tmp_path):
    return data_of(render_ok(NAME, fixture_doc(NAME), tmp_path))


def test_plan_count_is_product_of_options(data):
    assert data["derived"]["plans"] == 27
    assert data["derived"]["layers"] == 5
    assert data["derived"]["conflicts"] == 2
    assert data["derived"]["choices"] == 3


def test_nodes_sit_in_layer_columns_and_conflicts_are_edges(data):
    doc = fixture_doc(NAME)
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
    ("basis", lambda d: d["nodes"][0].pop("basis"), "nodes[0].basis"),
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
    doc = copy.deepcopy(fixture_doc(NAME))
    mutate(doc)
    result, out = render(NAME, doc, tmp_path)
    assert result.returncode != 0
    assert field in result.stderr
    assert not out.exists()


def test_suggestion_options_are_tagged_and_footer_says_untested(tmp_path):
    page = render_ok(NAME, fixture_doc(NAME), tmp_path)
    data = data_of(page)
    suggested = [o["id"] for c in data["choices"] for o in c["options"] if o.get("suggestion")]
    assert suggested == ["A3"]
    assert data["derived"]["suggestions"] == 1
    assert 'text:"suggestion"' in page
    assert "untested" in page


# ---- D4: the readout on a phone ----

CHROMIUM = shutil.which("chromium-headless-shell") or shutil.which("chromium")
PROBE = """<script>
(function(){
  var w=document.querySelector('.mapwrap'),s=document.getElementById('map'),c=document.getElementById('sum');
  var out={wrap:!!w,overflowX:w?getComputedStyle(w).overflowX:null,
    svgWidth:s.getBoundingClientRect().width,svgMinWidth:parseFloat(getComputedStyle(s).minWidth)||0,
    wrapWidth:w?w.getBoundingClientRect().width:null,sumPosition:getComputedStyle(c).position,
    inWrap:!!(w&&w.contains(s))};
  document.body.setAttribute('data-pos',JSON.stringify(out));
})();
</script>"""


def measure(tmp_path, width):
    out = tmp_path / "out" / "page.html"
    render_ok(NAME, fixture_doc(NAME), tmp_path)
    out.write_text(out.read_text() + PROBE)
    run = subprocess.run([CHROMIUM, "--no-sandbox", "--disable-gpu", "--virtual-time-budget=4000",
                          f"--window-size={width},900", "--dump-dom", f"file://{out}"],
                         capture_output=True, text=True, timeout=90)
    assert run.returncode == 0, run.stderr
    found = re.search(r"data-pos=\"([^\"]*)\"", run.stdout)
    assert found, "probe did not write data-pos"
    return json.loads(html.unescape(found.group(1)))


@pytest.mark.skipif(CHROMIUM is None, reason="no headless chromium")
def test_phone_map_scrolls_sideways_at_a_readable_width(tmp_path):
    pos = measure(tmp_path, 390)
    assert pos["inWrap"] and pos["overflowX"] in ("auto", "scroll")
    assert pos["svgMinWidth"] >= 800 and pos["svgWidth"] >= pos["svgMinWidth"]
    assert pos["wrapWidth"] <= 390


@pytest.mark.skipif(CHROMIUM is None, reason="no headless chromium")
def test_phone_plan_counter_is_not_sticky_or_fixed(tmp_path):
    assert measure(tmp_path, 390)["sumPosition"] not in ("sticky", "fixed")


@pytest.mark.skipif(CHROMIUM is None, reason="no headless chromium")
def test_desktop_plan_counter_is_still_sticky_and_map_fits(tmp_path):
    pos = measure(tmp_path, 1300)
    assert pos["sumPosition"] == "sticky" and pos["svgMinWidth"] == 0
