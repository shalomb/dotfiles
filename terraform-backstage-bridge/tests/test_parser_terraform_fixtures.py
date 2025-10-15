"""
Consolidated Terraform Parser Fixture Test Suite

This file consolidates all parser-related fixture tests into one comprehensive suite:
- Basic type parsing tests
- Complex type parsing tests
- Real-world example tests
- YAML-based parametrized tests
- Coverage validation tests

Eliminates duplication from previous separate files:
- test_parser_fixture_based_parsing.py (removed)
- test_parser_fixtures_2.py (removed - was exact duplicate)
- test_parser_fixtures.py (consolidated into this file)

Note: test_formatter_harness_fixtures.py remains separate as it's domain-specific.
"""

import os
import tempfile
from pathlib import Path

import pytest
import yaml

from terraform_parser import TerraformVariablesParser

# Load unified test cases at module level
fixtures_dir = os.path.join(os.path.dirname(__file__), "fixtures")
unified_file = os.path.join(fixtures_dir, "parser_test_cases.yaml")

with open(unified_file) as f:
    test_data = yaml.safe_load(f)

    # Handle new reorganized structure with backwards compatibility
    if "test_cases" in test_data:
        # Old format
        test_cases = test_data["test_cases"]
    elif "legacy_test_cases" in test_data and "test_cases_by_section" in test_data:
        # New reorganized format - combine all test cases
        test_cases = test_data["legacy_test_cases"].copy()

        # Add all sectioned test cases
        for _section_name, section_cases in test_data["test_cases_by_section"].items():
            test_cases.extend(section_cases)
    else:
        raise ValueError("Unable to parse parser_test_cases.yaml - unknown format")


class TestTerraformParserFixtures:
    """Consolidated test suite for all Terraform parser fixture tests."""

    @pytest.fixture(scope="class")
    def fixtures_dir(self):
        """Return the terraform fixtures directory path."""
        return Path(__file__).parent / "fixtures"

    @pytest.fixture(scope="class")
    def expected_dir(self):
        """Return the expected results directory path."""
        return Path(__file__).parent / "fixtures"

    def load_expected_results(self, expected_file):
        """Load expected results from YAML file."""
        with open(expected_file) as f:
            return yaml.safe_load(f)

    def compare_variable(self, actual_var, expected_var):
        """Compare actual variable with expected results."""
        # Basic properties
        assert actual_var.name == expected_var["name"]
        assert actual_var.type.__class__.__name__ == expected_var["type_class"]
        assert actual_var.description == expected_var["description"]
        assert actual_var.default == expected_var["default"]
        assert actual_var.sensitive == expected_var["sensitive"]
        assert actual_var.nullable == expected_var["nullable"]
        assert len(actual_var.validation) == expected_var["validation_count"]

        # Type-specific properties
        if expected_var["type_class"] == "PrimitiveType":
            assert actual_var.type.type_name == expected_var["type_name"]
        elif expected_var["type_class"] == "ListType":
            assert (
                actual_var.type.element_type.__class__.__name__
                == expected_var["element_type_class"]
            )
            if expected_var["element_type_class"] == "PrimitiveType":
                assert (
                    actual_var.type.element_type.type_name
                    == expected_var["element_type_name"]
                )
        elif expected_var["type_class"] == "MapType":
            assert (
                actual_var.type.value_type.__class__.__name__
                == expected_var["value_type_class"]
            )
            if expected_var["value_type_class"] == "PrimitiveType":
                assert (
                    actual_var.type.value_type.type_name
                    == expected_var["value_type_name"]
                )
        elif expected_var["type_class"] == "SetType":
            if "element_type" in expected_var:
                element_type = expected_var["element_type"]
                assert (
                    actual_var.type.element_type.__class__.__name__
                    == element_type["type_class"]
                )
                if element_type["type_class"] == "PrimitiveType":
                    assert (
                        actual_var.type.element_type.type_name
                        == element_type["type_name"]
                    )

    # ================================================================================
    # YAML-Based Parametrized Tests (from test_parser_fixtures.py)
    # ================================================================================

    @pytest.mark.parametrize(
        "test_case", test_cases, ids=[tc["name"] for tc in test_cases]
    )
    def test_terraform_parsing(self, test_case):  # type: ignore
        """Test parsing Terraform content against expected results in side-by-side format."""
        # Write terraform content to a temporary file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".tf", delete=False
        ) as tf_file:
            tf_file.write(
                test_case["terraform_input"]
            )  # Use terraform_input, not terraform_content
            tf_file.flush()
            tf_path = tf_file.name

        try:
            # Parse the Terraform file
            parser = TerraformVariablesParser(tf_path)
            variables_dict = parser.parse()

            # Check that we get the expected number of variables
            expected_vars = test_case[
                "expected_result"
            ]  # Use expected_result, not expected_variables
            assert len(variables_dict) == len(expected_vars)

            # Validate each variable
            for var_name, expected in expected_vars.items():
                assert var_name in variables_dict
                actual_var = variables_dict[var_name]

                # Compare basic properties that should match
                assert actual_var.name == expected["name"]
                assert actual_var.description == expected["description"]
                assert actual_var.default == expected["default"]
                assert actual_var.sensitive == expected["sensitive"]
                assert actual_var.nullable == expected["nullable"]
                assert len(actual_var.validation) == len(expected["validations"])

                # Type comparison - the expected format has type as string representation
                expected_type_str = expected["type"]
                actual_type_str = repr(actual_var.type)
                assert actual_type_str == expected_type_str, (
                    f"Type mismatch for {var_name}: expected {expected_type_str}, got {actual_type_str}"
                )

        finally:
            # Clean up temp file
            os.unlink(tf_path)

    # ================================================================================
    # Reorganized Fixture Tests
    # ================================================================================
    # These tests validate the new reorganized parser_test_cases.yaml structure
    # ================================================================================

    def test_reorganized_structure_loads_correctly(self):
        """Test that the reorganized test cases file loads correctly."""
        with open(unified_file) as f:
            data = yaml.safe_load(f)

        # Should have the main sections we expect
        assert "test_cases" in data

        # harness_formatter_test_cases was archived after successful merger
        archived_harness_file = os.path.join(
            fixtures_dir, "harness_formatter_test_cases.yaml.archived"
        )
        assert os.path.exists(archived_harness_file), (
            "harness_formatter_test_cases.yaml.archived should exist after successful merger"
        )

        # Get counts from main file
        main_test_count = len(data["test_cases"])

        # Should have a reasonable number of test cases
        assert main_test_count >= 45, (
            f"Expected at least 45 main test cases, got {main_test_count}"
        )

        print(f"✅ Successfully loaded {main_test_count} main test cases")
        print("   - harness formatter test cases are now in separate file")

    def test_basic_types_coverage_in_reorganized_cases(self):
        """Test that basic types are covered in reorganized test cases."""
        with open(unified_file) as f:
            data = yaml.safe_load(f)

        # Get all test cases from main test_cases section
        test_cases = data.get("test_cases", [])

        # Check that we have test cases for basic types
        basic_types = {"string", "number", "bool"}
        found_types = set()

        for test_case in test_cases:
            terraform_input = test_case["terraform_input"]
            for basic_type in basic_types:
                if (
                    f"type        = {basic_type}" in terraform_input
                    or f"type = {basic_type}" in terraform_input
                ):
                    found_types.add(basic_type)

        missing_types = basic_types - found_types
        assert not missing_types, f"Missing basic types in test cases: {missing_types}"

    def test_collection_types_coverage_in_reorganized_cases(self):
        """Test that collection types are covered in reorganized test cases."""
        with open(unified_file) as f:
            data = yaml.safe_load(f)

        # Get all test cases from main test_cases section
        test_cases = data.get("test_cases", [])

        # Check that we have test cases for collection types
        collection_patterns = ["list(", "map(", "set("]
        found_collections = set()

        for test_case in test_cases:
            terraform_input = test_case["terraform_input"]
            for pattern in collection_patterns:
                if pattern in terraform_input:
                    found_collections.add(pattern.rstrip("("))

        expected_collections = {"list", "map", "set"}
        missing_collections = expected_collections - found_collections
        assert not missing_collections, (
            f"Missing collection types in test cases: {missing_collections}"
        )

    def test_validation_coverage_in_reorganized_cases(self):
        """Test that validation rules are covered in reorganized test cases."""
        with open(unified_file) as f:
            data = yaml.safe_load(f)

        # Get all test cases from main test_cases section
        test_cases = data.get("test_cases", [])

        # Check for validation blocks
        validation_cases = [
            test_case
            for test_case in test_cases
            if "validation" in test_case["terraform_input"]
        ]

        assert len(validation_cases) >= 4, (
            f"Expected at least 4 test cases with validation, got {len(validation_cases)}"
        )

    def test_sectioned_cases_structure(self):
        """Test that sectioned test cases have proper structure."""
        with open(unified_file) as f:
            data = yaml.safe_load(f)

        # Current reorganized structure has test_cases in main file
        # and harness_formatter_test_cases in separate file
        test_cases = data.get("test_cases", [])

        # Check that we have sufficient test coverage
        assert len(test_cases) >= 40, (
            f"Expected at least 40 main test cases, got {len(test_cases)}"
        )

        # Verify harness formatter test cases were archived after successful merger
        archived_harness_file = os.path.join(
            fixtures_dir, "harness_formatter_test_cases.yaml.archived"
        )
        with open(archived_harness_file) as f:
            archived_content = f.read()
            # Extract YAML content (skip archive header)
            yaml_start = archived_content.find("harness_formatter_test_cases:")
            if yaml_start == -1:
                yaml_start = archived_content.find("test_cases:")
            yaml_content = archived_content[yaml_start:]
            harness_data = yaml.safe_load(yaml_content)
            harness_cases = harness_data.get("harness_formatter_test_cases", [])
            assert len(harness_cases) >= 3, (
                f"Expected at least 3 archived harness test cases, got {len(harness_cases)}"
            )

    # Validation Tests
    # ================================================================================

    def test_total_test_case_count(self):
        """Test that we have the expected total number of test cases after fixture merger."""
        with open(unified_file) as f:
            data = yaml.safe_load(f)

        test_cases = data.get("test_cases", [])

        # Get harness test cases from archived file
        archived_harness_file = os.path.join(
            fixtures_dir, "harness_formatter_test_cases.yaml.archived"
        )
        with open(archived_harness_file) as f:
            archived_content = f.read()
            # Extract YAML content (skip archive header)
            yaml_start = archived_content.find("harness_formatter_test_cases:")
            if yaml_start == -1:
                yaml_start = archived_content.find("test_cases:")
            yaml_content = archived_content[yaml_start:]
            harness_data = yaml.safe_load(yaml_content)
            harness_cases = harness_data.get("harness_formatter_test_cases", [])

        total_cases = len(test_cases) + len(harness_cases)
        assert total_cases >= 48, (
            f"Expected at least 48 total test cases after fixture merger, got {total_cases}"
        )

        # Check we have a reasonable distribution
        assert len(test_cases) >= 40, (
            f"Expected at least 40 main test cases, got {len(test_cases)}"
        )
        assert len(harness_cases) >= 3, (
            f"Expected at least 3 archived harness test cases, got {len(harness_cases)}"
            f"Expected at least 3 harness test cases, got {len(harness_cases)}"
        )
