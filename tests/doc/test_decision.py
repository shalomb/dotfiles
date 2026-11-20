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


# ---- D5: dates in people's words, the label is a plain noun phrase ----

def test_dates_are_shown_in_words_not_iso(tmp_path):
    page, data = page_data(fixture_doc(NAME), tmp_path)
    d = data["deadline"]
    assert (d["today_text"], d["date_text"], d["ask_by_text"]) == ("14 Nov 2026", "10 Dec 2026", "6 Dec 2026")
    script = page.split("const M=DATA.meta", 1)[1].split("renderMade();")[0]
    for iso in ("L.today)", "L.date)", "L.ask_by+"):
        assert iso not in script


def test_a_day_below_ten_has_no_leading_zero_and_every_month_has_a_name(tmp_path):
    doc = fixture_doc(NAME)
    doc["deadline"].update(start="2026-01-01", today="2026-01-02", ask_by="2026-09-03", date="2026-12-31")
    d = page_data(doc, tmp_path)[1]["deadline"]
    assert (d["today_text"], d["ask_by_text"], d["date_text"]) == ("2 Jan 2026", "3 Sep 2026", "31 Dec 2026")


@pytest.mark.parametrize("label", ["renewal", "expiry", "contract end"])
def test_the_tile_and_the_bar_end_use_the_label_as_given(tmp_path, label):
    doc = fixture_doc(NAME)
    doc["deadline"]["date_label"] = label
    page, data = page_data(doc, tmp_path)
    assert data["deadline"]["date_label"] == label
    script = page.split("const M=DATA.meta", 1)[1].split("renderMade();")[0]
    assert '"days to "+L.date_label' in script and "text:L.date_label" in script and ".replace(" not in script


@pytest.mark.parametrize("label,ok", [("x" * 40, True), ("x" * 41, False), ("", False)])
def test_label_is_a_short_noun_phrase(tmp_path, label, ok):
    doc = fixture_doc(NAME)
    doc["deadline"]["date_label"] = label
    result, _ = render(NAME, doc, tmp_path)
    assert (result.returncode == 0) is ok
    assert ok or "deadline.date_label" in result.stderr
