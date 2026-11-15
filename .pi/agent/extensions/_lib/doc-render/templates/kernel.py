"""Shared kernel for the doc template types (readout, decision, later the epic map).

One place for the tone rules, numbered and linked references (P14), the measured|derived|judged
label on every KPI and status (P2), the fixed gate banner, the style-key rule and the embedded
recipe block for rebuilding the page (P13). Spec: docs/specs/doc-system/kernel.md. Stdlib only.
"""
import hashlib, html, json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
KINDS = ("decision", "spec", "ticket", "source", "edition")
AUTHOR_BASES = ("measured", "judged")
CITATION = re.compile(r"\[(r\d+)\]")
REF_ID = re.compile(r"r\d+")
RECIPE_NOTE = "Rebuilding needs this renderer; the page alone is not enough."
HYPE_WORDS = ["seamless", "leverage", "synergy", "robust", "cutting-edge", "game-changing",
              "revolutionary", "best-in-class", "powerful", "blazing", "world-class",
              "awesome", "amazing"]
JARGON_TERMS = ["ALB", "ACM", "PITR", "GSI", "TFC", "APMS", "SG", "EBS", "ROAM"]
LABEL_TITLES = re.compile(r"(simulation|report|decision):", re.I)
STYLE_KEYS = {"brand", "theme", "style", "styles", "css", "stylesheet", "color", "colour", "colors",
              "colours", "font", "fonts", "palette"}
GATE_LEAD = "Nothing here is approved."


def fail(field, message):
    sys.exit(f"error: {field}: {message}")


def need(obj, key, kind, field):
    """Return obj[key], which must exist and be a `kind` (a non-empty one for str)."""
    if not isinstance(obj, dict) or key not in obj:
        fail(f"{field}.{key}" if field else key, "required, missing")
    value = obj[key]
    if not isinstance(value, kind) or (kind is str and not value.strip()):
        fail(f"{field}.{key}" if field else key, f"must be a non-empty {kind.__name__}")
    return value


def reject_style_keys(value, path=""):
    """Brand and theme are never input: refuse any style-like key at any depth (keys match in any case)."""
    if isinstance(value, dict):
        for key, item in value.items():
            here = f"{path}.{key}" if path else str(key)
            if str(key).lower() in STYLE_KEYS:
                fail(here, "brand, theme and styling are not part of the input")
            reject_style_keys(item, here)
    elif isinstance(value, list):
        for i, item in enumerate(value):
            reject_style_keys(item, f"{path}[{i}]")


def text_fields(value, path, skip=frozenset()):
    """Yield (path, text) for every free-text string; keys named in `skip` (ids, enums) are left out."""
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from text_fields(v, f"{path}[{i}]", skip)
    elif isinstance(value, dict):
        for k, v in value.items():
            if k not in skip:
                yield from text_fields(v, f"{path}.{k}" if path else k, skip)


def check_tone(doc, texts):
    """Finding-style title, no hype words, and every jargon term in `texts` ((path, text) pairs) glossed."""
    title = doc["meta"]["title"].strip()
    if LABEL_TITLES.match(title) or len(title.split()) < 5:
        fail("meta.title", "must state a finding in 5 or more words, not start 'Decision:', 'Report:' or 'Simulation:'")
    glossary = doc.get("glossary", {})
    for path, text in texts:
        for word in HYPE_WORDS:
            if re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", text, re.I):
                fail(path, f"hype word {word!r}; say what it does instead")
        if path.startswith("glossary"):
            continue
        for term in JARGON_TERMS:
            if re.search(rf"\b{term}\b", text) and term not in glossary:
                fail(path, f"{term!r} needs a plain meaning in glossary")


def check_glossary(doc):
    glossary = doc.get("glossary", {})
    if not isinstance(glossary, dict) or not all(isinstance(v, str) and v.strip() for v in glossary.values()):
        fail("glossary", "must map each term to a plain meaning")


def _text(obj, key, field):
    value = obj.get(key) if isinstance(obj, dict) else None
    if not isinstance(value, str) or not value.strip():
        fail(f"{field}.{key}", "required, must be a non-empty str")
    return value


def check_refs(doc, text_paths):
    """Validate `refs` and require every [rN] citation in `text_paths` ((path, text) pairs) to resolve."""
    refs = doc.get("refs", [])
    if not isinstance(refs, list):
        fail("refs", "must be a list")
    known = set()
    for i, ref in enumerate(refs):
        field = f"refs[{i}]"
        ref_id = _text(ref, "id", field)
        if not REF_ID.fullmatch(ref_id):
            fail(f"{field}.id", f"must look like 'r1', got {ref_id!r}")
        if ref_id in known:
            fail(f"{field}.id", f"duplicate reference id {ref_id!r}")
        known.add(ref_id)
        _text(ref, "title", field)
        if ref.get("kind") not in KINDS:
            fail(f"{field}.kind", f"must be one of {', '.join(KINDS)}, got {ref.get('kind')!r}")
        href = _text(ref, "href", field)
        if href.startswith(("/", "~", "//")) or (re.match(r"[A-Za-z][A-Za-z0-9+.-]*:", href) and not href.startswith("https://")):
            fail(f"{field}.href", f"must be a relative path or an https URL, got {href!r}")
    for path, text in text_paths:
        for cited in CITATION.findall(text):
            if cited not in known:
                fail(path, f"unknown reference {cited!r}")


def _cited_ids(value):
    if isinstance(value, str):
        yield from CITATION.findall(value)
    elif isinstance(value, list):
        for v in value:
            yield from _cited_ids(v)
    elif isinstance(value, dict):
        for k, v in value.items():
            if k != "refs":
                yield from _cited_ids(v)


def number_refs(doc):
    """Map ref id to its number: first citation in input order, uncited refs last in listed order."""
    order = list(dict.fromkeys(_cited_ids(doc)))
    order += [r["id"] for r in doc.get("refs", []) if r["id"] not in order]
    return {ref_id: n for n, ref_id in enumerate(order, 1)}


def reference_list(doc):
    numbers = number_refs(doc)
    cited = set(_cited_ids(doc))
    rows = [{"id": r["id"], "n": numbers[r["id"]], "title": r["title"], "href": r["href"], "kind": r["kind"],
             "cited": r["id"] in cited} for r in doc.get("refs", [])]
    return sorted(rows, key=lambda r: r["n"])


def check_basis(item, field):
    """An author-supplied fact or status must say whether it was measured or judged (P2, P3)."""
    if not isinstance(item, dict) or "basis" not in item:
        fail(f"{field}.basis", "required, missing")
    if item["basis"] not in AUTHOR_BASES:
        fail(f"{field}.basis", f"must be one of {', '.join(AUTHOR_BASES)}, got {item['basis']!r}")


def claim_labels(derived):
    """Every number the renderer computes is 'derived'; the input cannot set it."""
    return {key: "derived" for key in derived}


def renderer_hash(renderer_path, template_name):
    """Hash of the renderer module, the kernel (py, css, js) and the template html."""
    parts = [pathlib.Path(renderer_path), HERE / "kernel.py", HERE / "kernel.css", HERE / "kernel.js", HERE / template_name]
    return hashlib.sha256(b"".join(p.read_bytes() for p in parts)).hexdigest()


def recipe(doc, template_name, renderer_path):
    renderer = pathlib.Path(renderer_path)
    kind = pathlib.Path(template_name).stem
    return {"template": template_name, "renderer_file": renderer.name,
            "renderer_sha256": renderer_hash(renderer, template_name), "input": doc,
            "rebuild": f"python3 doc-render/templates/template.py {kind} in.json out.html", "note": RECIPE_NOTE}


def _embed(value):
    return json.dumps(value).replace("<", "\\u003c")


def gate_html(detail):
    """The one gate banner: fixed lead, then the module's constant detail. Never taken from input."""
    return f'<div class="gate"><b>{GATE_LEAD}</b> {html.escape(detail)}</div>'


def build_page(renderer_path, template_name, doc, data, gate_detail):
    """Fill the template: kernel css/js, the gate, references and claim labels into DATA, the recipe block."""
    data = {**data, "refs": reference_list(doc), "derived_basis": claim_labels(data["derived"])}
    fills = {
        "__TITLE__": html.escape(data["meta"]["title"]),
        "__GATE__": gate_html(gate_detail),
        "/*__KERNEL_CSS__*/": (HERE / "kernel.css").read_text(),
        "/*__KERNEL_JS__*/": (HERE / "kernel.js").read_text(),
        "__RECIPE__": _embed(recipe(doc, template_name, renderer_path)),
        "__DATA__": _embed(data),
    }
    pattern = re.compile("|".join(re.escape(k) for k in fills))
    return pattern.sub(lambda m: fills[m.group(0)], (HERE / template_name).read_text())
