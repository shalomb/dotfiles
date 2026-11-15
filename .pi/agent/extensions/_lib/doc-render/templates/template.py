#!/usr/bin/env python3
"""Render a structured doc (JSON) to one self-contained HTML page.

  template.py <readout|decision|epicmap> in.json out.html
  template.py --list              the template types, as a JSON array
  template.py --example <type>    a valid example input for that type (examples/<type>.json)

Dispatches to the template module of that type. Works from any working directory.
Any failure prints `error: <reason>` on stderr and exits non-zero; no page is written.
"""
import importlib, json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from kernel import reject_style_keys  # noqa: E402

REGISTRY = {"readout": "readout", "decision": "decision", "epicmap": "epicmap"}  # type -> module in this directory


def unknown(kind):
    sys.exit(f"error: unknown template type {kind!r}; known types: {', '.join(sorted(REGISTRY))}")


def main(argv):
    types = "|".join(sorted(REGISTRY))
    if argv[1:] == ["--list"]:
        print(json.dumps(sorted(REGISTRY)))
        return
    if argv[1:2] == ["--example"]:
        if len(argv) != 3:
            sys.exit(f"error: usage: template.py --example <{types}>")
        if argv[2] not in REGISTRY:
            unknown(argv[2])
        print((HERE / "examples" / f"{argv[2]}.json").read_text(), end="")
        return
    if len(argv) != 4:
        sys.exit(f"error: usage: template.py <{types}> in.json out.html")
    kind, src, dst = argv[1:]
    if kind not in REGISTRY:
        unknown(kind)
    try:
        doc = json.loads(pathlib.Path(src).read_text())
    except (OSError, json.JSONDecodeError) as exc:
        sys.exit(f"error: cannot read {src}: {exc}")
    reject_style_keys(doc)
    module = importlib.import_module(REGISTRY[kind])
    if getattr(module, "NEEDS_BASE", False):  # the input points at local files: resolve them from the input's folder
        page = module.build(doc, base=pathlib.Path(src).resolve().parent)
    else:
        page = module.build(doc)
    out = pathlib.Path(dst)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)


if __name__ == "__main__":
    main(sys.argv)
