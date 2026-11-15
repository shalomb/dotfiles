"""Behavioural tests for the epicmap template (template.py epicmap in.json out.html) on synthetic Jira caches.

The shared contract (gate, style keys, recipe hash, offline page, mobile and print) lives in
test_doc_templates.py; this file covers what is specific to the epic map.
"""
import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from doc_helpers import FIXTURES, TEMPLATES_DIR, data_of, load_kernel, page_script, recipe_of, render, render_ok

FIXTURE = FIXTURES / "jira_epic"
FOCUS = "DEMO-1"
BASE = "https://onetakeda.atlassian.net/browse/"
KERNEL = load_kernel()
CHROMIUM = shutil.which("chromium-headless-shell") or shutil.which("chromium")


def render_map(tmp_path, epic=FOCUS, cache="cache", **extra):
    return render("epicmap", {"cache": cache, "epic": epic, **extra}, tmp_path)


@pytest.fixture
def cache(tmp_path):
    dest = tmp_path / "cache"
    shutil.copytree(FIXTURE, dest)
    return dest


@pytest.fixture
def page(cache, tmp_path):
    return render_ok("epicmap", {"cache": "cache", "epic": FOCUS}, tmp_path)


@pytest.fixture
def data(page):
    return data_of(page)


def node(data, key):
    return next(n for n in data["top"]["nodes"] if n["id"] == key)


def edge(data, src, dst):
    return next(e for e in data["top"]["edges"] if e["a"] == src and e["b"] == dst)


def issue(key, summary, status, links=(), description=None, assignee=None):
    return {"key": key, "fields": {"summary": summary, "status": {"name": status},
                                   "assignee": {"displayName": assignee} if assignee else None,
                                   "description": description, "issuelinks": list(links)}}


def link(kind, other, summary, status, outward):
    side = "outwardIssue" if outward else "inwardIssue"
    return {"type": {"name": kind}, side: {"key": other, "fields": {"summary": summary, "status": {"name": status}}}}


def write_cache(path, issues):
    path.mkdir(parents=True, exist_ok=True)
    (path / "issues.jsonl").write_text("\n".join(json.dumps(i) for i in issues) + "\n")


def dense_cache(path, long_title=None):
    """A focus epic with 9 neighbours of mixed roles: 4 blockers, 3 unblocked, 2 related."""
    links = []
    for i in range(4):
        links.append(link("Blocks", f"DEN-{i + 2}", f"Blocker number {i}", ["Funnel", "Done", "Implementing", "Funnel"][i], False))
    for i in range(3):
        links.append(link("Blocks", f"DEN-{i + 6}", long_title if (i == 0 and long_title) else f"Downstream {i}",
                          "Funnel", True))
    for i in range(2):
        links.append(link("Relates", f"DEN-{i + 9}", f"Related item {i}", "Analyzing", True))
    write_cache(path, [issue("DEN-1", "Dense focus", "Implementing", links)])
    return path


def label_box(edge_, width_per_char=6.2, height=14):
    w = width_per_char * len(edge_["label"])
    return (edge_["lx"] - w / 2, edge_["ly"] - height, edge_["lx"] + w / 2, edge_["ly"])


def intersects(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


# ---- kept from the old CLI tests ----

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
        assert edge(data, blocker, FOCUS)["label"] == "blocks"
    assert edge(data, "DEMO-2", FOCUS)["kind"] == 1 and nodes["DEMO-2"]["rag"] == "R"
    assert edge(data, "DEMO-3", FOCUS)["kind"] == 0 and nodes["DEMO-3"]["rag"] == "G"
    assert edge(data, FOCUS, "DEMO-4")["kind"] == 0
    assert edge(data, FOCUS, "DEMO-5")["kind"] == 2
    assert nodes["DEMO-6"]["rag"] == "X"


def test_focus_rag_is_amber_with_one_unstarted_blocker(data):
    assert node(data, FOCUS)["rag"] == "A"
    assert data["top"]["rag"] == "A"
    assert "but 1 blocker not started" in data["meta"]["title"]


def test_title_pluralises_blockers(cache, tmp_path):
    lines = (cache / "issues.jsonl").read_text().splitlines()
    focus = json.loads(lines[0])
    focus["fields"]["issuelinks"].append(link("Blocks", "DEMO-7", "Budget released", "Funnel", False))
    lines[0] = json.dumps(focus)
    (cache / "issues.jsonl").write_text("\n".join(lines) + "\n")
    assert "but 2 blockers not started" in data_of(render_ok("epicmap", {"cache": "cache", "epic": FOCUS}, tmp_path))["meta"]["title"]


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
    ref = next(r for r in data["refs"] if r["id"] == focus["ref"])
    assert ref["href"] == BASE + FOCUS
    assert "Ada Example" in focus["h"]


def test_unknown_epic_fails(cache, tmp_path):
    result, out = render_map(tmp_path, "DEMO-999")
    assert result.returncode != 0 and not out.exists()
    assert "is not in" in result.stderr and result.stderr.startswith("error: epic: ")


def test_missing_cache_fails(tmp_path):
    result, _ = render_map(tmp_path, cache="nope")
    assert result.returncode != 0
    assert "cannot read" in result.stderr and result.stderr.startswith("error: cache: ")


def test_malformed_line_names_line_number(cache, tmp_path):
    path = cache / "issues.jsonl"
    path.write_text(path.read_text() + "{not json\n")
    lines = len(path.read_text().splitlines())
    result, _ = render_map(tmp_path)
    assert result.returncode != 0
    assert f"line {lines}" in result.stderr and result.stderr.startswith("error: cache: ")


def test_page_makes_no_network_calls(page):
    script = page[page.index("<script"):]
    for banned in ("fetch(", "XMLHttpRequest", "WebSocket", "innerHTML"):
        assert banned not in script


# ---- input ----

@pytest.mark.parametrize("change,field", [
    (lambda d: d.pop("cache"), "cache"), (lambda d: d.pop("epic"), "epic"),
    (lambda d: d.update(cache=3), "cache"), (lambda d: d.update(epic=["DEMO-1"]), "epic"),
    (lambda d: d.update(cache=" "), "cache"), (lambda d: d.update(epic=""), "epic"),
])
def test_bad_input_names_the_field(cache, tmp_path, change, field):
    doc = {"cache": "cache", "epic": FOCUS}
    change(doc)
    result, out = render("epicmap", doc, tmp_path)
    assert result.returncode != 0 and not out.exists()
    assert result.stderr.startswith(f"error: {field}: ")


def test_cache_may_be_the_jsonl_file_or_an_absolute_path(cache, tmp_path):
    for n, value in enumerate(("cache/issues.jsonl", str(cache), str(cache / "issues.jsonl"))):
        doc = {"cache": value, "epic": FOCUS}
        if n == 0:
            page = render_ok("epicmap", doc, tmp_path)
        else:  # the input file sits elsewhere, so only the absolute path can find the cache
            page = render_ok("epicmap", doc, tmp_path / f"in{n}")
        assert recipe_of(page)["input"]["cache"] == "cache"


def test_relative_cache_resolves_against_the_input_file_not_the_cwd(tmp_path):
    work = tmp_path / "elsewhere"
    work.mkdir()
    out = tmp_path / "o" / "page.html"
    sample = FIXTURES / "epicmap" / "sample.json"
    result = subprocess.run(["python3", str(TEMPLATES_DIR / "template.py"), "epicmap", str(sample), str(out)],
                            capture_output=True, text=True, cwd=work)
    assert result.returncode == 0, result.stderr
    assert data_of(out.read_text())["top"]["title"] == "Shared intake queue"


def test_unknown_keys_are_dropped(cache, tmp_path):
    page = render_ok("epicmap", {"cache": "cache", "epic": FOCUS, "note": "Ship it", "meta": {"title": "x"}}, tmp_path)
    assert "Ship it" not in page
    assert set(recipe_of(page)["input"]) == {"epic", "cache", "issues", "read_at"}


# ---- kernel adoption ----

def test_gate_constant_and_banner(page):
    assert 'Read-only view of Jira: nothing here is written back. A human decides.' in page
    assert page.count("<b>Nothing here is approved.</b>") == 1


def test_every_issue_shown_is_a_reference_and_panels_cite_it(data):
    refs = {r["id"]: r for r in data["refs"]}
    keys = {n["id"] for n in data["top"]["nodes"]}
    assert {r["href"] for r in refs.values()} == {BASE + k for k in keys}
    assert all(r["kind"] == "ticket" and r["title"].startswith(r["href"].rsplit("/", 1)[1] + ": ") for r in refs.values())
    for n in data["top"]["nodes"]:
        r = refs[n["ref"]]
        assert r["href"] == BASE + n["id"] and f"[{n['ref']}]" in n["plain"]
    for k, sub in data["sub"].items():
        assert all(refs[n["ref"]]["href"] == BASE + k and f"[{n['ref']}]" in n["plain"] for n in sub["nodes"])
    assert all(r["cited"] for r in data["refs"])
    assert [r["n"] for r in data["refs"]] == list(range(1, len(refs) + 1))


def test_page_renders_the_references_list_and_citations(page):
    script = page_script(page)
    assert "renderRefs(" in script and "References" in script


def test_rag_and_kpis_are_derived_and_status_is_measured(data):
    assert data["derived_basis"] == {"kpi": "derived"}
    for n in data["top"]["nodes"]:
        assert n["basis"] == {"rag": "derived", "status": "measured"}
    for sub in data["sub"].values():
        assert all(n["basis"]["rag"] == "derived" for n in sub["nodes"])


def test_page_shows_the_labels_next_to_badge_status_and_kpis(page):
    script = page_script(page)
    assert script.count("basisTag(") >= 4 and "derived_basis" in script and "basis.status" in script


def test_recipe_input_is_sanitised(cache, tmp_path, page):
    recipe = recipe_of(page)
    count = len((cache / "issues.jsonl").read_text().splitlines())
    assert recipe["input"] == {"epic": FOCUS, "cache": "cache", "issues": count,
                               "read_at": recipe["input"]["read_at"]}
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", recipe["input"]["read_at"])
    assert str(tmp_path) not in page and "/home/" not in page


def test_page_has_a_scrolling_map_wrapper(page):
    assert 'class="mapwrap"' in page and ".mapwrap" in KERNEL.HERE.joinpath("kernel.css").read_text()


def test_jira_text_is_not_tone_checked_but_generated_text_is(tmp_path):
    write_cache(tmp_path / "c", [issue("T-1", "A seamless and powerful ALB epic", "Implementing")])
    page = render_ok("epicmap", {"cache": "c", "epic": "T-1"}, tmp_path)
    data = data_of(page)
    assert "seamless" in data["meta"]["title"]
    module = load_epicmap()
    generated = [module.GATE_DETAIL, data["meta"]["lede"], data["meta"]["foot"], *data["meta"]["kpi"].values(),
                 *(t["label"] + " " + t["note"] for t in data["derived"]["kpi"]["top"])]
    for text in generated:
        for word in KERNEL.HYPE_WORDS:
            assert not re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", text, re.I), (word, text)
        for term in KERNEL.JARGON_TERMS:
            assert not re.search(rf"\b{term}\b", text), (term, text)


def load_epicmap():
    import importlib.util
    spec = importlib.util.spec_from_file_location("epicmap_under_test", TEMPLATES_DIR / "epicmap.py")
    module = importlib.util.module_from_spec(spec)
    import sys
    sys.path.insert(0, str(TEMPLATES_DIR))
    try:
        spec.loader.exec_module(module)
    finally:
        sys.path.remove(str(TEMPLATES_DIR))
    return module


def test_headline_names_the_status_and_is_exempt_from_the_title_rule(data):
    title = data["meta"]["title"]
    assert title == "Shared intake queue: implementing, but 1 blocker not started"
    assert "implementing" in title.lower()


def test_markup_in_jira_text_cannot_break_the_page(tmp_path):
    write_cache(tmp_path / "c", [issue("T-1", "Epic </script><b>x</b>", "Implementing")])
    page = render_ok("epicmap", {"cache": "c", "epic": "T-1"}, tmp_path)
    assert page.count("</script>") == page.count("<script")
    assert data_of(page)["top"]["title"] == "Epic </script><b>x</b>"


# ---- D1: KPIs per view ----

def tiles(view):
    return {t["id"]: t for t in view}


def test_kpis_are_computed_per_view_in_python(data):
    top = tiles(data["derived"]["kpi"]["top"])
    nodes = data["top"]["nodes"]
    assert top["all"]["value"] == len([n for n in nodes if n["rag"] != "X"]) == 5
    assert top["R"]["value"] == 1 and top["A"]["value"] == 2 and top["G"]["value"] == 2
    assert top["all"]["label"] == data["meta"]["kpi"]["all"]
    for key in ("R", "A", "G"):
        assert top[key]["value"] == len([n for n in nodes if n["rag"] == key])


def test_drill_view_kpis_count_the_drill_view_and_explain_zero(data):
    assert set(data["derived"]["kpi"]["sub"]) == set(data["sub"])
    sub = tiles(data["derived"]["kpi"]["sub"]["DEMO-4"])
    assert sub["produce"]["value"] == 2 and sub["out"]["value"] == 2
    assert sub["tracked"]["value"] == 0 and "Jira ticket" in sub["tracked"]["note"]
    assert sub["tracked"]["label"] == "tracked in Jira"


def test_page_script_renders_kpis_from_derived_and_does_not_count(page):
    script = page_script(page)
    assert "DATA.derived.kpi" in script
    assert ".filter(n=>" not in script.split("const RAGN")[0] and "c[n.rag]++" not in script


@pytest.mark.skipif(CHROMIUM is None, reason="no headless chromium")
def test_drill_view_in_a_browser_shows_the_drill_kpis(cache, tmp_path):
    out = tmp_path / "out" / "page.html"
    result, _ = render_map(tmp_path)
    assert result.returncode == 0
    dom = dump_dom(out, "#DEMO-4/")
    shown = re.search(r'<div class="kpis" id="kpis">(.*?)</div>\s*<div class="bar"', dom, re.S).group(1)
    text = re.sub(r"<[^>]+>", " ", shown)
    assert "tracked in Jira" in text and "deliverables" in text and "out of scope" in text
    assert "epics in this view" not in text


def dump_dom(path, fragment=""):
    run = subprocess.run([CHROMIUM, "--no-sandbox", "--disable-gpu", "--virtual-time-budget=4000", "--dump-dom",
                          f"file://{path}{fragment}"], capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stderr
    return run.stdout


# ---- D2: edge labels do not overlap ----

def check_labels(view):
    boxes = [(e, label_box(e)) for e in view["edges"]]
    for i, (_, a) in enumerate(boxes):
        assert 0 <= a[0] and a[2] <= view["vw"] and 0 <= a[1] and a[3] <= view["vh"], a
        for _, b in boxes[i + 1:]:
            assert not intersects(a, b), (a, b)


def test_edge_labels_do_not_overlap_in_the_fixture(data):
    assert all("lx" in e and "ly" in e for e in data["top"]["edges"])
    check_labels(data["top"])


def test_edge_labels_do_not_overlap_in_a_dense_map(tmp_path):
    dense_cache(tmp_path / "dense")
    top = data_of(render_ok("epicmap", {"cache": "dense", "epic": "DEN-1"}, tmp_path))["top"]
    assert len(top["edges"]) == 9
    check_labels(top)


def test_edge_labels_stay_clear_of_node_boxes_in_a_dense_map(tmp_path):
    dense_cache(tmp_path / "dense")
    top = data_of(render_ok("epicmap", {"cache": "dense", "epic": "DEN-1"}, tmp_path))["top"]
    for e in top["edges"]:
        box = label_box(e)
        for n in top["nodes"]:
            assert not intersects(box, (n["x"], n["y"], n["x"] + top["nw"], n["y"] + top["nh"])), (e, n["id"])


# ---- D3: titles wrap to 3 lines, the full title is kept ----

LONG = "Migrate every legacy reporting job onto the shared intake queue and retire the old nightly schedulers"


def test_every_node_keeps_its_full_title_and_wraps_to_three_lines(tmp_path, data):
    dense_cache(tmp_path / "dense", LONG)
    both = [data["top"]["nodes"], *[s["nodes"] for s in data["sub"].values()]]
    both += [data_of(render_ok("epicmap", {"cache": "dense", "epic": "DEN-1"}, tmp_path))["top"]["nodes"]]
    for nodes in both:
        for n in nodes:
            assert n["full"] and 1 <= len(n["lines"]) <= 3
            assert n["lines"][0][0] == n["full"][0]
    long_node = next(n for n in both[-1] if n["full"] == LONG)
    assert len(long_node["lines"]) == 3 and long_node["lines"][-1].endswith("…")
    short = next(n for n in data["top"]["nodes"] if n["id"] == "DEMO-2")
    assert " ".join(short["lines"]) == short["full"] and "…" not in "".join(short["lines"])


def test_a_title_that_fits_in_three_lines_is_not_truncated(tmp_path):
    title = "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu"
    write_cache(tmp_path / "c", [issue("T-1", title, "Funnel")])
    node_ = data_of(render_ok("epicmap", {"cache": "c", "epic": "T-1"}, tmp_path))["top"]["nodes"][0]
    assert " ".join(node_["lines"]) == title and len(node_["lines"]) == 3


@pytest.mark.skipif(CHROMIUM is None, reason="no headless chromium")
def test_svg_node_has_a_title_child_with_the_full_text(tmp_path):
    dense_cache(tmp_path / "dense", LONG)
    render_ok("epicmap", {"cache": "dense", "epic": "DEN-1"}, tmp_path)
    dom = dump_dom(tmp_path / "out" / "page.html")
    assert f"<title>{LONG}</title>" in dom
    assert f'aria-label="{LONG}' in dom or f'aria-label="DEN-6: {LONG}' in dom


def test_place_labels_separates_edges_that_share_a_midpoint():
    module = load_epicmap()
    edges = [{"a": "x", "b": "y", "label": "blocks", "kind": 0, "x1": 100.0, "y1": 100.0, "x2": 300.0, "y2": 100.0}
             for _ in range(5)]
    module.place_labels(edges, [], 1100, 300)
    boxes = [label_box(e) for e in edges]
    assert len({(e["lx"], e["ly"]) for e in edges}) == 5
    assert not any(intersects(a, b) for i, a in enumerate(boxes) for b in boxes[i + 1:])
    assert all(0 <= b[0] and b[2] <= 1100 and 0 <= b[1] and b[3] <= 300 for b in boxes)
