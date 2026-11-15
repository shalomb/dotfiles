"""Adaptive nav in rendered docs, and the template media query matching the doc-nav constant.

The mobile and print blocks themselves are checked per template in test_doc_templates.py."""
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from doc_helpers import fixture_doc, render_ok

REPO = Path(__file__).resolve().parents[2]
LIB = REPO / ".pi" / "agent" / "extensions" / "_lib"
BUILD = LIB / "doc-render" / "build.py"
NAV_TS = (LIB / "doc-nav.ts").read_text()
MD = "# Title\n\n**The ask in one sentence:** do it.\n\n## 1. First\n\nHello world.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n## 2. Second\n\nBye.\n"


def ts_const(name):
    return int(re.search(rf"export const {name} = (\d+);", NAV_TS).group(1))


MOBILE_MAX, SCROLL_FLOAT_PX = ts_const("MOBILE_MAX"), ts_const("SCROLL_FLOAT_PX")


def build(tmp_path, *extra):
    src, out = tmp_path / "doc.md", tmp_path / "out.html"
    src.write_text(MD)
    r = subprocess.run([sys.executable, str(BUILD), str(src), "-o", str(out), *extra],
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return out.read_text()


def main_of(page):
    return re.search(r"<main.*?</main>", page, flags=re.S).group(0)


pytestmark_pandoc = pytest.mark.skipif(shutil.which("pandoc") is None, reason="pandoc missing")


@pytestmark_pandoc
class TestAdaptiveNav:
    def test_nav_has_layout_attribute_and_toggle(self, tmp_path):
        page = build(tmp_path)
        assert re.search(r'<nav[^>]*class="[^"]*\bdoc-nav\b[^"]*"[^>]*data-nav-layout="sidebar"', page)
        assert 'data-nav-toggle' in page and '<button' in page.split("data-nav-toggle")[0][-80:]
        for layout in ("sidebar", "floating", "hidden"):
            assert f'nav.doc-nav[data-nav-layout="{layout}"]' in page

    def test_constants_match_doc_nav_ts(self, tmp_path):
        page = build(tmp_path)
        assert f"var MOBILE_MAX={MOBILE_MAX}," in page
        assert f"SCROLL_FLOAT_PX={SCROLL_FLOAT_PX};" in page
        src = BUILD.read_text()
        assert re.search(rf"^MOBILE_MAX = {MOBILE_MAX}$", src, flags=re.M)
        assert re.search(rf"^SCROLL_FLOAT_PX = {SCROLL_FLOAT_PX}$", src, flags=re.M)

    def test_present_query_hides_nav(self, tmp_path):
        page = build(tmp_path)
        assert "location.search" in page and "present" in page
        assert 'nav.doc-nav[data-nav-layout="hidden"] { display: none; }' in page

    def test_content_identical_without_nav(self, tmp_path):
        with_nav = build(tmp_path)
        without = build(tmp_path, "--no-adaptive-nav")
        assert "data-nav-layout" not in without
        assert main_of(with_nav) == main_of(without)

    def test_script_is_safe_and_parses(self, tmp_path):
        page = build(tmp_path)
        js = re.search(r"<script>(/\* doc-nav \*/.*?)</script>", page, flags=re.S).group(1)
        assert "innerHTML" not in js and "fetch(" not in js
        node = shutil.which("node")
        if node is None:
            pytest.skip("node missing")
        f = tmp_path / "nav.js"
        f.write_text(js)
        assert subprocess.run([node, "--check", str(f)], capture_output=True).returncode == 0


@pytest.mark.parametrize("template", ["readout", "decision"])
def test_template_media_query_uses_the_doc_nav_constant(template, tmp_path):
    page = render_ok(template, fixture_doc(template), tmp_path)
    assert f"@media (max-width:{MOBILE_MAX}px)" in page
