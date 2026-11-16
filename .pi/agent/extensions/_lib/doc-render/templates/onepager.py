"""Onepager template: a structured one-page brief (JSON) becomes one self-contained HTML page.

Run through `template.py onepager in.json out.html`. This module owns validation, the derived counts and
the second gate sentence. The tone rules, references, claim labels, gate banner and recipe come from kernel.py.
The ask box records what the author asks for; the page grants nothing.
"""
from kernel import (glossary_texts, build_page, check_basis, check_glossary, check_refs, check_tone, fail, keep_known, need, text_fields)

TEMPLATE = "onepager.html"
GATE_DETAIL = "Read-only: this page states an ask and decides nothing. A human decides."
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
SPINE = ("today", "so", "instead", "we_ask")
NOT_TEXT = {"id", "basis", "href", "kind"}
SCHEMA = {  # the input keys this renderer knows; anything else is dropped before the recipe and the page
    "meta": {k: None for k in META_FIELDS}, "ask": None,
    "tiles": [{"label": None, "value": None, "basis": None}],
    "spine": {k: None for k in SPINE},
    "points": [{"title": None, "text": None}],
    "decision": {"question": None, "options": [None], "by": None},
    "glossary": None, "refs": [{"id": None, "title": None, "kind": None, "href": None}],
}


def check_structure(doc):
    meta = need(doc, "meta", dict, "")
    for key in META_FIELDS:
        need(meta, key, str, "meta")
    need(doc, "ask", str, "")
    tiles = need(doc, "tiles", list, "")
    if not tiles:
        fail("tiles", "must hold at least one tile")
    for i, t in enumerate(tiles):
        for key in ("label", "value"):
            need(t, key, str, f"tiles[{i}]")
        check_basis(t, f"tiles[{i}]")
    spine = need(doc, "spine", dict, "")
    for key in SPINE:
        need(spine, key, str, "spine")
    points = need(doc, "points", list, "")
    if len(points) != 3:
        fail("points", f"must hold exactly 3 key points, got {len(points)}")
    for i, p in enumerate(points):
        for key in ("title", "text"):
            need(p, key, str, f"points[{i}]")
    d = need(doc, "decision", dict, "")
    need(d, "question", str, "decision")
    need(d, "by", str, "decision")
    opts = need(d, "options", list, "decision")
    if not opts or not all(isinstance(x, str) and x.strip() for x in opts):
        fail("decision.options", "must be a non-empty list of text")
    check_glossary(doc)


def tone_texts(doc):
    body = {k: v for k, v in doc.items() if k not in ("refs", "glossary")}
    return (list(text_fields(body, "", NOT_TEXT)) + glossary_texts(doc)
            + [(f"refs[{i}].title", r["title"]) for i, r in enumerate(doc.get("refs", []))])


def derive(doc):
    return {
        "meta": {k: doc["meta"][k] for k in META_FIELDS}, "ask": doc["ask"], "tiles": doc["tiles"],
        "spine": doc["spine"], "points": doc["points"], "decision": doc["decision"],
        "glossary": doc.get("glossary", {}),
        "derived": {"tiles": len(doc["tiles"]), "options": len(doc["decision"]["options"]),
                    "sources": len(doc.get("refs", []))},
    }


def build(doc):
    doc = keep_known(doc, SCHEMA)
    check_structure(doc)
    check_refs(doc, text_fields({k: v for k, v in doc.items() if k != "refs"}, "", NOT_TEXT))
    check_tone(doc, tone_texts(doc))
    return build_page(__file__, TEMPLATE, doc, derive(doc), GATE_DETAIL)
