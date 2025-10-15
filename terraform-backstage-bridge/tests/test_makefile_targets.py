#!/usr/bin/env python3
"""
Test Makefile target naming conventions - TDD Red Phase Implementation

This test suite validates that Makefile targets follow the correct naming pattern:
test-* instead of *-test for test-related targets.

Following TDD approach, this test should FAIL initially until the Makefile is updated.
"""

import re
from pathlib import Path


class TestMakefileTargets:
    """Test Makefile target naming conventions."""

    def test_test_targets_follow_naming_convention(self):
        """
        FAILING TEST: Verify test-related targets use 'test-*' pattern.

        This test should FAIL initially because current targets use '*-test' pattern.
        After implementation, targets should follow 'test-*' naming convention.
        """
        project_root = Path(__file__).parent.parent
        makefile_path = project_root / "Makefile"

        with open(makefile_path) as f:
            makefile_content = f.read()

        # Find all target definitions (lines that match: target: ## description)
        target_pattern = r"^([a-zA-Z0-9_-]+):\s*##.*$"
        targets: list[str] = []

        for line in makefile_content.split("\n"):
            match = re.match(target_pattern, line)
            if match:
                targets.append(match.group(1))

        # Find test-related targets that don't follow the convention
        incorrect_targets: list[str] = []
        correct_test_targets: list[str] = []

        for target in targets:
            if "test" in target:
                if target.endswith("-test"):
                    # This is the old pattern we want to fix
                    incorrect_targets.append(target)
                elif target.startswith("test-"):
                    # This is the correct pattern
                    correct_test_targets.append(target)

        # This assertion should FAIL initially - that's the TDD approach
        assert len(incorrect_targets) == 0, (
            f"Found {len(incorrect_targets)} targets using old '*-test' pattern: {incorrect_targets}. "
            f"They should be renamed to use 'test-*' pattern. "
            f"Current correct targets: {correct_test_targets}"
        )

        # Verify we have test targets using the correct pattern
        expected_test_targets = [
            "test",
            "test-verbose",
            "test-unit",
            "test-integration",
            "test-all",
            "test-coverage",
            "test-types",
        ]

        found_correct_targets = [t for t in expected_test_targets if t in targets]
        assert len(found_correct_targets) >= 5, (
            f"Expected at least 5 targets following 'test-*' pattern, "
            f"found {len(found_correct_targets)}: {found_correct_targets}"
        )

        print(
            f"✅ TARGET VALIDATION: Found {len(correct_test_targets)} correct 'test-*' targets, "
            f"{len(incorrect_targets)} incorrect '*-test' targets to fix"
        )

    def test_makefile_target_consistency_after_rename(self):
        """
        FAILING TEST: Verify all test-related targets follow consistent naming.

        This test ensures that after renaming, we don't have any leftover
        references to old target names in dependencies or documentation.
        """
        project_root = Path(__file__).parent.parent
        makefile_path = project_root / "Makefile"

        with open(makefile_path) as f:
            makefile_content = f.read()

        # Check for any remaining references to old-style target names
        old_style_references: list[str] = []
        old_patterns = ["quick-test", "status-test", "watch-test", "debug-test"]

        for pattern in old_patterns:
            if pattern in makefile_content:
                # Count occurrences (should only be in the target definition line after rename)
                occurrences = makefile_content.count(pattern)
                if occurrences > 1:  # More than just the target definition
                    old_style_references.append(
                        f"{pattern} ({occurrences} occurrences)"
                    )

        # This should pass after proper renaming
        assert len(old_style_references) == 0, (
            f"Found references to old-style target names that need updating: {old_style_references}"
        )

        print(
            "✅ CONSISTENCY CHECK: No old-style target references found in dependencies"
        )
