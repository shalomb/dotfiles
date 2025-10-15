#!/usr/bin/env python3
"""
Normalize parser_test_cases.yaml structure - TDD Green Phase Implementation

This script adds missing harness_expected_result fields to test cases that don't have them.
It's designed to make the failing TDD test pass by ensuring all test cases have consistent structure.

Following TDD approach, this script implements the minimal functionality needed to pass the test.
"""

from pathlib import Path
from typing import Any

import yaml


def convert_expected_to_harness(expected_result: dict[str, Any]) -> dict[str, Any]:
    """
    Convert expected_result format to harness_expected_result format.

    Transforms from parser format (with type objects) to simplified harness format.

    Args:
        expected_result: Parser output format with type objects

    Returns:
        Simplified harness format with basic types
    """
    harness_result = {}

    for var_name, var_data in expected_result.items():
        if not isinstance(var_data, dict):
            continue

        harness_var = {
            "title": var_data.get("description", var_name.replace("_", " ").title()),
            "description": var_data.get("description", f"Configuration for {var_name}"),
        }

        # Extract the type - handle both string and object representations
        var_type = var_data.get("type")
        if var_type:
            # Convert type object string representations to simple types
            if isinstance(var_type, str):
                if "PrimitiveType('string')" in var_type:
                    harness_var["type"] = "string"
                elif "PrimitiveType('number')" in var_type:
                    harness_var["type"] = "number"
                elif "PrimitiveType('bool')" in var_type:
                    harness_var["type"] = "boolean"
                elif "ListType(" in var_type:
                    harness_var["type"] = "array"
                elif "MapType(" in var_type:
                    harness_var["type"] = "object"
                elif "ObjectType(" in var_type:
                    harness_var["type"] = "object"
                elif "SetType(" in var_type:
                    harness_var["type"] = "array"
                elif "OptionalType(" in var_type:
                    # For optional types, extract the inner type more carefully
                    if "ListType(" in var_type:
                        harness_var["type"] = "array"
                    elif "MapType(" in var_type:
                        harness_var["type"] = "object"
                    elif "ObjectType(" in var_type:
                        harness_var["type"] = "object"
                    elif "SetType(" in var_type:
                        harness_var["type"] = "array"
                    elif "'string'" in var_type:
                        harness_var["type"] = "string"
                    elif "'number'" in var_type:
                        harness_var["type"] = "number"
                    elif "'bool'" in var_type:
                        harness_var["type"] = "boolean"
                    else:
                        harness_var["type"] = "string"  # Default fallback
                else:
                    harness_var["type"] = "string"  # Default fallback
            else:
                harness_var["type"] = "string"  # Default fallback
        else:
            harness_var["type"] = "string"  # Default fallback

        # Add default value if present and not null
        default_value = var_data.get("default")
        if default_value is not None:
            harness_var["default"] = default_value

        harness_result[var_name] = harness_var

    return harness_result


def normalize_test_cases_structure():
    """
    Add missing harness_expected_result fields to test cases.

    This is the TDD Green phase implementation that makes the failing test pass.
    """
    # Load the test cases file
    fixtures_dir = Path(__file__).parent.parent / "tests" / "fixtures"
    fixture_path = fixtures_dir / "parser_test_cases.yaml"

    print(f"Loading test cases from: {fixture_path}")

    with open(fixture_path) as f:
        data = yaml.safe_load(f)

    test_cases = data.get("test_cases", [])
    modified_count = 0

    print(f"Processing {len(test_cases)} test cases...")

    for i, test_case in enumerate(test_cases):
        test_name = test_case.get("name", f"test_case_{i}")

        # Skip if harness_expected_result already exists
        if "harness_expected_result" in test_case:
            continue

        # Generate harness_expected_result from expected_result
        expected_result = test_case.get("expected_result", {})
        if expected_result:
            harness_result = convert_expected_to_harness(expected_result)
            test_case["harness_expected_result"] = harness_result
            modified_count += 1
            print(f"  ✓ Added harness_expected_result to: {test_name}")
        else:
            print(f"  ⚠ Skipping {test_name}: no expected_result found")

    # Write back to file with preserved formatting
    print(f"\nWriting normalized structure back to: {fixture_path}")
    with open(fixture_path, "w") as f:
        # Use custom YAML formatting to maintain readability
        yaml.dump(
            data,
            f,
            default_flow_style=False,
            sort_keys=False,
            indent=2,
            width=120,
            allow_unicode=True,
        )

    print("\n✅ Normalization complete!")
    print(f"   • Modified {modified_count} test cases")
    print("   • Added harness_expected_result fields")
    print(f"   • Total test cases: {len(test_cases)}")


if __name__ == "__main__":
    normalize_test_cases_structure()
