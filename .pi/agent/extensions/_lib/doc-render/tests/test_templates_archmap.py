"""archmap template: a grid-placed node list becomes one inline-SVG architecture diagram (subprocess tier)."""
import json, pathlib, re, subprocess, sys, tempfile, time, unittest

TEMPLATES = pathlib.Path(__file__).resolve().parents[1] / "templates"
TEMPLATE = TEMPLATES / "template.py"
EXAMPLE = TEMPLATES / "examples" / "archmap.json"


def render(doc=None):
    tmp = pathlib.Path(tempfile.mkdtemp())
    src = EXAMPLE
    if doc is not None:
        src = tmp / "in.json"
        src.write_text(json.dumps(doc))
    out = tmp / "out.html"
    r = subprocess.run([sys.executable, str(TEMPLATE), "archmap", str(src), str(out)],
                       capture_output=True, text=True, cwd=TEMPLATES)
    return r, (out.read_text() if out.exists() else "")


def example():
    return json.loads(EXAMPLE.read_text())


class ArchmapTest(unittest.TestCase):
    def test_example_renders_fast_with_main(self):
        t = time.time()
        r, page = render()
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertLess(time.time() - t, 1.0)
        self.assertIn("<main", page)
        self.assertIn('role="img"', page)

    def test_one_group_per_node(self):
        _, page = render()
        ids = re.findall(r'<g [^>]*data-node-id="([^"]+)"', page)
        self.assertEqual(sorted(ids), sorted(n["id"] for n in example()["nodes"]))

    def test_edges_are_orthogonal_paths(self):
        _, page = render()
        paths = re.findall(r'<path [^>]*class="edge[^"]*"[^>]*\sd="([^"]+)"', page)
        self.assertEqual(len(paths), len(example()["edges"]))
        for d in paths:
            self.assertRegex(d, r"^[MLHV0-9.,\s-]+$")

    def test_boundary_rect_present(self):
        _, page = render()
        self.assertEqual(len(re.findall(r'<rect [^>]*class="boundary"', page)), len(example()["boundaries"]))

    def test_legend_counts_match_kinds(self):
        _, page = render()
        kinds = {}
        for n in example()["nodes"]:
            kinds[n["kind"]] = kinds.get(n["kind"], 0) + 1
        for kind, count in kinds.items():
            self.assertRegex(page, rf'class="lg lg-{kind}"[^>]*>.*?<b>{count}</b>')

    def test_unknown_edge_endpoint_fails_clearly(self):
        doc = example()
        doc["edges"][0]["to"] = "nope"
        r, page = render(doc)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("nope", r.stderr)
        self.assertEqual(page, "")

    def test_node_with_detail_renders_popup_data(self):
        doc = example()
        doc["nodes"][0]["detail"] = {
            "description": "Enterprise identity provider handling OIDC flows.",
            "tech": "Microsoft Entra ID",
            "links": [{"label": "Admin portal", "url": "https://entra.microsoft.com"}],
            "notes": "Federated with corporate Active Directory."
        }
        r, page = render(doc)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("has-detail", page)
        self.assertIn('data-has-detail="true"', page)
        self.assertIn('<dialog id="am-dlg"', page)
        self.assertIn("Enterprise identity provider", page)

    def test_listed(self):
        r = subprocess.run([sys.executable, str(TEMPLATE), "--list"], capture_output=True, text=True)
        self.assertIn("archmap", json.loads(r.stdout))


if __name__ == "__main__":
    unittest.main()
