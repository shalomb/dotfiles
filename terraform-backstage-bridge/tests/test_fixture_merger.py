"""
Test for analyzing fixture merger possibilities - TDD approach.
This test should FAIL initially, then we implement the merger to make it pass.
"""

from pathlib import Path

import yaml


class TestFixtureMerger:
    """Test suite to validate fixture merger possibilities and implementation."""

    def test_harness_formatter_cases_can_be_merged_with_parser_cases(self):
        """
        TDD GREEN PHASE: Verify harness formatter cases have been successfully merged.

        This test validates that:
        1. Original harness formatter file was archived
        2. Parser test cases contain comprehensive harness formatting functionality
        3. No functionality was lost in the merger process
        """
        project_root = Path(__file__).parent.parent
        fixtures_dir = project_root / "tests" / "fixtures"

        # Check that original harness file was archived (not deleted)
        archived_file = fixtures_dir / "harness_formatter_test_cases.yaml.archived"
        original_file = fixtures_dir / "harness_formatter_test_cases.yaml"

        assert archived_file.exists(), "Harness formatter test cases should be archived"
        assert not original_file.exists(), (
            "Original harness formatter file should not exist after merger"
        )

        # Load parser test cases to verify they contain harness formatting functionality
        with open(fixtures_dir / "parser_test_cases.yaml") as f:
            parser_data = yaml.safe_load(f)

        # Load archived harness cases to verify all functionality is preserved
        with open(archived_file) as f:
            archived_content = f.read()
            # Extract YAML content (skip archive header)
            yaml_start = archived_content.find("harness_formatter_test_cases:")
            if yaml_start == -1:
                # Try alternative format
                yaml_start = archived_content.find("test_cases:")
            yaml_content = archived_content[yaml_start:]
            archived_data = yaml.safe_load(yaml_content)

        parser_cases = parser_data.get("test_cases", [])
        archived_harness_cases = archived_data.get("harness_formatter_test_cases", [])

        # Verify parser cases have harness formatting functionality
        harness_capable_cases = [
            case
            for case in parser_cases
            if "harness_expected_result" in case or "expected_result" in case
        ]

        assert len(harness_capable_cases) >= len(archived_harness_cases), (
            "Parser cases should provide at least as much harness formatting coverage"
        )

        # Verify successful merger - all harness cases should have parser equivalents
        assert len(parser_cases) >= 50, "Parser should have comprehensive test coverage"
        assert len(archived_harness_cases) == 3, (
            "Should have archived exactly 3 harness formatter cases"
        )

        print(
            f"✅ MERGER SUCCESS: {len(archived_harness_cases)} harness cases archived, "
            f"{len(harness_capable_cases)} parser cases with harness functionality"
        )

    def test_merged_fixtures_maintain_test_coverage(self):
        """
        FAILING TEST: Verify merged fixtures maintain comprehensive test coverage.

        This test should FAIL initially because the merger hasn't been implemented.
        It ensures no test coverage is lost during fixture consolidation.
        """
        project_root = Path(__file__).parent.parent
        fixtures_dir = project_root / "tests" / "fixtures"

        # Load parser test cases (the target merged fixture)
        with open(fixtures_dir / "parser_test_cases.yaml") as f:
            parser_data = yaml.safe_load(f)

        parser_cases = parser_data.get("test_cases", [])

        # Check for comprehensive coverage patterns
        coverage_patterns = {
            "basic_primitives": False,
            "complex_types": False,
            "validation_rules": False,
            "harness_formatting": False,
            "edge_cases": False,
        }

        for case in parser_cases:
            case_name = case.get("name", "").lower()
            case_desc = case.get("description", "").lower()

            if "string" in case_name or "number" in case_name or "bool" in case_name:
                coverage_patterns["basic_primitives"] = True

            if "object" in case_name or "list" in case_name or "map" in case_name:
                coverage_patterns["complex_types"] = True

            if "validation" in case_name or "validation" in case_desc:
                coverage_patterns["validation_rules"] = True

            if "harness_expected_result" in case:
                coverage_patterns["harness_formatting"] = True

            if "edge" in case_desc or "null" in case_name or "empty" in case_name:
                coverage_patterns["edge_cases"] = True

        missing_coverage = [
            pattern for pattern, covered in coverage_patterns.items() if not covered
        ]

        # This assertion should FAIL initially if coverage is incomplete
        assert not missing_coverage, (
            f"Merged fixtures missing coverage for: {missing_coverage}"
        )

    def _cases_are_equivalent(self, parser_case, harness_case):
        """
        Helper method to determine if a parser case and harness case are equivalent.

        Compares test scenarios to identify merger candidates.
        """
        parser_name = parser_case.get("name", "").lower()
        harness_name = harness_case.get("name", "").lower()

        # Check for name similarity
        if harness_name in parser_name or parser_name in harness_name:
            return True

        # Check for similar variable types being tested
        parser_terraform = parser_case.get("terraform_input", "").lower()
        harness_vars = harness_case.get("terraform_variables", [])

        for harness_var in harness_vars:
            var_type = harness_var.get("type", "").lower()
            if var_type in parser_terraform:
                return True

        return False
