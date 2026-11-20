#!/usr/bin/env python3
"""Pick a document's brand from the folder its source lives in.

The brand decides two things: the stylesheet layered over the base theme, and
the library the document is filed in. It comes only from the path, so a
company theme never lands on a personal document, and company documents never
share a search page with anything else.

Config: $XDG_CONFIG_HOME/agent-skills/brands/config.yaml (outside every repo):

  default: personal            # brand for paths no brand claims
  brands:
    acme:
      css: acme.css            # relative to the config folder
      library: docs-acme       # folder under the agent-skills shadow root
      paths: [~/acme]          # folders this brand owns; most specific wins
    personal:
      library: docs            # no css: the base theme only

No config means no brand and the shared "docs" library.

Usage:
  brands.py resolve PATH       print the brand for PATH as JSON
"""
import json
import os
import pathlib
import re
import sys
from dataclasses import dataclass

LIBRARY_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")


class BrandError(Exception):
    pass


def config_dir(env=None):
    env = os.environ if env is None else env
    base = env.get("XDG_CONFIG_HOME") or str(pathlib.Path.home() / ".config")
    return pathlib.Path(base) / "agent-skills" / "brands"


@dataclass
class Brand:
    name: str
    library: str = "docs"
    css: pathlib.Path | None = None

    def css_text(self):
        if self.css is None:
            return ""
        if not self.css.is_file():
            raise BrandError(f"brand {self.name!r}: stylesheet not found: {self.css}")
        return self.css.read_text(encoding="utf-8")

    def as_dict(self):
        return {"name": self.name, "library": self.library,
                "css": str(self.css) if self.css else None}


def _real(p):
    return pathlib.Path(os.path.realpath(os.path.expanduser(str(p))))


def _load(folder):
    cfg = folder / "config.yaml"
    if not cfg.is_file():
        return None
    import yaml  # only needed when a config exists
    data = yaml.safe_load(cfg.read_text(encoding="utf-8")) or {}
    if not isinstance(data.get("brands", {}), dict):
        raise BrandError(f"{cfg}: 'brands' must be a mapping")
    return data


def _make(name, spec, folder):
    spec = spec or {}
    library = spec.get("library", "docs")
    if not LIBRARY_NAME.match(str(library)):
        raise BrandError(f"brand {name!r}: library must be a plain folder name, got {library!r}")
    css = spec.get("css")
    return Brand(name, library, (folder / css) if css else None)


def resolve(path, env=None):
    folder = config_dir(env)
    data = _load(folder)
    if data is None:
        return Brand("none")
    specs = data.get("brands") or {}
    for name, spec in specs.items():  # validate every brand, not only the match
        _make(name, spec, folder)
    target = _real(path)
    best, depth = None, -1
    for name, spec in specs.items():
        for p in (spec or {}).get("paths", []):
            root = _real(p)
            if (target == root or root in target.parents) and len(root.parts) > depth:
                best, depth = name, len(root.parts)
    name = best or data.get("default")
    if name is None:
        return Brand("none")
    if name not in specs:
        raise BrandError(f"default brand {name!r} is not defined")
    return _make(name, specs[name], folder)


def main(argv):
    if len(argv) != 3 or argv[1] != "resolve":
        sys.exit(__doc__)
    try:
        print(json.dumps(resolve(argv[2]).as_dict()))
    except BrandError as exc:
        sys.exit(f"error: {exc}")


if __name__ == "__main__":
    main(sys.argv)
