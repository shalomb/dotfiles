"""Readout template: a structured read-out (JSON) becomes one self-contained HTML page.

Run through `template.py readout in.json out.html`. Schema and rules: docs/specs/doc-system/readout.md.
This module owns validation, the derived layout and counts, and the second gate sentence. The tone
rules, references, claim labels, gate banner and recipe come from kernel.py.
"""
import math

from kernel import (build_page, check_basis, check_glossary, check_refs, check_tone, fail, keep_known, need, opt_flag, opt_list,
                    opt_text, text_fields)

TEMPLATE = "readout.html"
GATE_DETAIL = "Read-only: this page describes and changes nothing. A human approves the plan before anything is built."
RAG = {"R", "A", "G", "N"}
ROAM = {"RESOLVE", "OWN", "ACCEPT", "MITIGATE"}
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
NOT_TEXT = {"id", "layer", "rag", "basis", "roam", "feeds", "a", "b"}
REF = {"id": None, "title": None, "kind": None, "href": None}
SCHEMA = {  # the input keys this renderer knows; anything else is dropped before the recipe and the page
    "meta": {k: None for k in META_FIELDS}, "layers": None, "problem": None,
    "nodes": [{k: None for k in ("id", "kind", "title", "plain", "layer", "rag", "basis", "needs", "feeds")}],
    "choices": [{"id": None, "question": None, "why": None,
                 "options": [{k: None for k in ("id", "title", "pro", "con", "suggestion")}]}],
    "conflicts": [{"a": None, "b": None, "label": None}], "links": None,
    "needs": [{k: None for k in ("need", "from", "settles")}],
    "risks": [{k: None for k in ("risk", "action", "roam")}], "glossary": None, "refs": [REF],
}


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
        opt_text(n, "needs", f)
        opt_list(n, "feeds", f)
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
            opt_flag(o, "suggestion", f"{f}.options[{j}]")
        choice_ids.add(c["id"])
    for key in ("conflicts", "links"):
        if key in doc and not isinstance(doc[key], list):
            fail(key, "must be a list")
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
    check_glossary(doc)


def tone_texts(doc):
    """All prose the author supplies: ids, enums, links and ref ids/kinds/hrefs are the only exemptions."""
    body = {k: v for k, v in doc.items() if k not in ("links", "refs")}
    return list(text_fields(body, "", NOT_TEXT)) + [(f"refs[{i}].title", r["title"]) for i, r in enumerate(doc.get("refs", []))]


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


def build(doc):
    doc = keep_known(doc, SCHEMA)
    check_structure(doc)
    check_refs(doc, text_fields({k: v for k, v in doc.items() if k != "refs"}, "", NOT_TEXT))
    check_tone(doc, tone_texts(doc))
    return build_page(__file__, TEMPLATE, doc, derive(doc), GATE_DETAIL)
