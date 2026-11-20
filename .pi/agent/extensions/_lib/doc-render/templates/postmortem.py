"""Postmortem template: a structured postmortem (JSON) becomes one self-contained HTML page.

Run through `template.py postmortem in.json out.html`. This module owns validation, the time-ordered
timeline, the derived counts and the second gate sentence. The tone rules, references, claim labels,
gate banner and recipe come from kernel.py. The page is blameless: it names roles and causes, never blame.
"""
from kernel import (glossary_texts, build_page, check_glossary, check_refs, check_tone, fail, keep_known, need, text_fields)

TEMPLATE = "postmortem.html"
GATE_DETAIL = "Read-only: this page records what happened and changes nothing. A human owns each action."
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
EVENT_TYPES = ("detect", "mitigate", "resolve")
STATUSES = ("todo", "doing", "done")
NOT_TEXT = {"id", "time", "type", "status", "due", "href", "kind"}
SCHEMA = {  # the input keys this renderer knows; anything else is dropped before the recipe and the page
    "meta": {k: None for k in META_FIELDS}, "summary": None,
    "impact": [{"label": None, "value": None}],
    "timeline": [{"time": None, "type": None, "text": None}],
    "root_cause": None, "contributing": [None], "went_well": [None],
    "actions": [{k: None for k in ("title", "owner", "due", "status")}],
    "blameless": None,
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
    for key in ("summary", "root_cause", "blameless"):
        need(doc, key, str, "")
    impact = need(doc, "impact", list, "")
    if not impact:
        fail("impact", "must list at least one measure")
    for i, m in enumerate(impact):
        for key in ("label", "value"):
            need(m, key, str, f"impact[{i}]")
    events = need(doc, "timeline", list, "")
    if not events:
        fail("timeline", "must list at least one event")
    for i, e in enumerate(events):
        for key in ("time", "text"):
            need(e, key, str, f"timeline[{i}]")
        if need(e, "type", str, f"timeline[{i}]") not in EVENT_TYPES:
            fail(f"timeline[{i}].type", f"must be one of {', '.join(EVENT_TYPES)}, got {e['type']!r}")
    text_list(doc, "contributing", "")
    text_list(doc, "went_well", "")
    for i, a in enumerate(need(doc, "actions", list, "")):
        for key in ("title", "owner", "due"):
            need(a, key, str, f"actions[{i}]")
        if need(a, "status", str, f"actions[{i}]") not in STATUSES:
            fail(f"actions[{i}].status", f"must be one of {', '.join(STATUSES)}, got {a['status']!r}")
    check_glossary(doc)


def tone_texts(doc):
    body = {k: v for k, v in doc.items() if k not in ("refs", "glossary")}
    return (list(text_fields(body, "", NOT_TEXT)) + glossary_texts(doc)
            + [(f"refs[{i}].title", r["title"]) for i, r in enumerate(doc.get("refs", []))])


def derive(doc):
    events = sorted(doc["timeline"], key=lambda e: e["time"])  # stable: equal times keep input order
    return {
        "meta": {k: doc["meta"][k] for k in META_FIELDS}, "summary": doc["summary"], "impact": doc["impact"],
        "timeline": events, "root_cause": doc["root_cause"], "contributing": doc["contributing"],
        "went_well": doc["went_well"], "actions": doc["actions"], "blameless": doc["blameless"],
        "glossary": doc.get("glossary", {}),
        "derived": {"events": len(events), "factors": len(doc["contributing"]), "actions": len(doc["actions"]),
                    "open": sum(a["status"] != "done" for a in doc["actions"])},
    }


def build(doc):
    doc = keep_known(doc, SCHEMA)
    check_structure(doc)
    check_refs(doc, text_fields({k: v for k, v in doc.items() if k != "refs"}, "", NOT_TEXT))
    check_tone(doc, tone_texts(doc))
    return build_page(__file__, TEMPLATE, doc, derive(doc), GATE_DETAIL)
