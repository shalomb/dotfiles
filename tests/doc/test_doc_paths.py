"""The private-path rule for the doc templates: one classifier, three checkpoints.

Checkpoint 1 is the input (keys and values), 2 is text read from Jira (redacted), 3 is the finished page
(the authority). These tests pin the RULE over every marker x prefix x placement, not a list of examples."""
import json
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path

import pytest

from doc_helpers import TEMPLATES_DIR, data_of, fixture_doc, load_kernel, recipe_of, render, render_ok

MARKERS = ["/home/", "/Users/", "/root/", "/tmp/", "/var/folders/", "/private/", "/mnt/", "/media/",
           "/Volumes/", "/run/user/"]
LEAF = "alice/notes.md"


def pct(t):
    return urllib.parse.quote(t, safe="")


PREFIXES = {
    "plain": lambda t: t,
    "var": lambda t: "/var" + t,
    "mnt-c": lambda t: "/mnt/c" + t,
    "file-url": lambda t: "file://" + t,
    "percent": pct,
    "percent-twice": lambda t: pct(pct(t)),
    "entity": lambda t: t.replace("/", "&#47;"),
    "backslash": lambda t: t.replace("/", "\\"),
    "in-prose": lambda t: f"see ({t}), then",
}
OTHER_FORMS = ["\\\\srv\\share\\notes", "//srv/share/notes", "C:\\Users\\Bob\\x", "d:/work/x", "~/notes.md", "~bob/notes.md",
               "file:///etc/private.conf", "FILE:///x", "%2Fhome%2Falice", "\\u002fhome\\u002falice\\u002fx"]
ALLOWED = [
    "https://example.com/home/alice/x", "https://example.com/docs-/home/page", "http://host/tmp/x/y",
    "see https://example.com/Users/a/b for details", "the /tmp/ directory", "the /tmp directory", "/home", "/root alone",
    "/etc/nginx/nginx.conf", "/usr/bin/env", "/var/log/syslog", "/opt/app/bin", "and/or", "10/12/2026",
    "tests/doc/test_x.py", "python3 -m pytest -q", "docs/specs/doc-system/kernel.md", "a:b", "use `ls /etc`",
]
SYSTEM_PLACEMENTS = ["value", "key", "list", "glossary-key", "nested"]
TEMPLATES = ["readout", "decision"]


@pytest.fixture()
def k():
    return load_kernel()


# T1: the classifier, over every marker and prefix -------------------------------------------------

@pytest.mark.parametrize("marker", MARKERS)
@pytest.mark.parametrize("prefix", sorted(PREFIXES))
def test_every_marker_in_every_form_is_private(k, marker, prefix):
    text = PREFIXES[prefix](marker + LEAF)
    assert k.has_private(text), text


@pytest.mark.parametrize("form", OTHER_FORMS)
def test_url_and_windows_forms_are_private(k, form):
    assert k.has_private(f"see {form} please"), form


@pytest.mark.parametrize("text", ALLOWED)
def test_public_urls_bare_mentions_and_system_paths_pass(k, text):
    assert not k.has_private(text), k.private_tokens(text)


def test_a_marker_needs_one_more_segment_to_count(k):
    assert not k.has_private("/home/") and not k.has_private("/Users/") and k.has_private("/home/x")


# T2: this machine's own roots ---------------------------------------------------------------------

def test_this_users_home_and_the_temp_dir_are_private_anywhere(k, tmp_path):
    home = str(Path.home())
    assert k.has_private(f"notes at {home}/x") and k.has_private(home)
    assert k.has_private(str(tmp_path) + "/in.json")
    assert k.has_private(pct(f"{home}/x")) and k.has_private(f"file://{home}/x")


def test_extra_roots_are_private_and_set_roots_replaces_them(k):
    k.set_roots(["/srv/team-share/proj"])
    assert k.has_private("/srv/team-share/proj/a") and k.has_private("x/srv/team-share/proj")
    assert not k.has_private("/srv/team-share") and not k.has_private("/srv/other/proj/a")
    k.set_roots([])
    assert not k.has_private("/srv/team-share/proj/a")


def test_a_root_of_slash_or_nothing_never_makes_everything_private(k):
    k.set_roots(["/", "", "."])
    assert not k.has_private("/etc/nginx/x") and not k.has_private("plain words")


def test_redact_replaces_only_the_private_tokens_and_counts_them(k):
    text, n = k.redact("open /home/alice/a.md and https://example.com/home/x or /etc/hosts and C:\\Users\\Bob\\f")
    assert n == 2 and "/home/alice" not in text and "Bob" not in text
    assert "https://example.com/home/x" in text and "/etc/hosts" in text and "\u2039local path\u203a" in text
    assert k.redact("nothing private here") == ("nothing private here", 0)


# T1 again at the door: every placement, both author-text templates --------------------------------

def put(doc, placement, token):
    if placement == "value":
        doc["problem" if "problem" in doc else "why"] = token
    elif placement == "key":
        doc["extra_" + token] = "x"
    elif placement == "list":
        doc["refs"] = [{"id": "r1", "title": token, "href": "docs/x.md", "kind": "spec"}]
    elif placement == "glossary-key":
        doc["glossary"] = {token: "a plain meaning"}
    elif placement == "nested":
        doc["notes_block"] = {"deep": [{"deeper": token}]}
    return doc


@pytest.mark.parametrize("name", TEMPLATES)
@pytest.mark.parametrize("placement", SYSTEM_PLACEMENTS)
@pytest.mark.parametrize("token", ["/home/alice/x.md", "/var/home/alice/x", "/mnt/c/Users/Bob/x", "file:///etc/private.conf",
                                   "%2Fhome%2Falice%2Fx", "\\\\srv\\share\\x"])
def test_input_checkpoint_names_the_location(name, placement, token, tmp_path):
    doc = put(fixture_doc(name), placement, token)
    result, out = render(name, doc, tmp_path)
    assert result.returncode != 0 and not out.exists(), result.stderr
    assert result.stderr.startswith("error: ") and "private paths are not allowed" in result.stderr
    if placement in ("key", "glossary-key"):
        assert "(key)" in result.stderr, result.stderr
    if placement == "list":
        assert "refs[0].title" in result.stderr, result.stderr


@pytest.mark.parametrize("name", TEMPLATES)
def test_honest_prose_still_builds(name, tmp_path):
    doc = fixture_doc(name)
    doc["problem" if "problem" in doc else "why"] = "Logs go to the /tmp/ directory, see https://example.com/home/guide and /etc/nginx/x."
    render_ok(name, doc, tmp_path)


def test_epicmap_cache_field_is_the_only_exempt_input(tmp_path):
    doc = fixture_doc("epicmap")
    assert Path(doc["cache"]).is_absolute()
    page = render_ok("epicmap", doc, tmp_path)
    assert doc["cache"] not in page
    doc["note"] = "/home/alice/x"
    result, out = render("epicmap", doc, tmp_path / "again")
    assert result.returncode != 0 and "private paths" in result.stderr


# T3-T4: the final gate does not trust the renderers -----------------------------------------------

LEAKY_PAGES = {
    "recipe": '<html><body><script type="application/json" id="recipe">{"input": {"x": "/home/alice/leak"}}</script></body></html>',
    "recipe key": '<html><body><script type="application/json" id="recipe">{"/home/alice/leak": 1}</script></body></html>',
    "DATA": '<html><body><script>const DATA={"meta":{"foot":"see /mnt/c/Users/a/x"}};\nlet y=1;</script></body></html>',
    "page text": "<html><body><p>open /var/home/alice/notes please</p></body></html>",
    "attribute": '<html><body><a href="file:///home/alice/x">x</a></body></html>',
}


@pytest.fixture()
def leaky_dir(tmp_path):
    copy = tmp_path / "templates"
    shutil.copytree(TEMPLATES_DIR, copy, ignore=shutil.ignore_patterns("__pycache__"))
    (copy / "leaky.py").write_text(
        "import json, pathlib\n"
        "PAGES = json.loads((pathlib.Path(__file__).parent / 'pages.json').read_text())\n"
        "def build(doc):\n    return PAGES[doc['which']]\n")
    (copy / "pages.json").write_text(json.dumps(LEAKY_PAGES))
    tpl = (copy / "template.py").read_text()
    marker = 'REGISTRY = {'
    assert marker in tpl
    (copy / "template.py").write_text(tpl.replace(marker, 'REGISTRY = {"leaky": "leaky", ', 1))
    return copy


@pytest.mark.parametrize("which,where", [("recipe", "recipe"), ("recipe key", "recipe"), ("DATA", "DATA"),
                                         ("page text", "page text"), ("attribute", "page text")])
def test_final_gate_fails_even_when_a_renderer_leaks_after_validation(leaky_dir, tmp_path, which, where):
    src, out = tmp_path / "in.json", tmp_path / "o" / "page.html"
    src.write_text(json.dumps({"which": which}))
    run = subprocess.run([sys.executable, str(leaky_dir / "template.py"), "leaky", str(src), str(out)],
                         capture_output=True, text=True)
    assert run.returncode != 0 and not out.exists()
    assert run.stderr.startswith("error: final page: a private path survived in " + where), run.stderr


# T5: Jira text is redacted, not rejected -----------------------------------------------------------

def adf(text):
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def jira(path, text, summary="Plain epic"):
    path.mkdir(parents=True, exist_ok=True)
    rows = [{"key": "PRV-1", "fields": {"summary": summary, "status": {"name": "Implementing"}, "assignee": None,
                                          "description": adf(text), "issuelinks": []}}]
    (path / "issues.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n")


def test_jira_text_with_paths_builds_with_the_paths_removed_and_counted(tmp_path):
    jira(tmp_path / "cache", "In short: see /home/alice/notes.md and C:\\Users\\Bob\\f and file:///etc/x for the plan.",
         summary="Plan at /Users/alice/plan.md")
    page = render_ok("epicmap", {"cache": str(tmp_path / "cache"), "epic": "PRV-1"}, tmp_path / "o")
    data = data_of(page)
    blob = json.dumps(data) + json.dumps(recipe_of(page)) + page
    for leak in ("alice", "Bob", "/etc/x", "/Users/"):
        assert leak not in blob, leak
    assert data["derived"]["redactions"] >= 3
    assert "local paths were removed from the Jira text" in data["meta"]["foot"]
    assert "local path" in data["top"]["nodes"][0]["plain"] or "local path" in data["meta"]["lede"]


def test_jira_text_without_paths_reports_no_redactions(tmp_path):
    jira(tmp_path / "cache", "In short: nothing private.")
    data = data_of(render_ok("epicmap", {"cache": str(tmp_path / "cache"), "epic": "PRV-1"}, tmp_path / "o"))
    assert data["derived"]["redactions"] == 0 and "removed from the Jira text" not in data["meta"]["foot"]


# T7: the command line ------------------------------------------------------------------------------

def tpl(*args, stdin=None):
    return subprocess.run([sys.executable, str(TEMPLATES_DIR / "template.py"), *args], capture_output=True, text=True, input=stdin)


def test_check_page_exit_codes(tmp_path):
    clean, dirty = tmp_path / "clean.html", tmp_path / "dirty.html"
    clean.write_text("<html><body><p>hello</p></body></html>")
    dirty.write_text(LEAKY_PAGES["page text"])
    ok, bad = tpl("--check-page", str(clean)), tpl("--check-page", str(dirty))
    assert (ok.returncode, ok.stdout, ok.stderr) == (0, "", "")
    assert bad.returncode != 0 and bad.stderr.startswith("error: final page: a private path survived")
    assert tpl("--check-page", str(tmp_path / "missing.html")).returncode != 0
    assert tpl("--check-page").returncode != 0


def test_a_real_page_passes_its_own_gate(tmp_path):
    for name in ("readout", "decision", "epicmap"):
        render_ok(name, fixture_doc(name), tmp_path / name)
        assert tpl("--check-page", str(tmp_path / name / "out" / "page.html")).returncode == 0, name


def test_redact_round_trip():
    run = tpl("--redact", stdin="ask /home/alice/x or see https://example.com/a and /etc/hosts\nline two ~/y\n")
    assert run.returncode == 0
    assert "alice" not in run.stdout and "~/y" not in run.stdout
    assert "https://example.com/a" in run.stdout and "/etc/hosts" in run.stdout and run.stdout.count("\u2039local path\u203a") == 2
    assert run.stdout.endswith("\n") and run.stdout.count("\n") == 2
    again = tpl("--redact", stdin=run.stdout)
    assert again.stdout == run.stdout


# glossary terms are visible text --------------------------------------------------------------------

@pytest.mark.parametrize("name", TEMPLATES)
def test_glossary_keys_and_definitions_get_the_tone_check_wherever_they_sit(name, tmp_path):
    for glossary, word in (({"a seamless term": "plain"}, "seamless"), ({"id": "a seamless meaning"}, "seamless"),
                           ({"rag": "a robust meaning"}, "robust"), ({"roam": "a powerful meaning"}, "powerful")):
        doc = fixture_doc(name)
        doc["glossary"] = {**doc.get("glossary", {}), **glossary}   # keep the fixture's own terms glossed
        result, out = render(name, doc, tmp_path)
        assert result.returncode != 0 and word in result.stderr, (glossary, result.stderr)


# ---- the structural bugs the third review found, each pinned by a test that failed first -------------------

def check_page(tmp_path, page, *roots):
    f = tmp_path / "p.html"
    f.write_text(page)
    args = ["--check-page", str(f)] + [x for r in roots for x in ("--root", r)]
    return tpl(*args)


def test_the_gate_reads_the_page_script_outside_its_data(tmp_path):
    page = '<html><script>const DATA={"meta":{}};\n// built at /home/alice/x\nlet y=1;</script></html>'
    bad = check_page(tmp_path, page)
    assert bad.returncode != 0 and "private path survived in page text" in bad.stderr
    clean = check_page(tmp_path, '<html><script>const DATA={"meta":{"a":"/etc/hosts"}};\nlet y=1;</script></html>')
    assert clean.returncode == 0, clean.stderr
    inside = check_page(tmp_path, '<html><script>const DATA={"meta":{"a":"/home/alice/x"}};\n</script></html>')
    assert inside.returncode != 0 and "survived in DATA" in inside.stderr


def test_every_shipped_template_page_still_passes_the_stricter_gate(tmp_path):
    for name in ("readout", "decision", "epicmap"):
        render_ok(name, fixture_doc(name), tmp_path / name)
        assert tpl("--check-page", str(tmp_path / name / "out" / "page.html")).returncode == 0, name


def test_a_link_with_no_host_is_not_public(k):
    for text in ("https:///home/alice/secret", "https://:80/home/alice/x"):
        assert k.has_private(text), text
    assert not k.has_private("https://example.com/home/alice/x") and not k.has_private("http://localhost:8080/home/a")


def test_the_check_and_redact_commands_take_the_input_folder_as_a_root(tmp_path):
    page = "<html><body><p>kept in /srv/acme/plans/x.md</p></body></html>"
    assert check_page(tmp_path, page).returncode == 0                       # nothing says /srv/acme is private yet
    assert check_page(tmp_path, page, "/srv/acme").returncode != 0
    run = tpl("--redact", "--root", "/srv/acme", stdin="see /srv/acme/plans/x.md and /etc/hosts\n")
    assert run.stdout == "see \u2039local path\u203a and /etc/hosts\n"


def test_one_source_path_is_one_removal_however_often_it_is_shown(tmp_path):
    jira(tmp_path / "cache", "In short: see /home/alice/only-once.md for the plan.")
    data = data_of(render_ok("epicmap", {"cache": str(tmp_path / "cache"), "epic": "PRV-1"}, tmp_path / "o"))
    assert data["derived"]["redactions"] == 1
    assert data["meta"]["foot"].endswith("1 local path was removed from the Jira text.")


def test_a_path_in_the_jira_status_is_redacted_not_refused(tmp_path):
    jira(tmp_path / "cache", "In short: ok.")
    rows = [json.loads(x) for x in (tmp_path / "cache" / "issues.jsonl").read_text().splitlines()]
    rows[0]["fields"]["status"]["name"] = "Blocked at /home/bob/secret"
    (tmp_path / "cache" / "issues.jsonl").write_text(json.dumps(rows[0]) + "\n")
    page = render_ok("epicmap", {"cache": str(tmp_path / "cache"), "epic": "PRV-1"}, tmp_path / "o")
    assert "bob" not in page and "\u2039local path\u203a" in page


# ---- cheap, principled boundary rules: a delimiter before a marker, home variables, punctuation ----------

@pytest.mark.parametrize("text", ["user@host:/home/x", "path=/home/alice", "`/home/alice`", "(/Users/bob)", "x:/mnt/c/Users/z",
                                  "$HOME/secret.md", "${HOME}/secret.md", "%USERPROFILE%/Documents/p.docx", "$USERPROFILE\\x",
                                  "'/home/alice/notes.md'", "[/root/x]"])
def test_delimited_and_variable_forms_are_private(k, text):
    assert k.has_private(text), text


@pytest.mark.parametrize("text", ["end of sentence /tmp/.", "see /tmp/, then", "the $HOME variable", "set $HOME", "about ~5 items",
                                  "a/home/b", "docs/home/guide.md", "1/2", "and/or", "a:b", "v1.2/3"])
def test_sentence_punctuation_and_bare_variable_names_are_honest(k, text):
    assert not k.has_private(text), k.private_tokens(text)


def test_a_quoted_path_with_spaces_is_redacted_whole(k):
    text, n = k.redact('open "/home/Alice Smith/Secret Plan.md" now and \'C:\\Users\\Bob Jones\\My Notes.txt\' too')
    assert "Smith" not in text and "Secret" not in text and "Jones" not in text and "Notes" not in text
    assert text == "open \"\u2039local path\u203a\" now and '\u2039local path\u203a' too" and n == 2


def test_distinct_counting_through_redact_deep(k):
    seen = set()
    out, _ = k.redact_deep({"a": "/home/x/y.md", "b": ["/home/x/y.md and /home/z/w.md"]}, seen)
    assert len(seen) == 2 and "x/y.md" not in json.dumps(out)
