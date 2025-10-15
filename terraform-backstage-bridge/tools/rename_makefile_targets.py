#!/usr/bin/env python3
"""
Rename Makefile targets - TDD Green Phase Implementation

This script renames test-related Makefile targets from '*-test' pattern
to 'test-*' pattern for better consistency.

Following TDD approach, this script implements the functionality needed to pass the test.
"""

from pathlib import Path


def rename_makefile_targets():
    """
    Rename Makefile targets from '*-test' pattern to 'test-*' pattern.

    This is the main implementation for the TDD Green phase.
    """
    project_root = Path(__file__).parent.parent
    makefile_path = project_root / "Makefile"

    # Define the target renamings
    target_mappings = {
        "quick-test": "test-quick",
        "status-test": "test-status",
        "watch-test": "test-watch",
        "debug-test": "test-debug",
    }

    print("🔄 Starting Makefile target renaming process...")

    with open(makefile_path) as f:
        makefile_content = f.read()

    # Track changes made
    changes_made: list[str] = []

    # Rename target definitions and references
    for old_target, new_target in target_mappings.items():
        occurrences_before = makefile_content.count(old_target)

        if occurrences_before > 0:
            print(
                f"   Renaming '{old_target}' → '{new_target}' ({occurrences_before} occurrences)"
            )

            # Replace all occurrences
            makefile_content = makefile_content.replace(old_target, new_target)

            changes_made.append(
                f"{old_target} → {new_target} ({occurrences_before} occurrences)"
            )

    # Write back the updated Makefile
    with open(makefile_path, "w") as f:
        f.write(makefile_content)

    print("✅ Makefile target renaming completed successfully!")
    if changes_made:
        print("   Changes made:")
        for change in changes_made:
            print(f"     • {change}")
    else:
        print("   No changes were needed")

    return len(changes_made) > 0


def main():
    """Main renaming execution."""
    print("🎯 Renaming Makefile targets to follow 'test-*' convention...")
    success = rename_makefile_targets()
    if success:
        print("🎉 Target renaming completed successfully!")
        print("   Run tests to verify: uv run pytest tests/test_makefile_targets.py -v")
    else:
        print("ℹ️  No target renaming was needed")
    return 0


if __name__ == "__main__":
    exit(main())
