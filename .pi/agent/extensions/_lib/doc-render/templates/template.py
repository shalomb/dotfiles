#!/usr/bin/env python3
"""Render a structured doc (JSON) to one self-contained HTML page.

  template.py <readout|decision> in.json out.html

Dispatches to the template module of that type. Works from any working directory.
Any failure prints `error: <reason>` on stderr and exits non-zero; no page is written.
"""
import importlib, json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from kernel import reject_style_keys  # noqa: E402

REGISTRY = {"readout": "readout", "decision": "decision"}  # type -> module in this directory


def main(argv):
    types = "|".join(sorted(REGISTRY))
    if len(argv) != 4:
        sys.exit(f"error: usage: template.py <{types}> in.json out.html")
    kind, src, dst = argv[1:]
    if kind not in REGISTRY:
        sys.exit(f"error: unknown template type {kind!r}; known types: {', '.join(sorted(REGISTRY))}")
    try:
        doc = json.loads(pathlib.Path(src).read_text())
    except (OSError, json.JSONDecodeError) as exc:
        sys.exit(f"error: cannot read {src}: {exc}")
    reject_style_keys(doc)
    page = importlib.import_module(REGISTRY[kind]).build(doc)
    out = pathlib.Path(dst)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)


if __name__ == "__main__":
    main(sys.argv)
