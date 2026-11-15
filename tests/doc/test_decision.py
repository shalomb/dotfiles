"""Decision-specific behaviour, run through template.py. Shared rules live in test_doc_templates.py."""
import pytest

from doc_helpers import data_of, fixture_doc, render, render_ok

NAME = "decision"


def page_data(doc, tmp_path):
    page = render_ok(NAME, doc, tmp_path)
    return page, data_of(page)


def test_countdown_is_derived_from_dates(tmp_path):
    _, data = page_data(fixture_doc(NAME), tmp_path)
    d = data["derived"]
    assert d["days_left"] == 26 and d["options"] == 3 and d["needs"] == 3
    assert d["elapsed_pct"] == 33 and d["ask_by_pct"] == 90


def test_exactly_one_recommendation_is_carried(tmp_path):
    _, data = page_data(fixture_doc(NAME), tmp_path)
    assert [o["id"] for o in data["options"] if o["recommended"]] == ["ask"]


def test_reply_is_text_and_never_sent(tmp_path):
    html, data = page_data(fixture_doc(NAME), tmp_path)
    assert data["reply"]["text"].startswith("Re DEMO-12")
    assert "human posts it" in html and "mailto:" not in html


FAILURES = [
    ("no recommendation", lambda d: d["options"][1].pop("recommended"), "options"),
    ("two recommendations", lambda d: d["options"][0].update(recommended=True), "options"),
    ("one option", lambda d: d.update(options=d["options"][:1]), "options"),
    ("missing why", lambda d: d.pop("why"), "why"),
    ("need without by", lambda d: d["needs"][0].pop("by"), "needs[0].by"),
    ("bad date", lambda d: d["deadline"].update(date="10/12/2026"), "deadline.date"),
    ("today after date", lambda d: d["deadline"].update(today="2026-12-11"), "deadline.today"),
    ("ask_by outside range", lambda d: d["deadline"].update(ask_by="2027-01-01"), "deadline.ask_by"),
    ("fact without basis", lambda d: d["facts"][0].pop("basis"), "facts[0].basis"),
    ("reply without text", lambda d: d["reply"].pop("text"), "reply.text"),
]


@pytest.mark.parametrize("name,change,field", FAILURES, ids=[f[0] for f in FAILURES])
def test_validation_failure_names_the_field(tmp_path, name, change, field):
    doc = fixture_doc(NAME)
    change(doc)
    result, _ = render(NAME, doc, tmp_path)
    assert result.returncode != 0 and field in result.stderr


def test_reply_is_optional(tmp_path):
    doc = fixture_doc(NAME)
    doc.pop("reply")
    page_data(doc, tmp_path)
