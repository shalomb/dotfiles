"""Runbook template: a structured runbook (JSON) becomes one self-contained HTML page.

Run through `template.py runbook in.json out.html`. This module owns validation, the derived counts and the
second gate sentence. The tone rules, references, gate banner and recipe come from kernel.py.
Commands are shown, never run; they are exempt from the tone rules because they are code, not prose.
"""
from kernel import (glossary_texts, build_page, check_glossary, check_refs, check_tone, keep_known, need, opt_text, text_fields)

TEMPLATE = "runbook.html"
GATE_DETAIL = "Read-only: this page shows commands and runs none of them. A human runs each step."
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
NOT_TEXT = {"command", "href", "kind", "id"}
STEP = {"title": None, "command": None, "expect": None}
SCHEMA = {  # the input keys this renderer knows; anything else is dropped before the recipe and the page
    "meta": {k: None for k in META_FIELDS}, "purpose": None,
    "preconditions": [{"item": None, "check": None}],
    "steps": [STEP], "rollback": [STEP],
    "escalation": [{k: None for k in ("role", "when", "how")}],
    "glossary": None, "refs": [{"id": None, "title": None, "kind": None, "href": None}],
}


def check_structure(doc):
    meta = need(doc, "meta", dict, "")
    for key in META_FIELDS:
        need(meta, key, str, "meta")
    need(doc, "purpose", str, "")
    for i, p in enumerate(need(doc, "preconditions", list, "")):
        need(p, "item", str, f"preconditions[{i}]")
        opt_text(p, "check", f"preconditions[{i}]")
    for name in ("steps", "rollback"):
        for i, s in enumerate(need(doc, name, list, "")):
            for key in ("title", "command", "expect"):
                need(s, key, str, f"{name}[{i}]")
    for i, e in enumerate(need(doc, "escalation", list, "")):
        for key in ("role", "when", "how"):
            need(e, key, str, f"escalation[{i}]")
    check_glossary(doc)


def tone_texts(doc):
    body = {k: v for k, v in doc.items() if k not in ("refs", "glossary")}
    return (list(text_fields(body, "", NOT_TEXT)) + glossary_texts(doc)
            + [(f"refs[{i}].title", r["title"]) for i, r in enumerate(doc.get("refs", []))])


def derive(doc):
    return {
        "meta": {k: doc["meta"][k] for k in META_FIELDS}, "purpose": doc["purpose"],
        "preconditions": [{"item": p["item"], "check": p.get("check", "")} for p in doc["preconditions"]],
        "steps": doc["steps"], "rollback": doc["rollback"], "escalation": doc["escalation"],
        "glossary": doc.get("glossary", {}),
        "derived": {"preconditions": len(doc["preconditions"]), "steps": len(doc["steps"]),
                    "rollback": len(doc["rollback"]), "contacts": len(doc["escalation"])},
    }


def build(doc):
    doc = keep_known(doc, SCHEMA)
    check_structure(doc)
    check_refs(doc, text_fields({k: v for k, v in doc.items() if k != "refs"}, "", NOT_TEXT))
    check_tone(doc, tone_texts(doc))
    return build_page(__file__, TEMPLATE, doc, derive(doc), GATE_DETAIL)
