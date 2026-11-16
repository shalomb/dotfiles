"""guide, runbook and changerecord templates: each renders its example through template.py (subprocess tier)."""
import json, pathlib, subprocess, sys, tempfile, unittest

TEMPLATES = pathlib.Path(__file__).resolve().parents[1] / "templates"
TEMPLATE = TEMPLATES / "template.py"


def render(kind):
    out = pathlib.Path(tempfile.mkdtemp()) / f"{kind}.html"
    r = subprocess.run([sys.executable, str(TEMPLATE), kind, str(TEMPLATES / "examples" / f"{kind}.json"), str(out)],
                       capture_output=True, text=True, cwd=TEMPLATES)
    return r, (out.read_text() if out.exists() else "")


class OpsTemplatesTest(unittest.TestCase):
    def check(self, kind, *markers):
        r, page = render(kind)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("<main", page)
        for m in markers:
            self.assertIn(m, page)
        return page

    def test_guide_has_steps_status_pills_and_folds(self):
        self.check("guide", 'id="steps"', 'class:"pill ', 'el("details"', '"status": "doing"')

    def test_runbook_has_a_command_code_block_and_rollback(self):
        self.check("runbook", 'el("pre",{class:"cmd"', 'id="rollback"', '"command":')

    def test_changerecord_has_risk_grid_cells_and_approvals(self):
        self.check("changerecord", 'id="riskgrid"', 'class:"rcell ', 'id="approvals"')

    def test_new_types_are_listed_with_postmortem_and_onepager(self):
        r = subprocess.run([sys.executable, str(TEMPLATE), "--list"], capture_output=True, text=True)
        self.assertEqual(json.loads(r.stdout), sorted(["readout", "decision", "epicmap", "guide", "runbook",
                                                       "changerecord", "postmortem", "onepager"]))


if __name__ == "__main__":
    unittest.main()
