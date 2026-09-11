#!/usr/bin/env python3
"""
Cursor Agent / `agent` CLI bash-state harness patch.

Fixes noisy failures on every Shell tool call:
  - `--: line 21: eval: - : invalid option`
  - `--: line 1: dump_bash_state: command not found`

Root cause (2026.09.x harness):
  1. Snap restore uses `eval "$cursor_snap_*"` without `--`, so values
     starting with `-` trip bash's eval option parser.
  2. Command wrapper always calls `dump_bash_state` even when snap restore
     failed to define it (often because of #1).

Targets: ~/.local/share/cursor-agent/versions/*/index.js
(`agent` and `cursor-agent` both resolve into that tree).

Usage: python patch.py [apply|status|restore]
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List


class Colors:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    BLUE = "\033[0;34m"
    NC = "\033[0m"


def print_status(color: str, message: str) -> None:
    print(f"{color}{message}{Colors.NC}")


# (description, old, new) — applied in order; idempotent if new already present.
REPLACEMENTS: list[tuple[str, str, str]] = [
    (
        "guard FD4 dump_bash_state call",
        ':"dump_bash_state >&4"}',
        ':"builtin type dump_bash_state &>/dev/null && dump_bash_state >&4 || true"}',
    ),
    (
        "guard file-transport dump_bash_state call",
        'dump_bash_state > "$CURSOR_STATE_OUTPUT_FILE"',
        'builtin type dump_bash_state &>/dev/null && dump_bash_state > "$CURSOR_STATE_OUTPUT_FILE" || true',
    ),
    (
        "eval -- for user command ($1)",
        "let A='builtin eval \"$1\"'",
        "let A='builtin eval -- \"$1\"'",
    ),
    (
        "eval -- for cursor_snap restore blobs",
        'builtin printf \'eval "$cursor_snap_%s"\\n\' "$var_name"',
        'builtin printf \'builtin eval -- "$cursor_snap_%s"\\n\' "$var_name"',
    ),
    (
        "eval -- for cursor_snap restore blobs (escaped template)",
        "builtin printf \\'eval \"$cursor_snap_%s\"\\n\\' \"$var_name\"",
        "builtin printf \\'builtin eval -- \"$cursor_snap_%s\"\\n\\' \"$var_name\"",
    ),
]


def find_cursor_agent_installations() -> List[Path]:
    search_paths = [
        Path.home() / ".local/share/cursor-agent",
        Path("/opt/cursor-agent"),
        Path("/usr/local/share/cursor-agent"),
        Path("/usr/share/cursor-agent"),
    ]

    installations: List[Path] = []
    for base_path in search_paths:
        versions = base_path / "versions"
        if not versions.is_dir():
            continue
        for version_dir in sorted(versions.iterdir()):
            if version_dir.is_dir() and (version_dir / "index.js").exists():
                installations.append(version_dir)
    return installations


def patch_markers_present(content: str) -> bool:
    """True when all new-side markers are present (fully patched)."""
    return all(new in content for _, _, new in REPLACEMENTS)


def patch_markers_partial(content: str) -> list[str]:
    """Return descriptions of replacements not yet applied."""
    missing = []
    for desc, _old, new in REPLACEMENTS:
        if new not in content:
            missing.append(desc)
    return missing


def apply_patch_to_file(file_path: Path) -> bool:
    print_status(Colors.BLUE, f"Processing: {file_path}")

    try:
        content = file_path.read_text(encoding="utf-8")
    except OSError as e:
        print_status(Colors.RED, f"  ✗ Failed to read file: {e}")
        return False

    if patch_markers_present(content):
        print_status(Colors.GREEN, "  ✓ Patch already applied")
        return True

    missing_before = patch_markers_partial(content)
    if not any(old in content for _, old, new in REPLACEMENTS if new not in content):
        print_status(Colors.RED, "  ✗ No known patterns found — agent build may have changed")
        for desc in missing_before:
            print_status(Colors.YELLOW, f"    missing: {desc}")
        return False

    backup_path = file_path.with_suffix(".original")
    if not backup_path.exists():
        print_status(Colors.YELLOW, f"  Creating backup: {backup_path.name}")
        shutil.copy2(file_path, backup_path)
    else:
        print_status(Colors.BLUE, f"  Backup already exists: {backup_path.name}")

    new_content = content
    applied = 0
    for desc, old, new in REPLACEMENTS:
        if new in new_content:
            print_status(Colors.GREEN, f"  · already: {desc}")
            continue
        count = new_content.count(old)
        if count == 0:
            print_status(Colors.YELLOW, f"  · skip (pattern gone): {desc}")
            continue
        new_content = new_content.replace(old, new)
        applied += count
        print_status(Colors.YELLOW, f"  · applied x{count}: {desc}")

    try:
        file_path.write_text(new_content, encoding="utf-8")
    except OSError as e:
        print_status(Colors.RED, f"  ✗ Failed to write patched file: {e}")
        return False

    if patch_markers_present(new_content):
        print_status(Colors.GREEN, f"  ✓ Patch applied successfully ({applied} replacements)")
        return True

    still_missing = patch_markers_partial(new_content)
    print_status(Colors.YELLOW, f"  ~ Partial patch ({applied} replacements); still missing:")
    for desc in still_missing:
        print_status(Colors.YELLOW, f"    - {desc}")
    # Partial is still useful (esp. dump_bash_state guard).
    return applied > 0


def restore_from_backup(file_path: Path) -> bool:
    print_status(Colors.BLUE, f"Processing: {file_path}")
    backup_path = file_path.with_suffix(".original")
    if not backup_path.exists():
        print_status(Colors.RED, "  ✗ No backup found to restore from")
        return False
    try:
        shutil.copy2(backup_path, file_path)
        print_status(Colors.GREEN, "  ✓ Restored from backup")
        return True
    except OSError as e:
        print_status(Colors.RED, f"  ✗ Failed to restore: {e}")
        return False


def check_patch_status(file_path: Path) -> bool:
    print_status(Colors.BLUE, f"Checking: {file_path}")
    try:
        content = file_path.read_text(encoding="utf-8")
    except OSError as e:
        print_status(Colors.RED, f"  ✗ Failed to read file: {e}")
        return False

    if patch_markers_present(content):
        print_status(Colors.GREEN, "  ✓ Patch is applied")
        return True

    missing = patch_markers_partial(content)
    print_status(Colors.YELLOW, f"  ✗ Patch incomplete ({len(missing)} missing)")
    for desc in missing:
        print_status(Colors.YELLOW, f"    - {desc}")
    return False


def run_basic_tests(installation_dir: Path) -> bool:
    print_status(Colors.BLUE, f"Running basic tests for: {installation_dir}")
    agent_bin = installation_dir / "cursor-agent"
    if not agent_bin.exists():
        print_status(Colors.YELLOW, "  · no cursor-agent binary; skipping startup test")
        return True
    try:
        result = subprocess.run(
            [str(agent_bin), "--help"],
            cwd=installation_dir,
            capture_output=True,
            text=True,
            timeout=8,
        )
        if result.returncode == 0:
            print_status(Colors.GREEN, "  ✓ Startup test passed")
            return True
        print_status(Colors.RED, "  ✗ Startup test failed")
        return False
    except subprocess.TimeoutExpired:
        print_status(Colors.RED, "  ✗ Startup test timed out")
        return False
    except OSError as e:
        print_status(Colors.RED, f"  ✗ Startup test failed: {e}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Cursor Agent bash-state harness patch")
    parser.add_argument(
        "action",
        nargs="?",
        default="apply",
        choices=["apply", "status", "restore"],
        help="Action to perform (default: apply)",
    )
    args = parser.parse_args()

    print_status(Colors.YELLOW, "Cursor Agent Bash-State Harness Patch")
    print_status(Colors.YELLOW, "=====================================")

    installations = find_cursor_agent_installations()
    if not installations:
        print_status(Colors.RED, "Error: Could not find any cursor-agent installations")
        print_status(Colors.YELLOW, "Searched under ~/.local/share/cursor-agent and system prefixes")
        sys.exit(1)

    print_status(Colors.GREEN, f"Found {len(installations)} installation(s)")

    success_count = 0
    for installation in installations:
        index_js = installation / "index.js"
        if args.action == "apply":
            ok = apply_patch_to_file(index_js)
        elif args.action == "restore":
            ok = restore_from_backup(index_js)
        else:
            ok = check_patch_status(index_js)
        if ok:
            success_count += 1

    total = len(installations)
    if args.action == "apply":
        if success_count == total:
            print_status(Colors.GREEN, "✓ All patches applied successfully!")
            print_status(
                Colors.YELLOW,
                "Restart `agent` / cursor-agent for the patch to take effect "
                "(Node already has index.js loaded in memory).",
            )
            print()
            run_basic_tests(installations[-1])
        else:
            print_status(Colors.RED, f"✗ Some patches failed ({success_count}/{total} successful)")
            sys.exit(1)
    elif args.action == "restore":
        if success_count == total:
            print_status(Colors.GREEN, "✓ All installations restored successfully!")
        else:
            print_status(Colors.RED, f"✗ Some restores failed ({success_count}/{total} successful)")
            sys.exit(1)
    else:
        print()
        print_status(Colors.BLUE, f"Summary: {success_count}/{total} installations fully patched")


if __name__ == "__main__":
    main()
