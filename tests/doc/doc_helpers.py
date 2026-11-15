"""Shared helpers for the doc template tests: run template.py, pick scripts by type or id."""
import html
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = REPO / ".pi" / "agent" / "extensions" / "_lib" / "doc-render" / "templates"
FIXTURES = Path(__file__).parent / "fixtures"
GATE = "Nothing here is approved."


def fixture_path(name):
    return FIXTURES / name / "sample.json"


def fixture_doc(name):
    doc = json.loads(fixture_path(name).read_text())
    if isinstance(doc.get("cache"), str) and not Path(doc["cache"]).is_absolute():
        # render() writes the input elsewhere, so a fixture's relative cache is made absolute here
        doc["cache"] = str((fixture_path(name).parent / doc["cache"]).resolve())
    return doc


def render(name, doc, tmp_path, templates=TEMPLATES_DIR, cwd=None):
    """Run `template.py <name> in.json out.html`; return (result, out path)."""
    tmp_path.mkdir(parents=True, exist_ok=True)
    src, out = tmp_path / "in.json", tmp_path / "out" / "page.html"
    src.write_text(json.dumps(doc))
    result = subprocess.run([sys.executable, str(templates / "template.py"), name, str(src), str(out)],
                            capture_output=True, text=True, cwd=cwd)
    return result, out


def render_ok(name, doc, tmp_path, templates=TEMPLATES_DIR):
    result, out = render(name, doc, tmp_path, templates)
    assert result.returncode == 0, result.stderr
    return out.read_text()


def scripts(page):
    """Every script block as (attributes, body)."""
    return re.findall(r"<script([^>]*)>(.*?)</script>", page, re.S)


def recipe_of(page):
    found = [body for attrs, body in scripts(page) if 'type="application/json"' in attrs and 'id="recipe"' in attrs]
    assert len(found) == 1, "recipe block missing or repeated"
    return json.loads(found[0])


def page_script(page):
    """The one plain <script> that holds the page logic."""
    found = [body for attrs, body in scripts(page) if not attrs.strip()]
    assert len(found) == 1, f"expected one plain page script, got {len(found)}"
    return found[0]


def data_of(page):
    src = page_script(page)
    start = src.index("const DATA=") + len("const DATA=")
    return json.JSONDecoder().raw_decode(src[start:])[0]


def escaped(text):
    return html.escape(text)


def load_kernel():
    """Import kernel.py from the templates directory under a private module name."""
    spec = importlib.util.spec_from_file_location("kernel_under_test", TEMPLATES_DIR / "kernel.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
