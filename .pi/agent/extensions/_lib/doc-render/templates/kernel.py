"""Shared kernel for the doc template types (readout, decision, later the epic map).

One place for the tone rules, numbered and linked references (P14), the measured|derived|judged
label on every KPI and status (P2), the fixed gate banner, the style-key rule and the embedded
recipe block for rebuilding the page (P13). Spec: docs/specs/doc-system/kernel.md. Stdlib only.
"""
import hashlib, html, json, os, pathlib, re, sys
from urllib.parse import urlsplit

HERE = pathlib.Path(__file__).resolve().parent
KINDS = ("decision", "spec", "ticket", "source", "edition")
AUTHOR_BASES = ("measured", "judged")
# a marker written \[r1] is literal text, not a citation (Jira text is escaped this way)
CITATION = re.compile(r"(?<!\\)\[(r\d+)\]")
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
PRIVATE_PATH = re.compile(r"(?<![\w.~])(?:/home/\S|/Users/\S|/root(?![\w.-])|/tmp/|/var/folders/|/private/var(?![\w.-]))"
                          r"|(?<![\w~])~/|[A-Za-z]:\\Users\\")


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


def reject_private_paths(value, exempt=(), path=""):
    """No string value anywhere may hold a home or temp path (or this user's HOME); `exempt` names top-level fields."""
    home = os.path.expanduser("~").rstrip("/\\")
    if isinstance(value, str):
        if PRIVATE_PATH.search(value) or (len(home) > 1 and home in value):
            fail(path, "private paths are not allowed in a document")
    elif isinstance(value, dict):
        for key, item in value.items():
            if path == "" and key in exempt:
                continue
            reject_private_paths(item, exempt, f"{path}.{key}" if path else str(key))
    elif isinstance(value, list):
        for i, item in enumerate(value):
            reject_private_paths(item, exempt, f"{path}[{i}]")


def keep_known(value, schema):
    """Copy `value` keeping only the keys `schema` knows: a dict maps key to a sub-schema (None for a leaf),
    a one-item list is the schema of each list element. What is not in the schema never reaches the page or recipe."""
    if isinstance(schema, dict) and isinstance(value, dict):
        return {k: keep_known(v, schema[k]) for k, v in value.items() if k in schema}
    if isinstance(schema, list) and isinstance(value, list):
        return [keep_known(v, schema[0]) for v in value]
    return value


def opt_text(obj, key, field):
    """An optional field must be text when present."""
    if key in obj and not isinstance(obj[key], str):
        fail(f"{field}.{key}", "must be text")


def opt_list(obj, key, field, of=str):
    """An optional field must be a list (of text when `of` is str) when present."""
    if key not in obj:
        return
    if not isinstance(obj[key], list):
        fail(f"{field}.{key}", "must be a list")
    for i, item in enumerate(obj[key]):
        if of is str and not isinstance(item, str):
            fail(f"{field}.{key}[{i}]", "must be text")


def opt_flag(obj, key, field):
    if key in obj and not isinstance(obj[key], bool):
        fail(f"{field}.{key}", "must be true or false")


def opt_object(obj, key):
    if key in obj and not isinstance(obj[key], dict):
        fail(key, "must be an object")


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


def href_ok(href):
    """An http(s) link with a host, or a relative path. No control characters or whitespace anywhere (browsers
    strip them and then run what is left), no other scheme, no '//host' and no absolute or home path."""
    if not isinstance(href, str) or any(ord(c) <= 0x20 or 0x7F <= ord(c) <= 0x9F or c in "\u2028\u2029" for c in href):
        return False
    if href.startswith(("/", "\\", "~")):
        return False
    try:
        parts = urlsplit(href)
    except ValueError:
        return False
    if parts.scheme:
        return parts.scheme.lower() in ("http", "https") and bool(parts.hostname)
    return not parts.netloc


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
        if not href_ok(_text(ref, "href", field)):
            fail(f"{field}.href", "href must be an http(s) link or a relative path")
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
    """`doc` is the validated, normalised input the renderer used (known fields only)."""
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


_SKIP_OUTLINE = {"derived_basis", "meta"}


def _outline(value, depth=0):
    """Nested lists of whatever the data holds, escaped: the page logic draws the same content with script."""
    if isinstance(value, dict):
        items = [f"<li><b>{html.escape(str(k))}</b> {_outline(v, depth + 1)}</li>" for k, v in value.items()
                 if depth or k not in _SKIP_OUTLINE]
        return "<ul>" + "".join(items) + "</ul>" if items else ""
    if isinstance(value, list):
        return "<ul>" + "".join(f"<li>{_outline(v, depth + 1)}</li>" for v in value) + "</ul>" if value else ""
    return html.escape("" if value is None else str(value))


def noscript_html(data):
    """The no-JavaScript page: title, lede and an outline of the data (the diagrams are drawn by script)."""
    meta = data["meta"]
    head = f"<h1>{html.escape(meta['title'])}</h1>"
    if meta.get("lede"):
        head += f"<p>{html.escape(meta['lede'])}</p>"
    note = "<p><i>This page draws its diagrams and counters with JavaScript. Without it, here is the content as an outline.</i></p>"
    return f"<noscript>{head}{note}{_outline(data)}</noscript>"


def build_page(renderer_path, template_name, doc, data, gate_detail, recipe_input=None):
    """Fill the template: kernel css/js, the gate, references and claim labels into DATA, the recipe block.

    `recipe_input` replaces `doc` as the recorded input when the doc holds more than the author gave."""
    data = {**data, "refs": reference_list(doc), "derived_basis": claim_labels(data["derived"])}
    fills = {
        "__TITLE__": html.escape(data["meta"]["title"]),
        "__GATE__": gate_html(gate_detail),
        "__NOSCRIPT__": noscript_html(data),
        "/*__KERNEL_CSS__*/": (HERE / "kernel.css").read_text(),
        "/*__KERNEL_JS__*/": (HERE / "kernel.js").read_text(),
        "__RECIPE__": _embed(recipe(doc if recipe_input is None else recipe_input, template_name, renderer_path)),
        "__DATA__": _embed(data),
    }
    pattern = re.compile("|".join(re.escape(k) for k in fills))
    return pattern.sub(lambda m: fills[m.group(0)], (HERE / template_name).read_text())
