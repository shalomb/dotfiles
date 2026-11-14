"""Behavioural tests for docs/prototypes/doc_kernel.py through both renderers, on synthetic fixtures."""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
PROTOTYPES = REPO / "docs" / "prototypes"
FIXTURES = Path(__file__).parent / "fixtures"

CASES = {
    "readout": {"template": "readout.template.html", "text_field": "problem",
                "author_item": lambda d: d["nodes"][0], "author_path": "nodes[0].basis"},
    "decision": {"template": "decision.template.html", "text_field": "why",
                 "author_item": lambda d: d["facts"][0], "author_path": "facts[0].basis"},
}


@pytest.fixture(params=sorted(CASES))
def case(request):
    return {"name": request.param, **CASES[request.param]}


def fixture_doc(case):
    return json.loads((FIXTURES / case["name"] / "sample.json").read_text())


def render(case, doc, tmp_path, prototypes=PROTOTYPES):
    tmp_path.mkdir(exist_ok=True)
    src, out = tmp_path / "in.json", tmp_path / "out" / "page.html"
    src.write_text(json.dumps(doc))
    script = prototypes / f"{case['name']}_render.py"
    result = subprocess.run([sys.executable, str(script), str(src), str(out)], capture_output=True, text=True)
    return result, out


def render_ok(case, doc, tmp_path, prototypes=PROTOTYPES):
    result, out = render(case, doc, tmp_path, prototypes)
    assert result.returncode == 0, result.stderr
    return out.read_text()


def data_of(html):
    start = html.index("const DATA=") + len("const DATA=")
    return json.JSONDecoder().raw_decode(html[start:])[0]


def recipe_of(html):
    match = re.search(r'<script type="application/json" id="recipe">(.*?)</script>', html, re.S)
    assert match, "recipe block missing"
    return json.loads(match.group(1))


def test_refs_are_numbered_by_first_citation(case, tmp_path):
    doc = fixture_doc(case)
    data = data_of(render_ok(case, doc, tmp_path))
    assert [r["id"] for r in doc["refs"]] == ["r1", "r2", "r3"]
    assert [(r["id"], r["n"], r["cited"]) for r in data["refs"]] == [("r2", 1, True), ("r1", 2, True), ("r3", 3, False)]


def test_page_links_citations_to_a_references_section(case, tmp_path):
    doc = fixture_doc(case)
    page = render_ok(case, doc, tmp_path)
    data = data_of(page)
    for ref in data["refs"]:
        src = next(r for r in doc["refs"] if r["id"] == ref["id"])
        assert (ref["title"], ref["href"], ref["kind"]) == (src["title"], src["href"], src["kind"])
    assert "[r2]" in json.dumps(data), "citations stay in the text and are linked by the page script"
    assert '"#ref-"' in page and '"ref-"' in page and "References" in page and "also relevant" in page


def test_unknown_citation_fails_naming_path_and_id(case, tmp_path):
    doc = fixture_doc(case)
    doc[case["text_field"]] += " See [r9]."
    result, out = render(case, doc, tmp_path)
    assert result.returncode != 0 and not out.exists()
    assert f"error: {case['text_field']}: unknown reference 'r9'" in result.stderr


def test_citation_without_any_refs_fails(case, tmp_path):
    doc = fixture_doc(case)
    doc.pop("refs")
    result, _ = render(case, doc, tmp_path)
    assert result.returncode != 0 and "unknown reference" in result.stderr


BAD_REFS = [
    ("duplicate id", lambda d: d["refs"][1].update(id="r1"), "refs[1].id"),
    ("bad kind", lambda d: d["refs"][0].update(kind="blog"), "refs[0].kind"),
    ("bad id", lambda d: d["refs"][0].update(id="one"), "refs[0].id"),
    ("missing title", lambda d: d["refs"][0].pop("title"), "refs[0].title"),
    ("script href", lambda d: d["refs"][0].update(href="javascript:alert(1)"), "refs[0].href"),
    ("absolute href", lambda d: d["refs"][0].update(href="/home/someone/x.md"), "refs[0].href"),
]


@pytest.mark.parametrize("change,field", [(c, f) for _, c, f in BAD_REFS], ids=[b[0] for b in BAD_REFS])
def test_bad_refs_are_rejected_naming_the_field(case, tmp_path, change, field):
    doc = fixture_doc(case)
    change(doc)
    result, out = render(case, doc, tmp_path)
    assert result.returncode != 0 and field in result.stderr and not out.exists()


def test_refs_without_citations_are_accepted_and_listed_last(case, tmp_path):
    doc = json.loads(re.sub(r" ?\[r\d+\]", "", json.dumps(fixture_doc(case))))
    data = data_of(render_ok(case, doc, tmp_path))
    assert [(r["id"], r["n"], r["cited"]) for r in data["refs"]] == [("r1", 1, False), ("r2", 2, False), ("r3", 3, False)]


def test_refs_are_optional_when_nothing_cites_them(case, tmp_path):
    doc = json.loads(re.sub(r" ?\[r\d+\]", "", json.dumps(fixture_doc(case))))
    doc.pop("refs")
    assert data_of(render_ok(case, doc, tmp_path))["refs"] == []


def test_every_computed_kpi_is_labelled_derived(case, tmp_path):
    data = data_of(render_ok(case, fixture_doc(case), tmp_path))
    assert data["derived"] and set(data["derived_basis"]) == set(data["derived"])
    assert set(data["derived_basis"].values()) == {"derived"}


def test_author_facts_carry_their_basis_into_the_page(case, tmp_path):
    doc = fixture_doc(case)
    data = data_of(render_ok(case, doc, tmp_path))
    items = data["nodes"] if case["name"] == "readout" else data["facts"]
    assert items and all(i["basis"] in ("measured", "judged") for i in items)


@pytest.mark.parametrize("basis", ["derived", "guess", ""])
def test_bad_basis_is_rejected_naming_the_field(case, tmp_path, basis):
    doc = fixture_doc(case)
    case["author_item"](doc)["basis"] = basis
    result, _ = render(case, doc, tmp_path)
    assert result.returncode != 0 and case["author_path"] in result.stderr


def test_missing_basis_is_rejected_naming_the_field(case, tmp_path):
    doc = fixture_doc(case)
    case["author_item"](doc).pop("basis")
    result, out = render(case, doc, tmp_path)
    assert result.returncode != 0 and f"error: {case['author_path']}:" in result.stderr and not out.exists()


def test_recipe_block_describes_how_the_page_was_made(case, tmp_path):
    doc = fixture_doc(case)
    page = render_ok(case, doc, tmp_path)
    recipe = recipe_of(page)
    assert recipe["template"] == case["template"]
    assert recipe["renderer_file"] == f"{case['name']}_render.py"
    assert re.fullmatch(r"[0-9a-f]{64}", recipe["renderer_sha256"])
    assert recipe["input"] == doc
    assert f"docs/prototypes/{case['name']}_render.py" in recipe["rebuild"] and "in.json out.html" in recipe["rebuild"]
    assert "page alone is not enough" in recipe["note"]
    assert "How this page was made" in page and "<details" in page
    assert "/home/" not in page and str(tmp_path) not in page and str(REPO) not in page


def test_recipe_escapes_markup_in_embedded_input(case, tmp_path):
    doc = fixture_doc(case)
    doc["meta"]["foot"] += " </script><b>x</b>"
    page = render_ok(case, doc, tmp_path)
    assert recipe_of(page)["input"]["meta"]["foot"].endswith("</script><b>x</b>")
    assert page.count("</script>") == 2


def test_renderer_hash_changes_when_the_kernel_source_changes(case, tmp_path):
    doc = fixture_doc(case)
    first = recipe_of(render_ok(case, doc, tmp_path / "a"))["renderer_sha256"]
    copied = tmp_path / "prototypes"
    shutil.copytree(PROTOTYPES, copied, ignore=shutil.ignore_patterns("__pycache__"))
    assert recipe_of(render_ok(case, doc, tmp_path / "b", copied))["renderer_sha256"] == first
    with (copied / "doc_kernel.py").open("a") as f:
        f.write("\n# changed\n")
    assert recipe_of(render_ok(case, doc, tmp_path / "c", copied))["renderer_sha256"] != first


def test_page_stays_offline_and_script_parses(case, tmp_path):
    page = render_ok(case, fixture_doc(case), tmp_path)
    src = re.search(r"<script>(.*?)</script>", page, re.S).group(1)
    for banned in ("fetch(", "XMLHttpRequest", "WebSocket", "innerHTML"):
        assert banned not in page
    assert not re.search(r'<script[^>]*\ssrc=|<link\b', page)
    if shutil.which("node"):
        run = subprocess.run(["node", "-e", "new Function(require('fs').readFileSync(0,'utf8'))"],
                             input=src, capture_output=True, text=True)
        assert run.returncode == 0, run.stderr
