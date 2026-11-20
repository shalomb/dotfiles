"""widgets.py: fenced-div widgets reshaped from pandoc HTML into the story-doc markup."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import widgets as w  # noqa: E402  # pyright: ignore[reportMissingImports]
from tests._pandoc import pandoc  # noqa: E402


class KpisTest(unittest.TestCase):
    def test_list_becomes_tiles_with_value_label_and_delta(self):
        out = w.kpis(pandoc("::: kpis\n- **97%** of requests fit — was 63%; kill line 75%\n- **None** lead team needed\n:::\n"))
        self.assertIn('<dl class="kpis">', out)
        self.assertIn("<div><dt>of requests fit</dt><dd>97%</dd><dd class=\"delta\">was 63%; kill line 75%</dd></div>", out)
        self.assertIn("<div><dt>lead team needed</dt><dd>None</dd></div>", out)
        self.assertNotIn("<ul>", out)

    def test_ask_marker_makes_the_ask_tile(self):
        out = w.kpis(pandoc("::: kpis\n- **2 of 6** decisions for leads — [OD-1](#decide) [ask]\n:::\n"))
        self.assertIn('<div class="ask"><dt>decisions for leads</dt>', out)
        self.assertIn('<a href="#decide">OD-1</a>', out)
        self.assertNotIn("[ask]", out)


class SpineTest(unittest.TestCase):
    def test_bold_lead_words_become_labels(self):
        out = w.spine(pandoc("::: spine\n- **Today** four doors.\n- **We ask** decide by 28 Nov.\n:::\n"))
        self.assertIn('<ol class="spine" aria-label="The story in four lines">', out)
        self.assertIn("<li><b>Today</b>four doors.</li>", out)


class CompareTest(unittest.TestCase):
    def test_h3_parts_side_by_side_last_is_after(self):
        out = w.compare(pandoc("::: compare\n### Today\n1. ask in chat\n\n### With the model\n1. raise one request\n:::\n"))
        self.assertIn('<div class="compare"><div>', out)
        self.assertIn('<div class="after">', out)
        self.assertLess(out.index("Today"), out.index('class="after"'))


class FoldTest(unittest.TestCase):
    def test_first_bold_line_is_the_summary(self):
        out = w.folds(pandoc("::: fold\n**For engineers: labels** 7 keys\n\n| a | b |\n|---|---|\n| 1 | 2 |\n:::\n"))
        self.assertIn('<details class="fold"><summary>For engineers: labels <small>7 keys</small></summary><div>', out)
        self.assertIn("<table>", out)

    def test_engineers_fold_has_a_default_title(self):
        out = w.folds(pandoc("::: engineers\nThe detail.\n:::\n"))
        self.assertIn("<summary>For engineers</summary>", out)


class DecisionTest(unittest.TestCase):
    MD = ("::: decision\n### How do we send work back?\n- **Id:** OD-1\n- **Recommend:** A redirect path\n"
          "- **Owner:** Train leads\n- **Decide by:** 28 Nov 2026\n- **Blocks:** rollout\n:::\n\n"
          "::: decision\n### Who closes it?\n- **Id:** OD-2\n- **Recommend:** Triage\n- **Owner:** Leads\n- **Decide by:** 28 Nov\n:::\n")

    def test_cards_are_grouped_and_blocking_ones_are_primary(self):
        out = w.decisions(pandoc(self.MD))
        self.assertEqual(out.count('<div class="decisions">'), 1)
        self.assertIn('<article class="decision primary"', out)
        self.assertIn('<span class="pill accent">blocks rollout</span>', out)
        self.assertIn('<dt>Recommend</dt><dd class="rec">A redirect path</dd>', out)
        self.assertIn("<header><span>OD-2</span></header>", out)


class BarsTest(unittest.TestCase):
    def test_a_caption_right_after_the_last_bar_keeps_that_bar(self):
        out = w.bars(pandoc("::: bars\n- As first settled: 63%\n- **+ redirect: 97%**\nThe redirect depends on OD-1.\n:::\n"))
        self.assertEqual(out.count('<div class="bar'), 2)
        self.assertIn("+ redirect", out)
        self.assertIn("97%", out)
        self.assertIn("The redirect depends on OD-1.", out)

    def test_a_caption_after_the_kill_line_keeps_the_kill_line(self):
        out = w.bars(pandoc("::: bars\n- As first settled: 63%\n- kill: 75%\nThe redirect depends on OD-1.\n:::\n"))
        self.assertEqual(out.count('<div class="bar'), 1)
        self.assertIn('class="kill" style="left:75%"', out)
        self.assertIn("The redirect depends on OD-1.", out)

    def test_bars_with_kill_line_and_happy_path(self):
        out = w.bars(pandoc("::: bars\n- As first settled: 63%\n- **+ redirect: 97%**\n- kill: 75%\n\nThe redirect depends on OD-1.\n:::\n"))
        self.assertIn('<figure class="bars">', out)
        self.assertIn('<div class="bar"><span>As first settled</span><span class="track"><span class="fill" style="width:63%"></span><span class="kill" style="left:75%"></span></span><output>63%</output></div>', out)
        self.assertIn('<div class="bar hp"><span>+ redirect</span>', out)
        self.assertIn('<figcaption class="legend"><i></i>kill line 75%. The redirect depends on OD-1.</figcaption>', out)


class GlossaryTest(unittest.TestCase):
    def test_entries_get_ids_and_terms_link_to_them(self):
        out = w.glossary(pandoc("See {{Mode 1}} and {{Claim|claiming}}.\n\n::: glossary\n- **Mode 1:** infrastructure work.\n- **Claim:** a team label.\n:::\n"))
        self.assertIn('<dl class="glossary"><dt id="g-mode-1">Mode 1</dt><dd>infrastructure work.</dd>', out)
        self.assertIn('<a class="term" href="#g-mode-1">Mode 1</a>', out)
        self.assertIn('<a class="term" href="#g-claim">claiming</a>', out)

    def test_terms_inside_code_are_left_alone(self):
        out = w.glossary("<p><code>{{x}}</code></p>")
        self.assertIn("{{x}}", out)


class PillsTest(unittest.TestCase):
    def test_status_words_become_toned_pills(self):
        out = w.pills("<p>Plan [proposed] [tested: 32 requests] [assumption] [blocked]</p>")
        self.assertIn('<span class="pill accent">proposed</span>', out)
        self.assertIn('<span class="pill ok">tested: 32 requests</span>', out)
        self.assertIn('<span class="pill warn">assumption</span>', out)
        self.assertIn('<span class="pill risk">blocked</span>', out)

    def test_unknown_brackets_and_code_are_untouched(self):
        self.assertEqual(w.pills("<p>[foo] <code>[draft]</code></p>"), "<p>[foo] <code>[draft]</code></p>")


class SectionsTest(unittest.TestCase):
    def test_each_h2_becomes_a_linkable_section_and_footnotes_join_sources(self):
        body = pandoc("Intro.\n\n## 1. A {#a}\n\nx[^1]\n\n## Sources\n\n[^1]: [log](https://x)\n")
        out = w.sections(body)
        self.assertIn('<section aria-labelledby="a">', out)
        self.assertIn('<a class="anchor" href="#a" aria-label="Link to this section">#</a></h2>', out)
        src = out[out.index('aria-labelledby="sources"'):]
        self.assertIn('id="fn1"', src)
        self.assertTrue(out.startswith("<p>Intro.</p>"))


class FootnoteTest(unittest.TestCase):
    def test_a_source_cited_twice_is_listed_once_with_one_number(self):
        body = pandoc("a[^d] b[^d] c[^e]\n\n## Sources\n\n[^d]: [desk](https://x)\n[^e]: [log](https://y)\n")
        out = w.sections(w.dedupe_footnotes(body))
        self.assertEqual(out.count("https://x"), 1)
        self.assertEqual(len(__import__("re").findall(r'href="#fn1"', out)), 2)
        self.assertIn(">2</sup>", out)
        self.assertNotIn(">3</sup>", out)


class MermaidTest(unittest.TestCase):
    def test_rendered_svg_is_wrapped_in_a_figure_with_caption(self):
        body = pandoc("```mermaid\nflowchart LR\nA-->B\n```\n\n**Notice:** nothing is copied.\n")
        out = w.mermaid(body, lambda src: "<svg>" + src + "</svg>")
        self.assertIn('<figure><div class="diagram mermaid"><svg>flowchart LR\nA-->B</svg></div><figcaption><b>Notice:</b> nothing is copied.</figcaption></figure>', out)

    def test_without_a_renderer_the_source_stays(self):
        body = pandoc("```mermaid\nflowchart LR\nA-->B\n```\n")
        self.assertIn('<pre class="mermaid">', w.mermaid(body, lambda src: None))

    def test_svg_colours_follow_the_page_tokens(self):
        svg = '<svg><style>#d .node rect{fill:#FFFFFF;stroke:#5b6475}</style></svg>'
        self.assertIn("fill:var(--card);stroke:var(--mute)", w.tokenise_svg(svg))


class CalloutTest(unittest.TestCase):
    def test_standalone_risk_flag_becomes_a_risk_callout(self):
        out = w.callouts('<p>[RISK — every team invents its own intake]</p><p>Text [CHECK — inline].</p>')
        self.assertIn('<aside class="callout risk" aria-label="Risk"><b>Risk</b>every team invents its own intake</aside>', out)
        self.assertIn('<span class="pill warn">Check</span> inline', out)


if __name__ == "__main__":
    unittest.main()
