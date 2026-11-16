"""Guide template: a structured how-to guide (JSON) becomes one self-contained HTML page.

Run through `template.py guide in.json out.html`. This module owns validation, the derived counts and the
second gate sentence. The tone rules, references, gate banner and recipe come from kernel.py.
"""
from kernel import (glossary_texts, build_page, check_glossary, check_refs, check_tone, fail, keep_known, need, opt_text, text_fields)

TEMPLATE = "guide.html"
GATE_DETAIL = "Read-only: this page describes steps and changes nothing. A human follows them."
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
STATUSES = ("todo", "doing", "done")
NOT_TEXT = {"id", "status", "href", "kind"}
SCHEMA = {  # the input keys this renderer knows; anything else is dropped before the recipe and the page
    "meta": {k: None for k in META_FIELDS}, "for": None,
    "steps": [{"title": None, "text": None, "check": None}],
    "checklist": [{"item": None, "status": None}],
    "folds": [{"title": None, "text": None}],
    "glossary": None, "refs": [{"id": None, "title": None, "kind": None, "href": None}],
}


def check_structure(doc):
    meta = need(doc, "meta", dict, "")
    for key in META_FIELDS:
        need(meta, key, str, "meta")
    need(doc, "for", str, "")
    for i, s in enumerate(need(doc, "steps", list, "")):
        for key in ("title", "text"):
            need(s, key, str, f"steps[{i}]")
        opt_text(s, "check", f"steps[{i}]")
    for i, c in enumerate(need(doc, "checklist", list, "")):
        need(c, "item", str, f"checklist[{i}]")
        if need(c, "status", str, f"checklist[{i}]") not in STATUSES:
            fail(f"checklist[{i}].status", f"must be one of {', '.join(STATUSES)}, got {c['status']!r}")
    if "folds" in doc and not isinstance(doc["folds"], list):
        fail("folds", "must be a list")
    for i, f in enumerate(doc.get("folds", [])):
        for key in ("title", "text"):
            need(f, key, str, f"folds[{i}]")
    check_glossary(doc)


def tone_texts(doc):
    body = {k: v for k, v in doc.items() if k not in ("refs", "glossary")}
    return (list(text_fields(body, "", NOT_TEXT)) + glossary_texts(doc)
            + [(f"refs[{i}].title", r["title"]) for i, r in enumerate(doc.get("refs", []))])


def derive(doc):
    count = {s: sum(c["status"] == s for c in doc["checklist"]) for s in STATUSES}
    return {
        "meta": {k: doc["meta"][k] for k in META_FIELDS}, "for": doc["for"],
        "steps": [{"title": s["title"], "text": s["text"], "check": s.get("check", "")} for s in doc["steps"]],
        "checklist": doc["checklist"], "folds": doc.get("folds", []), "glossary": doc.get("glossary", {}),
        "derived": {"steps": len(doc["steps"]), "items": len(doc["checklist"]), **count},
    }


def build(doc):
    doc = keep_known(doc, SCHEMA)
    check_structure(doc)
    check_refs(doc, text_fields({k: v for k, v in doc.items() if k != "refs"}, "", NOT_TEXT))
    check_tone(doc, tone_texts(doc))
    return build_page(__file__, TEMPLATE, doc, derive(doc), GATE_DETAIL)
