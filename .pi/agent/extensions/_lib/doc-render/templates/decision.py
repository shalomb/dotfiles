"""Decision template: a structured decision record (JSON) becomes one self-contained HTML page.

Run through `template.py decision in.json out.html`. Schema and rules: docs/specs/doc-system/decision.md.
This module owns validation, the countdown and the second gate sentence. The author picks the
recommendation; this module only checks that exactly one option carries it, with a reason. The tone
rules, references, claim labels, gate banner and recipe come from kernel.py.
"""
import datetime, sys

from kernel import build_page, check_basis, check_glossary, check_refs, check_tone, fail, need, text_fields

TEMPLATE = "decision.html"
GATE_DETAIL = "Read-only: nothing is posted, deleted, renewed or changed by this page. A human decides."
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
NOT_TEXT = {"id", "recommended", "start", "today", "date", "ask_by", "refs"}  # top-level fields that are not prose
DEEP_SKIP = {"id", "basis"}  # keys that are ids or enums at any depth


def day(deadline, key):
    value = need(deadline, key, str, "deadline")
    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        sys.exit(f"error: deadline.{key}: must be a date like 2026-12-10, got {value!r}")


def check_structure(doc):
    meta = need(doc, "meta", dict, "")
    for key in META_FIELDS:
        need(meta, key, str, "meta")
    need(doc, "why", str, "")
    deadline = need(doc, "deadline", dict, "")
    start, today, date, ask_by = (day(deadline, k) for k in ("start", "today", "date", "ask_by"))
    if not start <= today <= date:
        fail("deadline.today", "must fall between start and date")
    if not start <= ask_by <= date:
        fail("deadline.ask_by", "must fall between start and date")
    for key in ("date_label", "ask_by_note"):
        need(deadline, key, str, "deadline")
    for i, f in enumerate(doc.get("facts", [])):
        for key in ("value", "label"):
            need(f, key, str, f"facts[{i}]")
        check_basis(f, f"facts[{i}]")
    options = need(doc, "options", list, "")
    if len(options) < 2:
        fail("options", f"needs at least 2 options, got {len(options)}")
    picked = [o for o in options if isinstance(o, dict) and o.get("recommended") is True]
    if len(picked) != 1:
        fail("options", f"exactly one option must be marked recommended, got {len(picked)}")
    for i, o in enumerate(options):
        for key in ("id", "title", "pro", "con", "note"):
            need(o, key, str, f"options[{i}]")
    for i, r in enumerate(need(doc, "needs", list, "")):
        for key in ("need", "from", "by"):
            need(r, key, str, f"needs[{i}]")
    if "reply" in doc:
        for key in ("to", "text"):
            need(doc["reply"], key, str, "reply")
    check_glossary(doc)


def tone_texts(doc):
    body = {k: v for k, v in doc.items() if k != "deadline"}
    return [(path, text) for path, text in text_fields(body, "", DEEP_SKIP)
            if path.split("[")[0].split(".")[0] not in NOT_TEXT]


def derive(doc):
    d = doc["deadline"]
    start, today, date, ask_by = (datetime.date.fromisoformat(d[k]) for k in ("start", "today", "date", "ask_by"))
    span = max((date - start).days, 1)
    data = {
        "meta": {k: doc["meta"][k] for k in META_FIELDS},
        "deadline": {k: d[k] for k in ("start", "today", "date", "ask_by", "date_label", "ask_by_note")},
        "facts": doc.get("facts", []),
        "options": [{**{k: o[k] for k in ("id", "title", "pro", "con", "note")},
                     "recommended": o.get("recommended") is True} for o in doc["options"]],
        "why": doc["why"], "needs": doc["needs"], "glossary": doc.get("glossary", {}),
        "derived": {"days_left": (date - today).days, "options": len(doc["options"]), "needs": len(doc["needs"]),
                    "elapsed_pct": round(100 * (today - start).days / span),
                    "ask_by_pct": round(100 * (ask_by - start).days / span)},
    }
    if "reply" in doc:
        data["reply"] = {"to": doc["reply"]["to"], "text": doc["reply"]["text"]}
    return data


def build(doc):
    check_structure(doc)
    check_refs(doc, text_fields({k: v for k, v in doc.items() if k != "refs"}, "", DEEP_SKIP))
    check_tone(doc, tone_texts(doc))
    return build_page(__file__, TEMPLATE, doc, derive(doc), GATE_DETAIL)
