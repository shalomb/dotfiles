#!/usr/bin/env python3
"""Render a structured decision record (JSON) to one self-contained HTML page.

  decision_render.py in.json out.html

Schema and rules: docs/specs/doc-system/decision.md. The renderer validates the
input, enforces the readout tone rules, derives the countdown and fills `__DATA__`
in decision.template.html. The not-approved gate lives in the template; the input
cannot change or omit it. The author picks the recommendation; the renderer only
checks that exactly one option carries it, with a reason.
"""
import datetime, html, json, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from readout_render import HYPE_WORDS, JARGON_TERMS, fail, need, text_fields  # noqa: E402

TEMPLATE = pathlib.Path(__file__).with_name("decision.template.html")
META_FIELDS = ["eyebrow", "title", "lede", "asof", "foot"]
NOT_TEXT = {"id", "recommended", "start", "today", "date", "ask_by"}


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
    glossary = doc.get("glossary", {})
    if not isinstance(glossary, dict) or not all(isinstance(v, str) and v.strip() for v in glossary.values()):
        fail("glossary", "must map each term to a plain meaning")


def check_tone(doc):
    title = doc["meta"]["title"].strip()
    if re.match(r"(simulation|report|decision):", title, re.I) or len(title.split()) < 5:
        fail("meta.title", "must state a finding in 5 or more words, not start 'Decision:', 'Report:' or 'Simulation:'")
    glossary = doc.get("glossary", {})
    for path, text in text_fields({k: v for k, v in doc.items() if k != "deadline"}, ""):
        top = path.split("[")[0].split(".")[0]
        if top in NOT_TEXT:
            continue
        for word in HYPE_WORDS:
            if re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", text, re.I):
                fail(path, f"hype word {word!r}; say what it does instead")
        if path.startswith("glossary"):
            continue
        for term in JARGON_TERMS:
            if re.search(rf"\b{term}\b", text) and term not in glossary:
                fail(path, f"{term!r} needs a plain meaning in glossary")


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


def main(argv):
    if len(argv) != 3:
        sys.exit("usage: decision_render.py in.json out.html")
    try:
        doc = json.loads(pathlib.Path(argv[1]).read_text())
    except (OSError, json.JSONDecodeError) as exc:
        sys.exit(f"error: cannot read {argv[1]}: {exc}")
    check_structure(doc)
    check_tone(doc)
    data = derive(doc)
    payload = json.dumps(data).replace("<", "\\u003c")
    page = TEMPLATE.read_text().replace("__TITLE__", html.escape(data["meta"]["title"])).replace("__DATA__", payload)
    out = pathlib.Path(argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)


if __name__ == "__main__":
    main(sys.argv)
