"""Wave 5: closes the verifier findings on the doc templates (links, private paths, tone, types, ROAM heading).

The epic map findings live in test_epic_map.py. Each test here fails on the code before wave 5."""
import json
import os
import re
import sys

import pytest

from doc_helpers import data_of, fixture_doc, load_kernel, recipe_of, render, render_ok

KERNEL = load_kernel()
WITH_REFS = ["readout", "decision"]
HREF_MESSAGE = "href must be an http(s) link or a relative path"


def fails(name, doc, tmp_path):
    result, out = render(name, doc, tmp_path)
    assert result.returncode != 0 and not out.exists(), "expected the build to fail"
    return result.stderr


# P1a: unsafe hrefs

BAD_HREFS = ["\njavascript:alert(1)", "javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\tscript:alert(1)",
             " javascript:alert(1)", "data:text/html,<b>x</b>", "vbscript:msgbox(1)", "file:///etc/passwd",
             "//evil.example/x", "\\\\evil.example\\x", "https:", "https:///nohost", "http://", "ftp://example.com/x",
             "https://example.com/a b", "https://example.com/\x7f", "https://example.com/\x85x",
             "https://example.com/\u2028x", "/abs/path"]


@pytest.mark.parametrize("href", BAD_HREFS, ids=[repr(h) for h in BAD_HREFS])
@pytest.mark.parametrize("name", WITH_REFS)
def test_unsafe_hrefs_are_rejected(name, href, tmp_path):
    doc = fixture_doc(name)
    doc["refs"][0]["href"] = href
    error = fails(name, doc, tmp_path)
    assert f"error: refs[0].href: {HREF_MESSAGE}" in error


@pytest.mark.parametrize("href", ["https://example.com/x?a=1#top", "http://example.com", "docs/a.md", "../a.md#h", "editions/v1.html"])
@pytest.mark.parametrize("name", WITH_REFS)
def test_safe_hrefs_are_accepted(name, href, tmp_path):
    doc = fixture_doc(name)
    doc["refs"][0]["href"] = href
    render_ok(name, doc, tmp_path)


def test_epic_map_generated_hrefs_pass_the_same_rule():
    sys.path.insert(0, str(KERNEL.HERE))
    import epicmap
    assert KERNEL.href_ok(epicmap.JIRA_BASE + "ABC-1")


# P1b: the recipe holds known fields only; private paths are refused

@pytest.mark.parametrize("name", WITH_REFS)
def test_unknown_fields_are_not_in_the_recipe_or_the_page(name, tmp_path):
    doc = fixture_doc(name)
    doc["private_note"] = "keep this out"
    doc["meta"]["extra_note"] = "also out"
    page = render_ok(name, doc, tmp_path)
    assert "keep this out" not in page and "also out" not in page
    assert recipe_of(page)["input"] == fixture_doc(name)


@pytest.mark.parametrize("name", WITH_REFS)
def test_a_private_path_in_an_unknown_field_never_reaches_the_page(name, tmp_path):
    doc = fixture_doc(name)
    doc["private_note"] = "see /home/alice/private.md"
    error = fails(name, doc, tmp_path)
    assert "error: private_note: private paths are not allowed in a document" in error


PATHS = ["/home/alice/private.md", "/Users/bob/x", "/root/.ssh", "/tmp/x/y.json", "/var/folders/ab/cd", "/private/var/x",
         "~/notes.md", "C:\\Users\\carol\\x.txt", os.path.expanduser("~") + "/work"]


@pytest.mark.parametrize("path", PATHS)
@pytest.mark.parametrize("name", WITH_REFS)
def test_a_private_path_in_a_text_field_is_rejected_naming_it(name, path, tmp_path):
    doc = fixture_doc(name)
    field = "problem" if name == "readout" else "why"
    doc[field] = f"The notes are at {path} today."
    assert f"error: {field}: private paths are not allowed in a document" in fails(name, doc, tmp_path)


def test_kernel_rule_names_the_nested_field_and_honours_the_exemption():
    with pytest.raises(SystemExit, match=r"nodes\[1\]\.plain: private paths"):
        KERNEL.reject_private_paths({"nodes": [{"plain": "ok"}, {"plain": "/home/x/y"}]})
    KERNEL.reject_private_paths({"cache": "/home/x/y", "epic": "A-1"}, exempt=("cache",))
    with pytest.raises(SystemExit, match="epic"):
        KERNEL.reject_private_paths({"cache": "/home/x/y", "epic": "/tmp/a"}, exempt=("cache",))


@pytest.mark.parametrize("text", ["https://example.com/home/page", "the /tmpl folder", "a/home/b", "home/alice", "tilde ~5"])
def test_ordinary_text_is_not_mistaken_for_a_private_path(text):
    KERNEL.reject_private_paths({"x": text})


# P2a: tone covers all visible prose

def test_decision_date_label_and_note_are_tone_checked(tmp_path):
    doc = fixture_doc("decision")
    doc["deadline"]["date_label"] = "seamless renewal"
    assert "deadline.date_label" in fails("decision", doc, tmp_path)
    doc = fixture_doc("decision")
    doc["deadline"]["ask_by_note"] = "a robust last day"
    assert "deadline.ask_by_note" in fails("decision", doc, tmp_path)
    doc = fixture_doc("decision")
    doc["deadline"]["date_label"] = "ALB renewal"
    assert "deadline.date_label" in fails("decision", doc, tmp_path)


@pytest.mark.parametrize("name", WITH_REFS)
@pytest.mark.parametrize("title", ["A seamless link", "The ACM notes"])
def test_ref_titles_are_tone_checked(name, title, tmp_path):
    doc = fixture_doc(name)
    doc["refs"][0]["title"] = title
    assert "refs[0].title" in fails(name, doc, tmp_path)


def test_readout_conflict_labels_are_tone_checked(tmp_path):
    doc = fixture_doc("readout")
    doc["conflicts"][0]["label"] = "a game-changing clash"
    assert "conflicts[0].label" in fails("readout", doc, tmp_path)
    doc = fixture_doc("readout")
    doc["conflicts"][0]["label"] = "needs ROAM?"
    assert "conflicts[0].label" in fails("readout", doc, tmp_path)


# P2b: optional field types

TYPED = [
    ("readout", lambda d: d["nodes"][0].update(needs=1), "nodes[0].needs: must be text"),
    ("readout", lambda d: d["nodes"][0].update(feeds="B"), "nodes[0].feeds: must be a list"),
    ("readout", lambda d: d["nodes"][0].update(feeds=[1]), "nodes[0].feeds[0]: must be text"),
    ("readout", lambda d: d.update(links="x"), "links: must be a list"),
    ("readout", lambda d: d.update(conflicts=3), "conflicts: must be a list"),
    ("readout", lambda d: d["choices"][0]["options"][0].update(suggestion="yes"), "suggestion: must be true or false"),
    ("decision", lambda d: d.update(facts=1), "facts: must be a list"),
    ("decision", lambda d: d.update(facts="ab"), "facts: must be a list"),
    ("decision", lambda d: d.update(reply="hello"), "reply: must be an object"),
    ("decision", lambda d: d.update(reply=[]), "reply: must be an object"),
    ("decision", lambda d: d["options"][0].update(recommended="yes"), "recommended: must be true or false"),
]


@pytest.mark.parametrize("name,change,message", TYPED, ids=[t[2] for t in TYPED])
def test_optional_fields_are_type_checked(name, change, message, tmp_path):
    doc = fixture_doc(name)
    change(doc)
    result, out = render(name, doc, tmp_path)
    assert result.returncode != 0 and not out.exists()
    assert result.stderr.startswith("error: ") and message in result.stderr, result.stderr


def test_the_page_citation_code_tolerates_a_non_string():
    js = (KERNEL.HERE / "kernel.js").read_text()
    assert re.search(r'function cite\(e,text\)\{if\(typeof text!=="string"\)', js)


# P2f: ROAM is explained in the heading itself

def test_roam_heading_explains_itself_without_a_glossary(tmp_path):
    doc = fixture_doc("readout")
    doc["glossary"] = {}
    doc = json.loads(re.sub(r"\b(ALB|SG|PITR)\b", "x", json.dumps(doc)))
    page = render_ok("readout", doc, tmp_path)
    assert "<th>ROAM: resolved, owned, accepted, mitigated</th>" in page
