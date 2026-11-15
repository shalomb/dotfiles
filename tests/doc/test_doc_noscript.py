"""Every template page must say something with JavaScript off: the content is drawn by script, so the
kernel adds a <noscript> outline of the same data."""
import json
import re

import pytest

from doc_helpers import data_of, fixture_doc, render_ok

NAMES = ["epicmap", "readout", "decision"]


def noscript_of(page):
    found = re.findall(r"<noscript>(.*?)</noscript>", page, re.S)
    assert len(found) == 1, "expected exactly one <noscript> block"
    return found[0]


@pytest.mark.parametrize("name", NAMES)
def test_page_has_a_noscript_outline_with_the_title(name, tmp_path):
    page = render_ok(name, fixture_doc(name), tmp_path)
    block = noscript_of(page)
    title = data_of(page)["meta"]["title"]
    assert "<h1" in block and title.split("&")[0].strip()[:20] in block.replace("&amp;", "&")


@pytest.mark.parametrize("name", NAMES)
def test_noscript_carries_the_content_not_just_the_title(name, tmp_path):
    page = render_ok(name, fixture_doc(name), tmp_path)
    block = noscript_of(page)
    text = re.sub(r"<[^>]+>", " ", block)
    data = data_of(page)
    words = {w for w in re.findall(r"[A-Za-z]{6,}", json.dumps({k: v for k, v in data.items() if k in ("nodes", "top", "options", "needs", "risks", "why")}))}
    assert len(words) > 5
    assert sum(1 for w in words if w in text) / len(words) > 0.5


HOSTILE = "Cut cost </noscript><script>alert(1)</script> before the quarter ends"


@pytest.mark.parametrize("name", NAMES)
def test_noscript_cannot_be_broken_out_of(name, tmp_path):
    doc = fixture_doc(name)
    if "meta" in doc:  # epicmap takes its title from the Jira cache, so it keeps the stock fixture
        doc["meta"]["title"] = HOSTILE
    page = render_ok(name, doc, tmp_path)
    block = noscript_of(page)
    assert "<script" not in block and "</noscript" not in block
    assert len(re.findall(r"<noscript>", page)) == 1
    if "meta" in doc:
        assert "alert(1)" in block and "&lt;script&gt;" in block  # shown as text, escaped
