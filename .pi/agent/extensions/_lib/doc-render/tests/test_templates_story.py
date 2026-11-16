"""postmortem and onepager templates: each renders its example through template.py (subprocess tier)."""
import pathlib, subprocess, sys, tempfile, unittest

TEMPLATES = pathlib.Path(__file__).resolve().parents[1] / "templates"
TEMPLATE = TEMPLATES / "template.py"


def render(kind):
    out = pathlib.Path(tempfile.mkdtemp()) / f"{kind}.html"
    r = subprocess.run([sys.executable, str(TEMPLATE), kind, str(TEMPLATES / "examples" / f"{kind}.json"), str(out)],
                       capture_output=True, text=True, cwd=TEMPLATES)
    return r, (out.read_text() if out.exists() else "")


class StoryTemplatesTest(unittest.TestCase):
    def check(self, kind, *markers):
        r, page = render(kind)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("<main", page)
        for m in markers:
            self.assertIn(m, page)
        return page

    def test_postmortem_has_timeline_actions_and_status_pills(self):
        self.check("postmortem", 'id="timeline"', 'id="actions"', 'class:"pill ', '"type": "mitigate"')

    def test_onepager_has_spine_ask_and_sources(self):
        self.check("onepager", 'id="spine"', 'id="ask"', 'id="refsbox"', '"today":')


if __name__ == "__main__":
    unittest.main()
