"""
Test for normalizing parser_test_cases.yaml structure - TDD approach.
This test should FAIL initially, then we implement to make it pass.
"""

from pathlib import Path

import yaml


def test_all_test_cases_have_harness_results():
    """
    FAILING TEST: All test cases should have harness_expected_result field.

    This test will FAIL initially because many test cases are missing
    the harness_expected_result field, which is exactly what we want to fix.
    """
    # Load the test cases file
    fixtures_dir = Path(__file__).parent / "fixtures"
    fixture_path = fixtures_dir / "parser_test_cases.yaml"

    with open(fixture_path) as f:
        data = yaml.safe_load(f)

    test_cases = data.get("test_cases", [])

    # Check each test case for required harness field
    missing_harness = []
    for test_case in test_cases:
        test_name = test_case.get("name", "unknown")
        if "harness_expected_result" not in test_case:
            missing_harness.append(test_name)

    # This assertion should FAIL initially - that's the TDD approach
    assert not missing_harness, (
        f"Test cases missing harness_expected_result: {missing_harness[:10]}... (showing first 10)"
    )
