"""Adaptive nav in rendered docs, and mobile/print styles in the readout and decision pages."""
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
LIB = REPO / ".pi" / "agent" / "extensions" / "_lib"
BUILD = LIB / "doc-render" / "build.py"
NAV_TS = (LIB / "doc-nav.ts").read_text()
PROTO = REPO / "docs" / "prototypes"
FIX = Path(__file__).parent / "fixtures"
GATE = "Nothing here is approved."
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


def render_proto(script, fixture, tmp_path):
    out = tmp_path / "p.html"
    r = subprocess.run([sys.executable, str(PROTO / script), str(FIX / fixture / "sample.json"), str(out)],
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


@pytest.mark.parametrize("script,fixture", [("readout_render.py", "readout"), ("decision_render.py", "decision")])
class TestTemplates:
    def test_mobile_and_print_blocks(self, script, fixture, tmp_path):
        page = render_proto(script, fixture, tmp_path)
        assert f"@media (max-width:{MOBILE_MAX}px)" in page
        assert "@media print" in page
        assert GATE in page

    def test_print_keeps_gate_and_references(self, script, fixture, tmp_path):
        page = render_proto(script, fixture, tmp_path)
        block = page.split("@media print", 1)[1].split("</style>", 1)[0]
        for hidden in re.findall(r"([^{}]+)\{[^}]*display:\s*none", block):
            assert ".gate" not in hidden and "refs" not in hidden
        assert "details.made" in block and "position:static" in block
