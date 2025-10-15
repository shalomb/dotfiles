"""
Test Normalization of parser_test_cases.yaml Structure

This module implements TDD/BDD tests to validate that all test cases
in parser_test_cases.yaml follow a consistent, normalized structure.

Following the TDD approach, these tests are written first and should FAIL initially,
then we implement the normalization to make them pass.
"""

from pathlib import Path

import pytest
import yaml


class TestNormalizedTestCasesStructure:
    """Test suite to validate normalized structure of all test cases."""

    @pytest.fixture
    def test_cases_data(self):
        """Load parser_test_cases.yaml for structural validation."""
        fixtures_dir = Path(__file__).parent / "fixtures"
        fixture_path = fixtures_dir / "parser_test_cases.yaml"

        with open(fixture_path) as f:
            return yaml.safe_load(f)

    def test_all_test_cases_have_required_fields(self, test_cases_data):
        """
        FAILING TEST: Verify every test case has all required fields.

        This test should FAIL initially because not all test cases
        have the complete normalized structure.
        """
        test_cases = test_cases_data.get("test_cases", [])
        required_fields = [
            "name",
            "description",
            "terraform_input",
            "expected_result",
            "harness_expected_result",  # This field is missing in many test cases
        ]

        missing_fields_by_case = {}

        for i, test_case in enumerate(test_cases):
            missing_fields = []
            for field in required_fields:
                if field not in test_case:
                    missing_fields.append(field)

            if missing_fields:
                case_name = test_case.get("name", f"test_case_{i}")
                missing_fields_by_case[case_name] = missing_fields

        # This assertion should FAIL initially
        assert not missing_fields_by_case, (
            f"Test cases missing required fields: {missing_fields_by_case}"
        )
