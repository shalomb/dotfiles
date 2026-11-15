"""build.py as a CLI, and real Mermaid via mmdc (integration tier: subprocesses)."""
import pathlib, subprocess, sys, tempfile, unittest

BUILD = pathlib.Path(__file__).resolve().parents[1] / "build.py"


class BuildTest(unittest.TestCase):
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.src = self.tmp / "d.md"
        self.src.write_text("# T\n\n## 1. Evidence\n\nSee [risks](#risks).\n\n## 2. Risks\n\nx\n")

    def build(self, *extra):
        out = self.tmp / "o.html"
        r = subprocess.run([sys.executable, str(BUILD), str(self.src), "-o", str(out), *extra],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        return out.read_text()

    def test_brand_css_is_layered_after_the_base_theme(self):
        css = self.tmp / "b.css"
        css.write_text(":root{--brand-marker:1}")
        page = self.build("--brand-css", str(css))
        self.assertIn("--brand-marker:1", page)
        self.assertGreater(page.index("--brand-marker"), page.index(":root"))

    def test_no_brand_css_by_default(self):
        self.assertNotIn("--brand-marker", self.build())

    def test_explicit_heading_anchor_becomes_the_id(self):
        self.src.write_text("# T\n\n## 2. Evidence {#evidence}\n\nSee [e](#evidence).\n")
        page = self.build()
        self.assertIn('id="evidence"', page)
        self.assertNotIn("{#evidence}", page)

    def test_an_ampersand_in_the_title_is_escaped_once(self):
        self.src.write_text("# Plans & risks\n\n## 1. Plans & risks\n\nx\n")
        page = self.build("-m", "doc")
        self.assertIn("<title>Plans &amp; risks</title>", page)
        self.assertIn("<h1>Plans &amp; risks</h1>", page)
        self.assertNotIn("&amp;amp;", page)

    def test_an_ampersand_in_a_deck_title_is_escaped_once(self):
        self.src.write_text("# Plans & risks\n\n## 1. Plans & risks\n\nx\n")
        self.assertNotIn("&amp;amp;", self.build("-m", "deck"))

    def test_deck_mode_is_the_story_page_opening_in_present_mode(self):
        self.src.write_text("# T\n\n## 1. A\n\n::: kpis\n- **9%** x\n:::\n")
        page = self.build("-m", "deck")
        self.assertIn('data-start="present"', page)
        self.assertIn('<dl class="kpis">', page)
        self.assertIn('class="masthead"', page)

    def test_auto_ids_match_github_slugs(self):
        self.src.write_text("# T\n\n## 3. Most requests are not Mode 1\n\nx\n")
        self.assertIn('id="3-most-requests-are-not-mode-1"', self.build())


class MermaidCliTest(unittest.TestCase):
    """Real mmdc. Cached in tests/.cache/mermaid, so only the first run pays ~2s."""

    def test_inline_svg_uses_page_tokens_and_no_web_font(self):
        import os
        tmp = pathlib.Path(tempfile.mkdtemp())
        src = tmp / "m.md"
        src.write_text("# T\n\n## 1. Flow\n\n```mermaid\nflowchart LR\n  A[Raise] --> B[Claim]\n```\n")
        out = tmp / "m.html"
        cache = pathlib.Path(__file__).resolve().parent / ".cache" / "mermaid"
        r = subprocess.run([sys.executable, str(BUILD), str(src), "-o", str(out)], capture_output=True, text=True,
                           env={**os.environ, "DOC_RENDER_CACHE": str(cache)})
        self.assertEqual(r.returncode, 0, r.stderr)
        page = out.read_text()
        self.assertIn('<div class="diagram mermaid"><svg', page)
        self.assertNotIn("@font-face", page)
        self.assertIn("var(--card)", page)


if __name__ == "__main__":
    unittest.main()
