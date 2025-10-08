#!/usr/bin/env python3
"""
Cursor Agent Bash Initialization Patch

This script applies a robust patch to fix bash initialization issues in cursor-agent.
The patch adds a `G8n+` prefix to ensure proper bash initialization before
running commands, fixing potential shell state issues.

Usage: python patch.py [apply|status|restore]
"""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Optional, Tuple


class Colors:
    """ANSI color codes for terminal output."""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color


def print_status(color: str, message: str) -> None:
    """Print colored status message."""
    print(f"{color}{message}{Colors.NC}")


def find_cursor_agent_installations() -> List[Path]:
    """Find all cursor-agent installations."""
    search_paths = [
        Path.home() / ".local/share/cursor-agent",
        Path("/opt/cursor-agent"),
        Path("/usr/local/share/cursor-agent"),
        Path("/usr/share/cursor-agent"),
    ]

    installations = []
    for base_path in search_paths:
        if base_path.exists() and (base_path / "versions").exists():
            for version_dir in (base_path / "versions").iterdir():
                if version_dir.is_dir() and (version_dir / "index.js").exists():
                    installations.append(version_dir)

    return installations


def find_bash_initialization_pattern(content: str) -> Optional[Tuple[str, int, int]]:
    """
    Find the specific bash initialization pattern that needs patching.

    Returns:
        Tuple of (matched_text, start_pos, end_pos) or None if not found
    """
    # Look for the specific bash initialization pattern with eval issues
    # The problem is that eval "$1" causes issues when $1 starts with -
    pattern = r'let s=\["-O","extglob","-c",`snap=\$\(command cat <&3\) && builtin shopt -s extglob && builtin eval "\$snap" && \{ builtin export PWD="\$\(builtin pwd\)"; \$\{c\}; \}; COMMAND_EXIT_CODE=\$\?; dump_bash_state >&4; builtin exit \$COMMAND_EXIT_CODE`'
    
    match = re.search(pattern, content)
    if match:
        return match.group(0), match.start(), match.end()
    
    return None


def find_eval_dollar_one_pattern(content: str) -> Optional[Tuple[str, int, int]]:
    """
    Find the 'builtin eval "$1"' pattern that needs patching.

    Returns:
        Tuple of (matched_text, start_pos, end_pos) or None if not found
    """
    # Look for the eval "$1" pattern that causes issues when $1 starts with -
    pattern = r"c='builtin eval \"\$1\"'"
    
    match = re.search(pattern, content)
    if match:
        return match.group(0), match.start(), match.end()
    
    return None


def apply_patch_to_file(file_path: Path) -> bool:
    """Apply patch to a single index.js file."""
    print_status(Colors.BLUE, f"Processing: {file_path}")

    # Read the file
    try:
        with open(file_path, encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print_status(Colors.RED, f"  ✗ Failed to read file: {e}")
        return False

    # Check if patch is already applied
    # Check that eval "$snap" doesn't have -- (we removed it)
    # Check that eval "$1" has -- (we added it)
    snap_fixed = 'builtin eval "$snap"' in content and 'builtin eval -- "$snap"' not in content
    dollar_one_fixed = 'builtin eval -- "$1"' in content and 'builtin eval "$1"' not in content
    
    if snap_fixed and dollar_one_fixed:
        print_status(Colors.GREEN, "  ✓ Patch already applied")
        return True

    # Find patterns to patch
    bash_pattern = find_bash_initialization_pattern(content)
    eval_pattern = find_eval_dollar_one_pattern(content)
    
    if not bash_pattern and not eval_pattern:
        print_status(Colors.RED, "  ✗ No patterns found to patch")
        return False

    # Create backup
    backup_path = file_path.with_suffix('.original')
    if not backup_path.exists():
        print_status(Colors.YELLOW, f"  Creating backup: {backup_path.name}")
        shutil.copy2(file_path, backup_path)
    else:
        print_status(Colors.BLUE, f"  Backup already exists: {backup_path.name}")

    # Apply the patches
    print_status(Colors.YELLOW, "  Applying patch...")
    new_content = content

    # Fix the bash initialization pattern (remove -- from eval -- "$snap")
    if bash_pattern:
        matched_text, start_pos, end_pos = bash_pattern
        patched_text = matched_text.replace('builtin eval -- "$snap"', 'builtin eval "$snap"')
        new_content = new_content[:start_pos] + patched_text + new_content[end_pos:]

    # Fix the eval "$1" pattern (add -- to eval "$1")
    if eval_pattern:
        matched_text, start_pos, end_pos = eval_pattern
        patched_text = matched_text.replace('builtin eval "$1"', 'builtin eval -- "$1"')
        new_content = new_content[:start_pos] + patched_text + new_content[end_pos:]

    # Write the patched content
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        # Verify patch was applied
        snap_fixed = 'builtin eval "$snap"' in new_content and 'builtin eval -- "$snap"' not in new_content
        dollar_one_fixed = 'builtin eval -- "$1"' in new_content and 'builtin eval "$1"' not in new_content
        
        if snap_fixed and dollar_one_fixed:
            print_status(Colors.GREEN, "  ✓ Patch applied successfully")
            return True
        else:
            print_status(Colors.RED, "  ✗ Patch verification failed")
            return False

    except Exception as e:
        print_status(Colors.RED, f"  ✗ Failed to write patched file: {e}")
        return False


def restore_from_backup(file_path: Path) -> bool:
    """Restore file from backup."""
    print_status(Colors.BLUE, f"Processing: {file_path}")

    backup_path = file_path.with_suffix('.original')
    if not backup_path.exists():
        print_status(Colors.RED, "  ✗ No backup found to restore from")
        return False

    try:
        shutil.copy2(backup_path, file_path)
        print_status(Colors.GREEN, "  ✓ Restored from backup")
        return True
    except Exception as e:
        print_status(Colors.RED, f"  ✗ Failed to restore from backup: {e}")
        return False


def check_patch_status(file_path: Path) -> bool:
    """Check if patch is applied to a file."""
    print_status(Colors.BLUE, f"Checking: {file_path}")

    try:
        with open(file_path, encoding='utf-8') as f:
            content = f.read()

        snap_fixed = 'builtin eval "$snap"' in content and 'builtin eval -- "$snap"' not in content
        dollar_one_fixed = 'builtin eval -- "$1"' in content and 'builtin eval "$1"' not in content
        
        if snap_fixed and dollar_one_fixed:
            print_status(Colors.GREEN, "  ✓ Patch is applied")
            return True
        else:
            print_status(Colors.YELLOW, "  ✗ Patch is not applied")
            return False
    except Exception as e:
        print_status(Colors.RED, f"  ✗ Failed to read file: {e}")
        return False


def run_basic_tests(installation_dir: Path) -> bool:
    """Run basic tests on the patched installation."""
    print_status(Colors.BLUE, f"Running basic tests for: {installation_dir}")

    try:
        # Test 1: Check if cursor-agent runs without immediate errors
        print_status(Colors.YELLOW, "  Test 1: Basic startup test")
        result = subprocess.run(
            ["./cursor-agent", "--help"],
            cwd=installation_dir,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print_status(Colors.GREEN, "    ✓ Startup test passed")
        else:
            print_status(Colors.RED, "    ✗ Startup test failed")
            return False

        # Test 2: Test shell command execution
        print_status(Colors.YELLOW, "  Test 2: Shell command test")
        result = subprocess.run(
            ["./cursor-agent", "-p", "--force", "run echo test"],
            cwd=installation_dir,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print_status(Colors.GREEN, "    ✓ Shell command test passed")
        else:
            print_status(Colors.RED, "    ✗ Shell command test failed")
            return False

        return True
    except subprocess.TimeoutExpired:
        print_status(Colors.RED, "    ✗ Test timed out")
        return False
    except Exception as e:
        print_status(Colors.RED, f"    ✗ Test failed: {e}")
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Cursor Agent Bash Initialization Patch")
    parser.add_argument("action", nargs="?", default="apply",
                       choices=["apply", "status", "restore"],
                       help="Action to perform (default: apply)")
    args = parser.parse_args()

    print_status(Colors.YELLOW, "Cursor Agent Bash Initialization Patch")
    print_status(Colors.YELLOW, "=======================================")

    # Find cursor-agent installations
    installations = find_cursor_agent_installations()

    if not installations:
        print_status(Colors.RED, "Error: Could not find any cursor-agent installations")
        print_status(Colors.YELLOW, "Searched in:")
        print("  - ~/.local/share/cursor-agent")
        print("  - /opt/cursor-agent")
        print("  - /usr/local/share/cursor-agent")
        print("  - /usr/share/cursor-agent")
        sys.exit(1)

    print_status(Colors.GREEN, f"Found {len(installations)} cursor-agent installation(s)")

    success_count = 0
    total_count = len(installations)

    for installation in installations:
        index_js = installation / "index.js"

        if args.action == "apply":
            if apply_patch_to_file(index_js):
                success_count += 1
        elif args.action == "restore":
            if restore_from_backup(index_js):
                success_count += 1
        elif args.action == "status":
            if check_patch_status(index_js):
                success_count += 1

    # Summary
    if args.action == "apply":
        if success_count == total_count:
            print_status(Colors.GREEN, "✓ All patches applied successfully!")

            # Run tests on the first installation
            if installations:
                print()
                run_basic_tests(installations[0])
        else:
            print_status(Colors.RED, f"✗ Some patches failed ({success_count}/{total_count} successful)")
            sys.exit(1)
    elif args.action == "restore":
        if success_count == total_count:
            print_status(Colors.GREEN, "✓ All installations restored successfully!")
        else:
            print_status(Colors.RED, f"✗ Some restores failed ({success_count}/{total_count} successful)")
            sys.exit(1)
    elif args.action == "status":
        print()
        print_status(Colors.BLUE, f"Summary: {success_count}/{total_count} installations have the patch applied")


if __name__ == "__main__":
    main()
