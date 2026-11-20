"""Unit tests for the shared kernel (templates/kernel.py). Page-level rules run per template in test_doc_templates.py."""
import pytest

from doc_helpers import load_kernel

K = load_kernel()


def refs(*ids):
    return [{"id": i, "title": i, "href": f"{i}.md", "kind": "spec"} for i in ids]


def test_number_refs_follows_first_citation_then_listed_order():
    doc = {"refs": refs("r1", "r2", "r3"), "a": "see [r2] then [r1]", "b": ["again [r2]"]}
    assert K.number_refs(doc) == {"r2": 1, "r1": 2, "r3": 3}


def test_reference_list_marks_uncited_refs():
    doc = {"refs": refs("r1", "r2"), "a": "only [r2]"}
    assert [(r["id"], r["n"], r["cited"]) for r in K.reference_list(doc)] == [("r2", 1, True), ("r1", 2, False)]


def test_check_refs_names_path_and_id_for_an_unknown_citation():
    with pytest.raises(SystemExit, match=r"error: body: unknown reference 'r9'"):
        K.check_refs({"refs": refs("r1")}, [("body", "see [r9]")])


def test_check_basis_accepts_only_measured_or_judged():
    K.check_basis({"basis": "measured"}, "x[0]")
    K.check_basis({"basis": "judged"}, "x[0]")
    for item in ({}, {"basis": "derived"}, {"basis": ""}):
        with pytest.raises(SystemExit, match=r"error: x\[0\]\.basis"):
            K.check_basis(item, "x[0]")


def test_claim_labels_marks_every_computed_value_derived():
    assert K.claim_labels({"a": 1, "b": 2}) == {"a": "derived", "b": "derived"}


def test_reject_style_keys_walks_dicts_and_lists_and_names_the_path():
    with pytest.raises(SystemExit, match=r"error: a\.b\[1\]\.Palette: brand, theme and styling"):
        K.reject_style_keys({"a": {"b": [{}, {"Palette": 1}]}})
    K.reject_style_keys({"a": {"b": [{"ok": "brand"}]}})


def test_build_page_fills_every_placeholder_once_and_keeps_input_out_of_the_gate(tmp_path):
    doc = {"meta": {"title": "A title <b> that states a finding"}, "refs": []}
    page = K.build_page(K.HERE / "readout.py", "readout.html", doc, {"meta": doc["meta"], "derived": {"n": 1}}, "Detail.")
    assert page.count(f"<b>{K.GATE_LEAD}</b> Detail.") == 1
    assert "A title &lt;b&gt; that" in page and "\\u003cb>" in page
    for placeholder in ("__TITLE__", "__DATA__", "__GATE__", "__RECIPE__", "KERNEL_CSS__", "KERNEL_JS__"):
        assert placeholder not in page


def test_tone_word_list_is_the_one_in_the_kernel():
    assert "robust" in K.HYPE_WORDS and "TFC" in K.JARGON_TERMS
