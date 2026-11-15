"""Shared contract for every /doc template type, run through `template.py <type> in.json out.html`."""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from doc_helpers import (GATE, REPO, TEMPLATES_DIR, data_of, escaped, fixture_doc, load_kernel, page_script,
                         recipe_of, render, render_ok, scripts)

TEMPLATES = ["readout", "decision"]  # wave 2 adds "epicmap" here and to CASES

CASES = {
    "readout": {"text_field": "problem", "nested": ("nodes", 0, "plain"), "nested_path": "nodes[0].plain",
                "author_item": lambda d: d["nodes"][0], "author_path": "nodes[0].basis", "authored": "nodes"},
    "decision": {"text_field": "why", "nested": ("options", 0, "con"), "nested_path": "options[0].con",
                 "author_item": lambda d: d["facts"][0], "author_path": "facts[0].basis", "authored": "facts"},
}
STYLE_KEYS = ["brand", "theme", "style", "styles", "css", "stylesheet", "color", "colour", "colors",
              "colours", "font", "fonts", "palette"]


KERNEL = load_kernel()


@pytest.fixture(params=TEMPLATES)
def name(request):
    return request.param


@pytest.fixture
def case(name):
    return CASES[name]


def strip_recipe(page):
    return re.sub(r'<script type="application/json" id="recipe">.*?</script>', "", page, flags=re.S)


def fails(name, doc, tmp_path):
    result, out = render(name, doc, tmp_path)
    assert result.returncode != 0 and not out.exists(), "expected the build to fail"
    return result.stderr


# 0. the dispatcher itself

def test_every_template_has_its_cases():
    assert sorted(CASES) == sorted(TEMPLATES)


def test_unknown_type_is_an_error(tmp_path):
    result, _ = render("nope", fixture_doc("readout"), tmp_path)
    assert result.returncode != 0 and result.stderr.startswith("error: ") and "nope" in result.stderr


@pytest.mark.parametrize("args", [[], ["readout"], ["readout", "in.json"], ["readout", "a", "b", "c"]])
def test_bad_arguments_are_an_error(args):
    result = subprocess.run([sys.executable, str(TEMPLATES_DIR / "template.py"), *args], capture_output=True, text=True)
    assert result.returncode != 0 and result.stderr.startswith("error: ")


def test_unreadable_input_is_an_error(name, tmp_path):
    result = subprocess.run([sys.executable, str(TEMPLATES_DIR / "template.py"), name, str(tmp_path / "none.json"),
                             str(tmp_path / "o.html")], capture_output=True, text=True)
    assert result.returncode != 0 and result.stderr.startswith("error: cannot read")


def test_works_from_any_working_directory(name, tmp_path):
    work = tmp_path / "elsewhere"
    work.mkdir()
    result, out = render(name, fixture_doc(name), tmp_path / "r", cwd=work)
    assert result.returncode == 0, result.stderr
    assert out.exists()


# 1. self-contained page

def test_page_is_self_contained_and_data_parses(name, tmp_path):
    doc = fixture_doc(name)
    page = render_ok(name, doc, tmp_path)
    assert page.lstrip().lower().startswith("<!doctype html>")
    for placeholder in ("__TITLE__", "__DATA__", "__GATE__", "__KERNEL_CSS__", "__KERNEL_JS__", "__RECIPE__"):
        assert placeholder not in page
    assert f"<title>{escaped(doc['meta']['title'])}</title>" in page
    assert data_of(page)["meta"]["title"] == doc["meta"]["title"]
    assert not re.search(r"<script[^>]*\ssrc=|<link\b", page)
    assert not re.search(r"""\b(src|href)\s*=\s*["']?(https?:)?//""", page)


# 2. the gate

def test_gate_text_is_present_once(name, tmp_path):
    page = render_ok(name, fixture_doc(name), tmp_path)
    assert page.count(f"<b>{GATE}</b>") == 1 and "Read-only" in page


@pytest.mark.parametrize("where", ["top", "meta"])
@pytest.mark.parametrize("value", ["", "Approved. Ship it."])
def test_input_cannot_change_or_remove_the_gate(name, tmp_path, where, value):
    doc = fixture_doc(name)
    (doc if where == "top" else doc["meta"])["gate"] = value
    page = render_ok(name, doc, tmp_path)
    assert page.count(GATE) == 1 and "Read-only" in page
    assert "Ship it" not in strip_recipe(page)
    assert "gate" not in data_of(page) and "gate" not in data_of(page)["meta"]


# 3. brand, theme and styling are not input

def forbidden(key, where, doc):
    if where == "top":
        doc[key] = "x"
        return key
    if where == "dict":
        doc["meta"][key] = "x"
        return f"meta.{key}"
    doc["refs"][0][key] = "x"
    return f"refs[0].{key}"


@pytest.mark.parametrize("where", ["top", "dict", "list"])
@pytest.mark.parametrize("key", STYLE_KEYS)
def test_style_keys_are_rejected_naming_the_path(name, tmp_path, key, where):
    doc = fixture_doc(name)
    path = forbidden(key, where, doc)
    err = fails(name, doc, tmp_path)
    assert f"error: {path}: brand, theme and styling are not part of the input" in err


def test_style_keys_are_matched_case_insensitively(name, tmp_path):
    doc = fixture_doc(name)
    doc["meta"]["Brand"] = "x"
    assert "error: meta.Brand:" in fails(name, doc, tmp_path)


def test_style_keys_do_not_trigger_on_ordinary_text(name, tmp_path):
    doc = fixture_doc(name)
    doc["meta"]["foot"] += " The brand colour is not changed here."
    render_ok(name, doc, tmp_path)


# 4. tone

@pytest.mark.parametrize("word", KERNEL.HYPE_WORDS)
def test_every_hype_word_is_rejected_by_name(name, case, tmp_path, word):
    doc = fixture_doc(name)
    doc[case["text_field"]] += f" This is a {word.upper()} plan."
    err = fails(name, doc, tmp_path)
    assert word in err.lower() and case["text_field"] in err


def test_unglossed_jargon_is_rejected_then_accepted_when_glossed(name, case, tmp_path):
    doc = fixture_doc(name)
    doc.setdefault("glossary", {}).pop("TFC", None)
    obj = doc
    *route, leaf = case["nested"]
    for step in route:
        obj = obj[step]
    obj[leaf] = "The TFC run is slow."
    err = fails(name, doc, tmp_path)
    assert "TFC" in err and case["nested_path"] in err
    doc["glossary"]["TFC"] = "the hosted service that runs our infrastructure plans"
    page = render_ok(name, doc, tmp_path)
    assert "In plain words" in page and "TFC" in data_of(page)["glossary"]


@pytest.mark.parametrize("title", ["Simulation: DEMO-7 account", "report: the state of things today",
                                   "Decision: staging queue", "decision: the state of things today",
                                   "Too short to say"])
def test_label_style_titles_are_rejected(name, tmp_path, title):
    doc = fixture_doc(name)
    doc["meta"]["title"] = title
    assert "meta.title" in fails(name, doc, tmp_path)


# 5. references

def test_refs_are_numbered_by_first_citation(name, tmp_path):
    doc = fixture_doc(name)
    data = data_of(render_ok(name, doc, tmp_path))
    assert [r["id"] for r in doc["refs"]] == ["r1", "r2", "r3"]
    assert [(r["id"], r["n"], r["cited"]) for r in data["refs"]] == [("r2", 1, True), ("r1", 2, True), ("r3", 3, False)]


def test_page_links_citations_to_a_references_section(name, tmp_path):
    doc = fixture_doc(name)
    page = render_ok(name, doc, tmp_path)
    data = data_of(page)
    for ref in data["refs"]:
        src = next(r for r in doc["refs"] if r["id"] == ref["id"])
        assert (ref["title"], ref["href"], ref["kind"]) == (src["title"], src["href"], src["kind"])
    assert "[r2]" in json.dumps(data), "citations stay in the text and are linked by the page script"
    assert '"#ref-"' in page and '"ref-"' in page and "References" in page and "also relevant" in page


def test_unknown_citation_fails_naming_path_and_id(name, case, tmp_path):
    doc = fixture_doc(name)
    doc[case["text_field"]] += " See [r9]."
    assert f"error: {case['text_field']}: unknown reference 'r9'" in fails(name, doc, tmp_path)


def test_citation_without_any_refs_fails(name, tmp_path):
    doc = fixture_doc(name)
    doc.pop("refs")
    assert "unknown reference" in fails(name, doc, tmp_path)


BAD_REFS = [
    ("duplicate id", lambda d: d["refs"][1].update(id="r1"), "refs[1].id"),
    ("bad kind", lambda d: d["refs"][0].update(kind="blog"), "refs[0].kind"),
    ("bad id", lambda d: d["refs"][0].update(id="one"), "refs[0].id"),
    ("missing title", lambda d: d["refs"][0].pop("title"), "refs[0].title"),
    ("script href", lambda d: d["refs"][0].update(href="javascript:alert(1)"), "refs[0].href"),
    ("absolute href", lambda d: d["refs"][0].update(href="/home/someone/x.md"), "refs[0].href"),
]


@pytest.mark.parametrize("change,field", [(c, f) for _, c, f in BAD_REFS], ids=[b[0] for b in BAD_REFS])
def test_bad_refs_are_rejected_naming_the_field(name, tmp_path, change, field):
    doc = fixture_doc(name)
    change(doc)
    assert field in fails(name, doc, tmp_path)


def uncited(name):
    return json.loads(re.sub(r" ?\[r\d+\]", "", json.dumps(fixture_doc(name))))


def test_refs_without_citations_are_accepted_and_listed_last(name, tmp_path):
    data = data_of(render_ok(name, uncited(name), tmp_path))
    assert [(r["id"], r["n"], r["cited"]) for r in data["refs"]] == [("r1", 1, False), ("r2", 2, False), ("r3", 3, False)]


def test_refs_are_optional_when_nothing_cites_them(name, tmp_path):
    doc = uncited(name)
    doc.pop("refs")
    assert data_of(render_ok(name, doc, tmp_path))["refs"] == []


# 6. claim labels

def test_every_computed_kpi_is_labelled_derived(name, tmp_path):
    data = data_of(render_ok(name, fixture_doc(name), tmp_path))
    assert data["derived"] and set(data["derived_basis"]) == set(data["derived"])
    assert set(data["derived_basis"].values()) == {"derived"}


def test_derived_labels_cannot_be_set_by_input(name, tmp_path):
    doc = fixture_doc(name)
    doc["derived_basis"] = {"plans": "measured"}
    doc["derived"] = {"plans": 1}
    data = data_of(render_ok(name, doc, tmp_path))
    assert set(data["derived_basis"].values()) == {"derived"} and data["derived"] != {"plans": 1}


def test_author_facts_carry_their_basis_into_the_page(name, case, tmp_path):
    data = data_of(render_ok(name, fixture_doc(name), tmp_path))
    items = data[case["authored"]]
    assert items and all(i["basis"] in ("measured", "judged") for i in items)


@pytest.mark.parametrize("basis", ["derived", "guess", ""])
def test_bad_basis_is_rejected_naming_the_field(name, case, tmp_path, basis):
    doc = fixture_doc(name)
    case["author_item"](doc)["basis"] = basis
    assert case["author_path"] in fails(name, doc, tmp_path)


def test_missing_basis_is_rejected_naming_the_field(name, case, tmp_path):
    doc = fixture_doc(name)
    case["author_item"](doc).pop("basis")
    assert f"error: {case['author_path']}:" in fails(name, doc, tmp_path)


# 7. recipe

def test_recipe_block_describes_how_the_page_was_made(name, tmp_path):
    doc = fixture_doc(name)
    page = render_ok(name, doc, tmp_path)
    recipe = recipe_of(page)
    assert recipe["template"] == f"{name}.html"
    assert recipe["renderer_file"] == f"{name}.py"
    assert re.fullmatch(r"[0-9a-f]{64}", recipe["renderer_sha256"])
    assert recipe["input"] == doc
    assert recipe["rebuild"] == f"python3 doc-render/templates/template.py {name} in.json out.html"
    assert "page alone is not enough" in recipe["note"]
    assert "How this page was made" in page and "<details" in page
    assert "/home/" not in page and str(tmp_path) not in page and str(REPO) not in page


def test_recipe_escapes_markup_in_embedded_input(name, tmp_path):
    doc = fixture_doc(name)
    doc["meta"]["foot"] += " </script><b>x</b>"
    page = render_ok(name, doc, tmp_path)
    assert recipe_of(page)["input"]["meta"]["foot"].endswith("</script><b>x</b>")
    assert page.count("</script>") == page.count("<script")
    assert [attrs.strip() for attrs, _ in scripts(page)].count("") == 1


def changed_copy(tmp_path, filename, marker):
    copied = tmp_path / "templates"
    if not copied.exists():
        shutil.copytree(TEMPLATES_DIR, copied, ignore=shutil.ignore_patterns("__pycache__"))
    with (copied / filename).open("a") as f:
        f.write(marker)
    return copied


MARKERS = {".py": "\n# changed\n", ".css": "\n/* changed */\n", ".js": "\n// changed\n", ".html": "\n<!-- changed -->\n"}


@pytest.mark.parametrize("shared", ["kernel.py", "kernel.css", "kernel.js"])
def test_renderer_hash_changes_when_a_kernel_file_changes(name, tmp_path, shared):
    doc = fixture_doc(name)
    first = recipe_of(render_ok(name, doc, tmp_path / "a"))["renderer_sha256"]
    copied = tmp_path / "same"
    shutil.copytree(TEMPLATES_DIR, copied, ignore=shutil.ignore_patterns("__pycache__"))
    assert recipe_of(render_ok(name, doc, tmp_path / "b", copied))["renderer_sha256"] == first
    changed = changed_copy(tmp_path / "c", shared, MARKERS[Path(shared).suffix])
    assert recipe_of(render_ok(name, doc, tmp_path / "d", changed))["renderer_sha256"] != first


@pytest.mark.parametrize("suffix", [".py", ".html"])
def test_renderer_hash_changes_when_the_template_files_change(name, tmp_path, suffix):
    doc = fixture_doc(name)
    first = recipe_of(render_ok(name, doc, tmp_path / "a"))["renderer_sha256"]
    changed = changed_copy(tmp_path / "c", f"{name}{suffix}", MARKERS[suffix])
    assert recipe_of(render_ok(name, doc, tmp_path / "d", changed))["renderer_sha256"] != first


# 8. offline page, script parses

def test_page_script_stays_offline_and_has_no_innerhtml(name, tmp_path):
    src = page_script(render_ok(name, fixture_doc(name), tmp_path))
    for banned in ("fetch(", "XMLHttpRequest", "WebSocket", "innerHTML"):
        assert banned not in src


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_scripts_parse_under_node(name, tmp_path):
    page = render_ok(name, fixture_doc(name), tmp_path)
    src = page_script(page)
    run = subprocess.run(["node", "-e", "new Function(require('fs').readFileSync(0,'utf8'))"],
                         input=src, capture_output=True, text=True)
    assert run.returncode == 0, run.stderr
    assert isinstance(recipe_of(page), dict)


# 9. mobile and print

def test_page_has_mobile_and_print_blocks_and_print_keeps_gate_and_refs(name, tmp_path):
    page = render_ok(name, fixture_doc(name), tmp_path)
    assert "@media (max-width:768px)" in page and "@media print" in page
    block = page.split("@media print", 1)[1].split("</style>", 1)[0]
    for hidden in re.findall(r"([^{}]+)\{[^}]*display:\s*none", block):
        assert ".gate" not in hidden and "refs" not in hidden
    assert "details.made" in block and "position:static" in block
