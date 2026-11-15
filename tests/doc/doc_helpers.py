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
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def cite_nodes(inputs, refn=None):
    """Run kernel.js `cite()` in node against a minimal DOM stub for each input; return the nodes it built.

    A node is {"t": text} or {"a": href, "c": link text}. Raises the node error text if `cite` throws."""
    js = (TEMPLATES_DIR / "kernel.js").read_text()
    start, end = js.index("function cite("), js.index("function backTo(")
    refn = {"r1": 1, "r2": 2} if refn is None else refn
    harness = (
        f"const REFN={json.dumps(refn)};\n{js[start:end]}\n"
        "const document={createTextNode:t=>({text:t}),createElement:t=>({attrs:{},setAttribute(k,v){this.attrs[k]=v},textContent:''})};\n"
        f"const inputs={json.dumps(inputs)};\nconst out=[];\n"
        "for(const v of inputs.concat([undefined])){const e={kids:[],appendChild(k){this.kids.push(k)}};\n"
        " try{cite(e,v);out.push({ok:true,kids:e.kids.map(k=>k.text!==undefined?{t:k.text}:{a:k.attrs.href,c:k.textContent})});}\n"
        " catch(x){out.push({ok:false,err:String(x)});}}\n"
        "console.log(JSON.stringify(out));\n")
    run = subprocess.run(["node", "-e", harness], capture_output=True, text=True)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)
