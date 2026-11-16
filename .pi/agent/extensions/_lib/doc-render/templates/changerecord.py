"""Change record template: a structured change record (JSON) becomes one self-contained HTML page.

Run through `template.py changerecord in.json out.html`. This module owns validation, the risk grid
placement, the derived counts and the second gate sentence. The tone rules, references, claim labels,
gate banner and recipe come from kernel.py. An approval line records what the author says; the page grants none.
"""
from kernel import (glossary_texts, build_page, check_basis, check_glossary, check_refs, check_tone, fail, keep_known, need, text_fields)

TEMPLATE = "changerecord.html"
GATE_DETAIL = "Read-only: this page records a proposed change and makes none. A human approves it."
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
LEVELS = ("low", "medium", "high")
APPROVALS = ("pending", "approved", "declined")
NOT_TEXT = {"id", "likelihood", "impact", "status", "basis", "time", "href", "kind"}
SCHEMA = {  # the input keys this renderer knows; anything else is dropped before the recipe and the page
    "meta": {k: None for k in META_FIELDS}, "summary": None, "scope": {"in": None, "out": None},
    "risks": [{k: None for k in ("id", "title", "likelihood", "impact", "mitigation")}],
    "plan": [{"time": None, "title": None, "text": None}],
    "backout": [{"title": None, "text": None}],
    "evidence": [{"test": None, "result": None, "basis": None}],
    "approvals": [{"role": None, "status": None}],
    "glossary": None, "refs": [{"id": None, "title": None, "kind": None, "href": None}],
}


def text_list(obj, key, field):
    items = need(obj, key, list, field)
    if not items or not all(isinstance(x, str) and x.strip() for x in items):
        fail(f"{field}.{key}" if field else key, "must be a non-empty list of text")


def check_structure(doc):
    meta = need(doc, "meta", dict, "")
    for key in META_FIELDS:
        need(meta, key, str, "meta")
    need(doc, "summary", str, "")
    scope = need(doc, "scope", dict, "")
    text_list(scope, "in", "scope")
    text_list(scope, "out", "scope")
    ids = set()
    for i, r in enumerate(need(doc, "risks", list, "")):
        f = f"risks[{i}]"
        for key in ("id", "title", "mitigation"):
            need(r, key, str, f)
        for key in ("likelihood", "impact"):
            if need(r, key, str, f) not in LEVELS:
                fail(f"{f}.{key}", f"must be one of {', '.join(LEVELS)}, got {r[key]!r}")
        if r["id"] in ids:
            fail(f"{f}.id", f"duplicate risk id {r['id']!r}")
        ids.add(r["id"])
    for i, p in enumerate(need(doc, "plan", list, "")):
        for key in ("time", "title", "text"):
            need(p, key, str, f"plan[{i}]")
    for i, b in enumerate(need(doc, "backout", list, "")):
        for key in ("title", "text"):
            need(b, key, str, f"backout[{i}]")
    for i, e in enumerate(need(doc, "evidence", list, "")):
        for key in ("test", "result"):
            need(e, key, str, f"evidence[{i}]")
        check_basis(e, f"evidence[{i}]")
    for i, a in enumerate(need(doc, "approvals", list, "")):
        need(a, "role", str, f"approvals[{i}]")
        if need(a, "status", str, f"approvals[{i}]") not in APPROVALS:
            fail(f"approvals[{i}].status", f"must be one of {', '.join(APPROVALS)}, got {a['status']!r}")
    check_glossary(doc)


def tone_texts(doc):
    body = {k: v for k, v in doc.items() if k not in ("refs", "glossary")}
    return (list(text_fields(body, "", NOT_TEXT)) + glossary_texts(doc)
            + [(f"refs[{i}].title", r["title"]) for i, r in enumerate(doc.get("refs", []))])


def derive(doc):
    grid = [{"likelihood": lk, "impact": im, "ids": [r["id"] for r in doc["risks"] if r["likelihood"] == lk and r["impact"] == im]}
            for im in reversed(LEVELS) for lk in LEVELS]
    return {
        "meta": {k: doc["meta"][k] for k in META_FIELDS}, "summary": doc["summary"], "scope": doc["scope"],
        "levels": list(LEVELS), "risks": doc["risks"], "grid": grid, "plan": doc["plan"], "backout": doc["backout"],
        "evidence": doc["evidence"], "approvals": doc["approvals"], "glossary": doc.get("glossary", {}),
        "derived": {"risks": len(doc["risks"]), "high_risks": sum("high" in (r["likelihood"], r["impact"]) for r in doc["risks"]),
                    "steps": len(doc["plan"]), "approved": sum(a["status"] == "approved" for a in doc["approvals"]),
                    "approvals": len(doc["approvals"])},
    }


def build(doc):
    doc = keep_known(doc, SCHEMA)
    check_structure(doc)
    check_refs(doc, text_fields({k: v for k, v in doc.items() if k != "refs"}, "", NOT_TEXT))
    check_tone(doc, tone_texts(doc))
    return build_page(__file__, TEMPLATE, doc, derive(doc), GATE_DETAIL)
