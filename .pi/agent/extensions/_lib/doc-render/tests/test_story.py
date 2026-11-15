"""story.py in-process: the page frame, without subprocesses (fast tier)."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import story  # noqa: E402  # pyright: ignore[reportMissingImports]
from tests._pandoc import pandoc  # noqa: E402

FAKE_SVG = lambda src: '<svg data-fake="1"></svg>'  # noqa: E731

STORY = """# No request lost

**Owner:** Platform lead · **Status:** Proposed · **Data to:** 14 Nov 2026

**The ask in one sentence:** Decide OD-1 by 28 Nov.

> "We fixed the same renewal four times." — engineer

::: kpis
- **97%** of requests fit — was 63%
:::

::: spine
- **Today** four doors.
- **We ask** decide OD-1.
:::

## Takeaways

1. Most requests fit ([§1](#fit))[^1].

## 1. The model fits {#fit}

```mermaid
flowchart LR
  A[Raise] --> B[Claim]
```

**Notice:** nothing is copied.

## Sources

[^1]: [desk test](https://example.com/t)
"""


class StoryFrameTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = story.render(pandoc(STORY), None, "Decision", "story.md", mermaid=FAKE_SVG)
        cls.masthead = cls.page[cls.page.index('<header class="masthead">'):cls.page.index("</header>")]

    def test_masthead_holds_kind_meta_title_and_ask_as_lede(self):
        m = self.masthead
        self.assertIn('<span class="kind">Decision</span>', m)
        self.assertIn('<span class="pill accent">Proposed</span>', m)
        self.assertIn("<b>Data to</b> 14 Nov 2026", m)
        self.assertIn("<h1>No request lost</h1>", m)
        self.assertIn('<p class="lede">Decide OD-1 by 28 Nov.</p>', m)

    def test_preamble_quote_kpis_and_spine_sit_in_the_masthead(self):
        for s in ("<blockquote>", '<dl class="kpis">', '<ol class="spine"'):
            self.assertIn(s, self.masthead)

    def test_sections_contents_and_sources(self):
        self.assertIn('<section aria-labelledby="fit">', self.page)
        self.assertIn('<nav class="toc" aria-label="Contents">', self.page)
        self.assertIn('<a href="#fit">The model fits</a>', self.page)
        sources = self.page[self.page.index('aria-labelledby="sources"'):]
        self.assertIn("https://example.com/t", sources)

    def test_mermaid_becomes_a_captioned_figure(self):
        self.assertIn('<div class="diagram mermaid"><svg data-fake="1"></svg></div>', self.page)
        self.assertIn("<figcaption><b>Notice:</b> nothing is copied.</figcaption>", self.page)

    def test_theme_switch_and_tokens_are_present(self):
        self.assertIn('id="theme-dark"', self.page)
        self.assertIn("--accent:light-dark(", self.page)


class PresentModeTest(unittest.TestCase):
    """One page serves reading and presenting: no separate deck pipeline."""

    def test_page_offers_a_present_toggle_with_keyboard_script(self):
        page = story.render(pandoc(STORY), None, "Report", "s.md", mermaid=FAKE_SVG)
        self.assertIn('class="present-toggle"', page)
        self.assertIn('aria-keyshortcuts="P"', page)
        self.assertIn("html.present main > section", page)
        self.assertIn("ArrowRight", page)
        self.assertNotIn('data-start="present"', page)

    def test_start_present_opens_in_present_mode(self):
        page = story.render(pandoc(STORY), None, "Deck", "s.md", mermaid=FAKE_SVG, start_present=True)
        self.assertIn('<html lang="en" data-start="present">', page)

    def test_print_and_small_screens_never_present(self):
        page = story.render(pandoc(STORY), None, "Report", "s.md", mermaid=FAKE_SVG)
        self.assertIn("matchMedia(\"(min-width:760px)\")", page)


class StatusToneTest(unittest.TestCase):
    def test_tone_comes_from_any_status_word(self):
        eb = story.eyebrow("Brief", [("Status", "Design approved 2026-11-14 · hypotheses not yet tested on live tickets")])
        self.assertIn('<span class="pill ok">Design approved 2026-11-14</span>', eb)
        self.assertIn('<span class="pill warn">hypotheses not yet tested on live tickets</span>', eb)


if __name__ == "__main__":
    unittest.main()
