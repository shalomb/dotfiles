"""Utility functions for dotfile management."""

import os
from pathlib import Path
from typing import List, Optional


def resolve_paths(pattern: str, base_path: Optional[Path] = None) -> List[Path]:
    """Resolve file patterns to actual paths."""
    if base_path is None:
        base_path = Path.cwd()
    
    if pattern.startswith("/"):
        # Absolute path
        return [Path(pattern)]
    elif pattern.startswith("~/"):
        # Home directory path
        return [Path(pattern).expanduser()]
    else:
        # Relative to base path
        return list(base_path.glob(pattern))


def expand_path(path: str) -> Path:
    """Expand a path string to a Path object."""
    if path.startswith("~/"):
        return Path(path).expanduser()
    else:
        return Path(path)


def is_same_filesystem(path1: Path, path2: Path) -> bool:
    """Check if two paths are on the same filesystem."""
    try:
        stat1 = path1.stat()
        stat2 = path2.stat()
        return stat1.st_dev == stat2.st_dev
    except OSError:
        return False


def get_relative_path(path: Path, base: Path) -> Path:
    """Get relative path from base to path."""
    try:
        return path.relative_to(base)
    except ValueError:
        # Path is not under base, return the path as-is
        return path