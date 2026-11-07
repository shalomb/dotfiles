"""Behavioural tests for .local/bin/calibre-lookup (read-only Calibre metadata search)."""

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / ".local" / "bin" / "calibre-lookup"

SCHEMA = """
create table books(id integer primary key, title text, sort text, path text, pubdate text);
create table authors(id integer primary key, name text);
create table books_authors_link(id integer primary key, book int, author int);
create table tags(id integer primary key, name text);
create table books_tags_link(id integer primary key, book int, tag int);
create table series(id integer primary key, name text);
create table books_series_link(id integer primary key, book int, series int);
create table publishers(id integer primary key, name text);
create table books_publishers_link(id integer primary key, book int, publisher int);
create table identifiers(id integer primary key, book int, type text, val text);
create table comments(id integer primary key, book int, text text);
create table data(id integer primary key, book int, format text, name text);
"""


@pytest.fixture
def library(tmp_path):
    db = sqlite3.connect(tmp_path / "metadata.db")
    db.executescript(SCHEMA)
    db.executescript(
        """
        insert into books values
          (1,'The Linux Command Line','Linux Command Line','William Shotts/The Linux Command Line (1)','2019-01-01'),
          (2,'Plato: Republic','Republic','Plato/Republic (2)','0101-01-01'),
          (3,'CCNA Routing and Switching','CCNA','Wendell Odom/CCNA (3)','2016-05-01');
        insert into authors values (1,'William Shotts'),(2,'Plato'),(3,'Wendell Odom');
        insert into books_authors_link(book,author) values (1,1),(2,2),(3,3);
        insert into tags values (1,'linux'),(2,'philosophy'),(3,'cisco'),(4,'networking');
        insert into books_tags_link(book,tag) values (1,1),(2,2),(3,3),(3,4);
        insert into series values (1,'Cisco Press Official Cert Guide');
        insert into books_series_link(book,series) values (3,1);
        insert into publishers values (1,'No Starch'),(2,'Cisco Press');
        insert into books_publishers_link(book,publisher) values (1,1),(3,2);
        insert into identifiers(book,type,val) values
          (1,'isbn','9781593273897'),(3,'isbn','9781587205972'),(3,'amazon','B01ABC');
        insert into comments(book,text) values (1,'A tour of the shell and scripting'),
          (2,'Dialogue on justice and the ideal state');
        insert into data(book,format,name) values (1,'PDF','linux'),(1,'EPUB','linux'),(3,'PDF','ccna');
        """
    )
    db.commit()
    db.close()
    return tmp_path


def run(library, *args):
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--library", str(library), "--json", *args],
        capture_output=True,
        text=True,
    )


def ids(proc):
    found = sorted(b["id"] for b in json.loads(proc.stdout))
    # grep semantics: exit 1 means "no match", anything else non-zero is an error
    assert proc.returncode == (0 if found else 1), proc.stderr
    return found


def test_free_text_matches_title(library):
    assert ids(run(library, "linux command")) == [1]


def test_free_text_matches_any_field(library):
    assert ids(run(library, "cisco")) == [3]  # tag, series and publisher


def test_terms_are_anded(library):
    assert ids(run(library, "cisco", "linux")) == []


def test_author_filter(library):
    assert ids(run(library, "author:plato")) == [2]


def test_tag_filter(library):
    assert ids(run(library, "tag:networking")) == [3]


def test_isbn_ignores_hyphens(library):
    assert ids(run(library, "isbn:978-1-59327-389-7")) == [1]


def test_topic_searches_comments(library):
    assert ids(run(library, "topic:justice")) == [2]


def test_series_and_publisher_filters(library):
    assert ids(run(library, "series:official")) == [3]
    assert ids(run(library, "publisher:starch")) == [1]


def test_json_includes_fields_and_files(library):
    (book,) = json.loads(run(library, "isbn:9781593273897").stdout)
    assert book["title"] == "The Linux Command Line"
    assert book["authors"] == ["William Shotts"]
    assert book["tags"] == ["linux"]
    assert book["formats"] == ["EPUB", "PDF"]
    assert book["isbn"] == "9781593273897"
    assert book["files"] == [
        str(library / "William Shotts/The Linux Command Line (1)/linux.epub"),
        str(library / "William Shotts/The Linux Command Line (1)/linux.pdf"),
    ]


def test_placeholder_pubdate_is_dropped(library):
    (book,) = json.loads(run(library, "author:plato").stdout)
    assert book["pubdate"] is None


def test_library_is_never_modified(library):
    before = (library / "metadata.db").read_bytes()
    run(library, "linux")
    assert (library / "metadata.db").read_bytes() == before


def test_missing_library_fails_clearly(tmp_path):
    proc = run(tmp_path / "nope", "x")
    assert proc.returncode == 2
    assert "metadata.db" in proc.stderr


def test_unknown_field_fails(library):
    proc = run(library, "bogus:x")
    assert proc.returncode == 2
    assert "bogus" in proc.stderr


def test_plain_output_is_one_line_per_book(library):
    proc = subprocess.run(
        [sys.executable, str(SCRIPT), "--library", str(library), "cisco"],
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0
    lines = proc.stdout.strip().splitlines()
    assert len(lines) == 1
    assert "CCNA Routing and Switching" in lines[0] and "Wendell Odom" in lines[0]
