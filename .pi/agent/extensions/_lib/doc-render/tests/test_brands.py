"""Tests for brand resolution: the folder a document lives in picks its theme and library."""
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import brands  # noqa: E402

CONFIG = """
default: personal
brands:
  work:
    css: work.css
    library: docs-work
    paths: [{home}/work]
  hobby:
    css: hobby.css
    library: docs-hobby
    paths: [{home}/play, {home}/work/side-project]
  personal:
    library: docs
"""


class BrandTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.home = pathlib.Path(self.tmp.name)
        self.dir = self.home / "config" / "agent-skills" / "brands"
        self.dir.mkdir(parents=True)
        (self.dir / "config.yaml").write_text(CONFIG.format(home=self.home))
        (self.dir / "work.css").write_text(":root{--brand:red}")
        (self.dir / "hobby.css").write_text(":root{--brand:green}")
        for d in ("work/repo/docs", "work/side-project", "play", "elsewhere"):
            (self.home / d).mkdir(parents=True)
        self.env = {"XDG_CONFIG_HOME": str(self.home / "config")}

    def tearDown(self):
        self.tmp.cleanup()

    def resolve(self, rel):
        return brands.resolve(self.home / rel, env=self.env)

    def test_folder_under_a_brand_path_gets_that_brand(self):
        b = self.resolve("work/repo/docs/six-pager.md")
        self.assertEqual(b.name, "work")
        self.assertEqual(b.library, "docs-work")
        self.assertEqual(b.css_text(), ":root{--brand:red}")

    def test_the_most_specific_path_wins(self):
        self.assertEqual(self.resolve("work/side-project/a.md").name, "hobby")

    def test_unmatched_folder_gets_the_default_brand(self):
        b = self.resolve("elsewhere/a.md")
        self.assertEqual((b.name, b.library, b.css_text()), ("personal", "docs", ""))

    def test_a_sibling_with_a_shared_prefix_does_not_match(self):
        (self.home / "workshop").mkdir()
        self.assertEqual(self.resolve("workshop/a.md").name, "personal")

    def test_symlinked_source_resolves_to_its_real_folder(self):
        (self.home / "elsewhere" / "link").symlink_to(self.home / "work" / "repo")
        self.assertEqual(self.resolve("elsewhere/link/docs/a.md").name, "work")

    def test_no_config_means_no_brand_and_the_shared_library(self):
        b = brands.resolve(self.home / "work/a.md", env={"XDG_CONFIG_HOME": str(self.home / "none")})
        self.assertEqual((b.name, b.library, b.css_text()), ("none", "docs", ""))

    def test_missing_css_file_is_an_error_not_a_silent_fallback(self):
        (self.dir / "work.css").unlink()
        with self.assertRaises(brands.BrandError):
            self.resolve("work/a.md").css_text()

    def test_library_name_must_be_a_plain_folder_name(self):
        (self.dir / "config.yaml").write_text(
            f"brands:\n  bad:\n    library: ../escape\n    paths: [{self.home}/work]\n")
        with self.assertRaises(brands.BrandError):
            self.resolve("work/a.md")

    def test_cli_prints_the_resolved_brand_as_json(self):
        out = subprocess.run([sys.executable, str(SCRIPTS / "brands.py"), "resolve",
                              str(self.home / "play" / "a.md")],
                             env={**os.environ, **self.env}, capture_output=True, text=True, check=True)
        data = json.loads(out.stdout)
        self.assertEqual((data["name"], data["library"]), ("hobby", "docs-hobby"))
        self.assertTrue(data["css"].endswith("hobby.css"))


if __name__ == "__main__":
    unittest.main()
