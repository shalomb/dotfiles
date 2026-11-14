#!/usr/bin/env python3
"""Render a structured read-out (JSON) to one self-contained HTML page.

  readout_render.py in.json out.html

Schema and rules: docs/specs/doc-system/readout.md. The renderer validates the
input, enforces the tone rules, adds the derived layout and counts, and fills
`__DATA__` in readout.template.html. The not-approved gate lives in the template;
the input cannot change or omit it. Shared references, claim labels and the embedded
recipe come from doc_kernel.py.
"""
import json, math, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from doc_kernel import build_page, check_basis, check_refs, fail  # noqa: E402

TEMPLATE = pathlib.Path(__file__).with_name("readout.template.html")
HYPE_WORDS = ["seamless", "leverage", "synergy", "robust", "cutting-edge", "game-changing",
              "revolutionary", "best-in-class", "powerful", "blazing", "world-class",
              "awesome", "amazing"]
JARGON_TERMS = ["ALB", "ACM", "PITR", "GSI", "TFC", "APMS", "SG", "EBS", "ROAM"]
RAG = {"R", "A", "G", "N"}
ROAM = {"RESOLVE", "OWN", "ACCEPT", "MITIGATE"}
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
NOT_TEXT = {"id", "layer", "rag", "basis", "roam", "feeds", "a", "b"}


def need(obj, key, kind, field):
    if not isinstance(obj, dict) or key not in obj:
        fail(f"{field}.{key}" if field else key, "required, missing")
    value = obj[key]
    if not isinstance(value, kind) or (kind is str and not value.strip()):
        fail(f"{field}.{key}" if field else key, f"must be a non-empty {kind.__name__}")
    return value


def check_structure(doc):
    meta = need(doc, "meta", dict, "")
    for key in META_FIELDS:
        need(meta, key, str, "meta")
    layers = need(doc, "layers", list, "")
    if not layers or not all(isinstance(x, str) and x for x in layers):
        fail("layers", "must be a non-empty list of names")
    need(doc, "problem", str, "")
    node_ids = set()
    for i, n in enumerate(need(doc, "nodes", list, "")):
        f = f"nodes[{i}]"
        for key in ("id", "kind", "title", "plain"):
            need(n, key, str, f)
        need(n, "layer", int, f)
        if isinstance(n["layer"], bool) or not 0 <= n["layer"] < len(layers):
            fail(f"{f}.layer", f"must be an index into layers (0 to {len(layers) - 1}), got {n['layer']!r}")
        if need(n, "rag", str, f) not in RAG:
            fail(f"{f}.rag", f"must be one of R, A, G, N, got {n['rag']!r}")
        check_basis(n, f)
        node_ids.add(n["id"])
    choice_ids = set()
    for i, c in enumerate(need(doc, "choices", list, "")):
        f = f"choices[{i}]"
        for key in ("id", "question", "why"):
            need(c, key, str, f)
        options = need(c, "options", list, f)
        if len(options) < 2:
            fail(f"{f}.options", f"needs at least 2 options, got {len(options)}")
        for j, o in enumerate(options):
            for key in ("id", "title", "pro", "con"):
                need(o, key, str, f"{f}.options[{j}]")
        choice_ids.add(c["id"])
    for i, n in enumerate(doc["nodes"]):
        for fed in n.get("feeds", []):
            if fed not in choice_ids:
                fail(f"nodes[{i}].feeds", f"unknown choice id {fed!r}")
    for i, c in enumerate(doc.get("conflicts", [])):
        for end in ("a", "b"):
            if need(c, end, str, f"conflicts[{i}]") not in node_ids:
                fail(f"conflicts[{i}].{end}", f"unknown node id {c[end]!r}")
        need(c, "label", str, f"conflicts[{i}]")
    for i, pair in enumerate(doc.get("links", [])):
        if not (isinstance(pair, list) and len(pair) == 2 and all(p in node_ids for p in pair)):
            fail(f"links[{i}]", f"must be two known node ids, got {pair!r}")
    for i, r in enumerate(need(doc, "needs", list, "")):
        for key in ("need", "from", "settles"):
            need(r, key, str, f"needs[{i}]")
    for i, r in enumerate(need(doc, "risks", list, "")):
        for key in ("risk", "action"):
            need(r, key, str, f"risks[{i}]")
        if need(r, "roam", str, f"risks[{i}]") not in ROAM:
            fail(f"risks[{i}].roam", f"must be one of RESOLVE, OWN, ACCEPT, MITIGATE, got {r['roam']!r}")
    glossary = doc.get("glossary", {})
    if not isinstance(glossary, dict) or not all(isinstance(v, str) and v.strip() for v in glossary.values()):
        fail("glossary", "must map each term to a plain meaning")


def text_fields(value, path):
    """Yield (path, text) for every free-text string; ids and enums are skipped."""
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from text_fields(v, f"{path}[{i}]")
    elif isinstance(value, dict):
        for k, v in value.items():
            if k not in NOT_TEXT:
                yield from text_fields(v, f"{path}.{k}" if path else k)


def check_tone(doc):
    title = doc["meta"]["title"].strip()
    if re.match(r"(simulation|report):", title, re.I) or len(title.split()) < 5:
        fail("meta.title", "must state a finding in 5 or more words, not start 'Simulation:' or 'Report:'")
    glossary = doc.get("glossary", {})
    body = {k: v for k, v in doc.items() if k not in ("links", "conflicts", "refs")}
    for path, text in text_fields(body, ""):
        for word in HYPE_WORDS:
            if re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", text, re.I):
                fail(path, f"hype word {word!r}; say what it does instead")
        if path.startswith("glossary"):
            continue
        for term in JARGON_TERMS:
            if re.search(rf"\b{term}\b", text) and term not in glossary:
                fail(path, f"{term!r} needs a plain meaning in glossary")


def derive(doc):
    rows, nodes = {}, []
    for n in doc["nodes"]:
        row = rows.get(n["layer"], 0)
        rows[n["layer"]] = row + 1
        nodes.append({**{k: n[k] for k in ("id", "kind", "title", "rag", "basis", "plain")},
                      "needs": n.get("needs", ""), "feeds": n.get("feeds", []),
                      "col": n["layer"], "row": row})
    edges = [{"a": a, "b": b, "kind": "link", "label": ""} for a, b in doc.get("links", [])]
    edges += [{**c, "kind": "conflict"} for c in doc.get("conflicts", [])]
    options = [o for c in doc["choices"] for o in c["options"]]
    return {
        "meta": {k: doc["meta"][k] for k in META_FIELDS},
        "layers": doc["layers"], "nodes": nodes, "edges": edges, "problem": doc["problem"],
        "choices": [{"id": c["id"], "question": c["question"], "why": c["why"],
                     "options": [{"id": o["id"], "title": o["title"], "pro": o["pro"], "con": o["con"],
                                  "suggestion": o.get("suggestion") is True} for o in c["options"]]}
                    for c in doc["choices"]],
        "needs": doc["needs"], "risks": doc["risks"], "glossary": doc.get("glossary", {}),
        "derived": {"layers": len(doc["layers"]), "conflicts": len(doc.get("conflicts", [])),
                    "choices": len(doc["choices"]),
                    "plans": math.prod(len(c["options"]) for c in doc["choices"]),
                    "suggestions": sum(o.get("suggestion") is True for o in options)},
    }


def main(argv):
    if len(argv) != 3:
        sys.exit("usage: readout_render.py in.json out.html")
    try:
        doc = json.loads(pathlib.Path(argv[1]).read_text())
    except (OSError, json.JSONDecodeError) as exc:
        sys.exit(f"error: cannot read {argv[1]}: {exc}")
    check_structure(doc)
    check_refs(doc, text_fields({k: v for k, v in doc.items() if k != "refs"}, ""))
    check_tone(doc)
    page = build_page(TEMPLATE, __file__, doc, derive(doc))
    out = pathlib.Path(argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)


if __name__ == "__main__":
    main(sys.argv)
