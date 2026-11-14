"""Shared kernel for readout_render.py and decision_render.py.

Adds numbered, linked references (P14), a measured|derived|judged label on every
KPI and status (P2), and an embedded recipe block for rebuilding the page (P13).
Spec: docs/specs/doc-system/kernel.md. Stdlib only.
"""
import hashlib, html, json, pathlib, re, sys

KINDS = ("decision", "spec", "ticket", "source", "edition")
AUTHOR_BASES = ("measured", "judged")
CITATION = re.compile(r"\[(r\d+)\]")
REF_ID = re.compile(r"r\d+")
RECIPE_NOTE = "Rebuilding needs this renderer; the page alone is not enough."


def fail(field, message):
    sys.exit(f"error: {field}: {message}")


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


def recipe(doc, template_name, renderer_path):
    renderer = pathlib.Path(renderer_path)
    digest = hashlib.sha256(renderer.read_bytes() + pathlib.Path(__file__).read_bytes()).hexdigest()
    return {"template": template_name, "renderer_file": renderer.name, "renderer_sha256": digest, "input": doc,
            "rebuild": f"python3 docs/prototypes/{renderer.name} in.json out.html", "note": RECIPE_NOTE}


def _embed(value):
    return json.dumps(value).replace("<", "\\u003c")


def build_page(template_path, renderer_path, doc, data):
    """Fill the template: references and claim labels into DATA, the recipe into its own script block."""
    template = pathlib.Path(template_path)
    data = {**data, "refs": reference_list(doc), "derived_basis": claim_labels(data["derived"])}
    return (template.read_text().replace("__TITLE__", html.escape(data["meta"]["title"]))
            .replace("__RECIPE__", _embed(recipe(doc, template.name, renderer_path)))
            .replace("__DATA__", _embed(data)))
