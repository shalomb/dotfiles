"""Test helpers: real pandoc, cached on disk by input so the fast tier stays fast.

The cache key includes pandoc's version and flags, so a pandoc upgrade or a flag
change re-runs every conversion once. Delete tests/.cache to force it.
"""
import hashlib
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from build import PANDOC_ARGS as FLAGS  # noqa: E402  # pyright: ignore[reportMissingImports]
CACHE = pathlib.Path(__file__).resolve().parent / ".cache"
_version = None


def pandoc(md):
    global _version
    if _version is None:
        _version = subprocess.run(["pandoc", "--version"], capture_output=True, text=True).stdout.split("\n")[0]
    key = hashlib.sha256("\0".join([_version, *FLAGS, md]).encode()).hexdigest()[:20]
    hit = CACHE / f"{key}.html"
    if hit.is_file():
        return hit.read_text(encoding="utf-8")
    out = subprocess.run(["pandoc", *FLAGS], input=md, capture_output=True, text=True, check=True).stdout
    CACHE.mkdir(exist_ok=True)
    hit.write_text(out, encoding="utf-8")
    return out
