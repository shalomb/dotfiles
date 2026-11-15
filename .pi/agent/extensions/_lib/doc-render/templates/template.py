#!/usr/bin/env python3
"""Render a structured doc (JSON) to one self-contained HTML page.

  template.py <readout|decision|epicmap> in.json out.html
  template.py --list              the template types, as a JSON array
  template.py --example <type>    a valid example input for that type (examples/<type>.json)
  template.py --check-page FILE [--root DIR]...   exit 0 if the finished page holds no private path, else an error
  template.py --redact [--root DIR]...            read text on stdin, write it with private paths replaced
  (--root names a folder that counts as private, e.g. the input's folder; the working directory always does)

Dispatches to the template module of that type. Works from any working directory.
Any failure prints `error: <reason>` on stderr and exits non-zero; no page is written.
"""
import importlib, json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from kernel import gate_page, redact, reject_private_paths, reject_style_keys, set_roots  # noqa: E402

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
    if argv[1:2] in (["--check-page"], ["--redact"]):
        rest, roots = argv[2:], []
        while "--root" in rest:
            at = rest.index("--root")
            if at + 1 >= len(rest):
                sys.exit(f"error: usage: template.py {argv[1]} ... --root DIR")
            roots.append(rest[at + 1])
            del rest[at:at + 2]
        set_roots([*roots, pathlib.Path.cwd()])
        if argv[1] == "--redact":
            if rest:
                sys.exit("error: usage: template.py --redact [--root DIR]...")
            sys.stdout.write(redact(sys.stdin.read())[0])
            return
        if len(rest) != 1:
            sys.exit("error: usage: template.py --check-page FILE [--root DIR]...")
        try:
            page = pathlib.Path(rest[0]).read_text()
        except OSError as exc:
            sys.exit(f"error: cannot read {rest[0]}: {exc}")
        gate_page(page)
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
    set_roots([pathlib.Path(src).resolve().parent, pathlib.Path.cwd()])  # this machine's private places, as well as home and temp
    module = importlib.import_module(REGISTRY[kind])
    reject_private_paths(doc, getattr(module, "PATH_FIELDS", ()))
    if getattr(module, "NEEDS_BASE", False):  # the input points at local files: resolve them from the input's folder
        page = module.build(doc, base=pathlib.Path(src).resolve().parent)
    else:
        page = module.build(doc)
    gate_page(page)  # checkpoint 3: the finished page is the authority, whatever put a path there
    out = pathlib.Path(dst)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)


if __name__ == "__main__":
    main(sys.argv)
