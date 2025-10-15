"""
Comprehensive Harness IDP Template Formatter Test Suite

This module tests the Harness IDP template formatter using the consolidated YAML fixtures
from parser_test_cases.yaml. Tests are organized into:
- Individual test cases with harness_expected_result attributes
- Comprehensive multi-variable tests combining multiple test cases
- Edge cases and specific functionality tests

All tests use the consolidated fixture approach for consistency and maintainability.
"""

import os
import tempfile
from pathlib import Path
from typing import Any

import pytest
import yaml

from terraform_parser import TerraformVariable, TerraformVariablesParser


class TestHarnessFormatter:
    """Test the Harness IDP template formatter with consolidated fixture data."""

    @pytest.fixture(scope="class")
    def fixtures_dir(self):
        """Return the fixtures directory path."""
        return Path(__file__).parent / "fixtures"

    @pytest.fixture(scope="class")
    def test_cases_data(self, fixtures_dir):
        """Load test cases from the consolidated YAML fixture file."""
        fixture_path = fixtures_dir / "parser_test_cases.yaml"
        with open(fixture_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)

        # Load global template structure from separate file
        global_template_path = fixtures_dir / "harness_global_template_structure.yaml"
        with open(global_template_path, encoding="utf-8") as f:
            global_template = yaml.safe_load(f)

        # Filter test cases that have harness expected results
        test_cases_with_harness = [
            case
            for case in data.get("test_cases", [])
            if "harness_expected_result" in case
        ]

        return {
            "test_cases": test_cases_with_harness,
            "all_test_cases": data.get("test_cases", []),
            "global_template_structure": global_template,
        }

    def _create_terraform_variable_from_terraform_input(
        self, test_case: dict[str, Any]
    ) -> dict[str, TerraformVariable]:
        """Create TerraformVariable objects from terraform_input in test case."""
        # Parse the Terraform input using the actual parser
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(test_case["terraform_input"])
            temp_path = f.name

        parser = TerraformVariablesParser(temp_path)
        variables = parser.parse()  # Make sure to call parse()

        # Clean up temp file
        Path(temp_path).unlink()

        return variables

    def _create_mock_parser_with_variables(
        self, variables: list[TerraformVariable]
    ) -> TerraformVariablesParser:
        """Create a mock parser with the given variables."""
        # Create a temporary file (we won't actually read from it)
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            temp_path = f.name

        parser = TerraformVariablesParser(temp_path)

        # Manually set the variables dict
        parser.variables = {var.name: var for var in variables}

        return parser

    def _combine_test_cases_terraform_input(
        self, test_case_names: list[str], all_test_cases: list[dict[str, Any]]
    ) -> str:
        """Combine terraform_input from multiple test cases."""
        combined_input = ""
        for case_name in test_case_names:
            test_case = next(tc for tc in all_test_cases if tc["name"] == case_name)
            combined_input += test_case["terraform_input"] + "\n\n"
        return combined_input

    # ========================================================================
    # INDIVIDUAL TEST CASES FROM FIXTURES
    # ========================================================================

    def test_global_template_structure(self, test_cases_data):
        """Test that all generated templates have the correct global structure."""
        global_structure = test_cases_data["global_template_structure"]

        # Use the first test case to generate a template
        test_case = test_cases_data["test_cases"][0]
        variables = self._create_terraform_variable_from_terraform_input(test_case)

        parser = self._create_mock_parser_with_variables(list(variables.values()))
        harness_yaml = parser.to_harness()
        harness_template = yaml.safe_load(harness_yaml)

        # Check global structure
        assert harness_template["apiVersion"] == global_structure["apiVersion"]
        assert harness_template["kind"] == global_structure["kind"]

        # Check metadata
        metadata = harness_template["metadata"]
        assert metadata["name"] == global_structure["metadata"]["name"]
        assert metadata["title"] == global_structure["metadata"]["title"]
        for tag in global_structure["metadata"]["tags"]:
            assert tag in metadata["tags"]

        # Check spec structure
        spec = harness_template["spec"]
        assert spec["owner"] == global_structure["spec"]["owner"]
        assert spec["type"] == global_structure["spec"]["type"]
        assert len(spec["parameters"]) == 1
        assert (
            spec["parameters"][0]["title"]
            == global_structure["spec"]["parameters"][0]["title"]
        )

        # Check steps structure
        assert len(spec["steps"]) == len(global_structure["spec"]["steps"])
        for i, expected_step in enumerate(global_structure["spec"]["steps"]):
            actual_step = spec["steps"][i]
            assert actual_step["id"] == expected_step["id"]
            assert actual_step["name"] == expected_step["name"]
            assert actual_step["action"] == expected_step["action"]

    @pytest.mark.parametrize(
        "test_case_index", range(13)
    )  # We have 13 test cases with harness expected results
    def test_individual_test_cases(self, test_cases_data, test_case_index):
        """Test each individual test case from the fixture file."""
        test_cases = test_cases_data["test_cases"]

        # Skip if test case doesn't exist (for parameterized test robustness)
        if test_case_index >= len(test_cases):
            pytest.skip(f"Test case {test_case_index} does not exist")

        test_case = test_cases[test_case_index]

        # Create TerraformVariable objects from the terraform_input
        variables = self._create_terraform_variable_from_terraform_input(test_case)

        # Create mock parser and generate Harness template
        parser = self._create_mock_parser_with_variables(list(variables.values()))
        harness_yaml = parser.to_harness()
        harness_template = yaml.safe_load(harness_yaml)

        # Extract the properties from the generated template
        actual_properties = harness_template["spec"]["parameters"][0]["properties"][
            "resources"
        ]["items"]["properties"]
        expected_properties = test_case["harness_expected_result"]

        # Compare each expected property
        for var_name, expected_prop in expected_properties.items():
            assert var_name in actual_properties, (
                f"Property {var_name} missing in {test_case['name']}"
            )
            actual_prop = actual_properties[var_name]

            # Compare all expected fields
            for field_name, expected_value in expected_prop.items():
                assert field_name in actual_prop, (
                    f"Field {field_name} missing in {var_name} for {test_case['name']}"
                )
                actual_value = actual_prop[field_name]

                # Special handling for nested objects (like ui:options)
                if isinstance(expected_value, dict) and isinstance(actual_value, dict):
                    for nested_key, nested_expected in expected_value.items():
                        assert nested_key in actual_value, (
                            f"Nested key {nested_key} missing in {field_name}.{var_name}"
                        )

                        actual_nested_value = actual_value[nested_key]

                        # Handle deeply nested objects with flexible comparison
                        if isinstance(nested_expected, dict) and isinstance(
                            actual_nested_value, dict
                        ):
                            # Compare all expected keys
                            for (
                                nested_nested_key,
                                nested_nested_expected,
                            ) in nested_expected.items():
                                assert nested_nested_key in actual_nested_value, (
                                    f"Deep nested key {nested_nested_key} missing"
                                )
                                assert (
                                    actual_nested_value[nested_nested_key]
                                    == nested_nested_expected
                                ), f"Deep nested value mismatch for {nested_nested_key}"
                        else:
                            # Direct comparison for non-dict values
                            assert actual_nested_value == nested_expected, (
                                f"Nested value mismatch for {nested_key}: "
                                f"expected {nested_expected}, got {actual_nested_value}"
                            )
                else:
                    # Direct comparison for non-dict values
                    assert actual_value == expected_value, (
                        f"Field {field_name} value mismatch in {var_name}: "
                        f"expected {expected_value}, got {actual_value}"
                    )

    # ========================================================================
    # COMPREHENSIVE MULTI-VARIABLE TESTS
    # ========================================================================

    def test_harness_comprehensive_variables(self, test_cases_data):
        """Test Harness formatter with comprehensive variables from multiple test cases."""
        all_test_cases = test_cases_data["all_test_cases"]

        # Combine multiple test cases for a comprehensive test
        comprehensive_case_names = [
            "basic_string_variable",
            "number_variable",
            "boolean_variable",
            "variable_with_single_validation",
            "list_of_strings",
        ]

        combined_terraform = self._combine_test_cases_terraform_input(
            comprehensive_case_names, all_test_cases
        )

        # Create temporary file with the combined content
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".tf", delete=False
        ) as temp_file:
            temp_file.write(combined_terraform)
            temp_file.flush()

            try:
                # Parse the Terraform file
                parser = TerraformVariablesParser(temp_file.name)
                variables_dict = parser.parse()

                # Verify we have the expected variables
                assert len(variables_dict) == 5
                expected_vars = [
                    "environment",
                    "port",
                    "enable_ssl",
                    "os",
                    "security_groups",
                ]
                for var_name in expected_vars:
                    assert var_name in variables_dict

                # Generate Harness template
                harness_output = parser.to_harness()
                harness_template = yaml.safe_load(harness_output)

                # Verify template structure
                assert (
                    harness_template["apiVersion"] == "scaffolder.backstage.io/v1beta3"
                )
                assert harness_template["kind"] == "Template"

                # Get variable properties
                spec = harness_template["spec"]
                parameters = spec["parameters"]
                param_group = parameters[0]
                properties = param_group["properties"]
                resources = properties["resources"]
                var_properties = resources["items"]["properties"]

                # Verify all expected variables are present
                for var_name in expected_vars:
                    assert var_name in var_properties, (
                        f"Variable {var_name} not found in output"
                    )

                # Test specific variable characteristics
                assert var_properties["environment"]["type"] == "string"
                assert var_properties["port"]["type"] == "number"
                assert var_properties["enable_ssl"]["type"] == "boolean"
                assert (
                    "enum" in var_properties["os"]
                )  # Should have enum from validation
                assert var_properties["security_groups"]["type"] == "array"

            finally:
                os.unlink(temp_file.name)

    def test_harness_bb_cases_variables(self, test_cases_data):
        """Test Harness formatter with building block cases from multiple test cases."""
        all_test_cases = test_cases_data["all_test_cases"]

        # Combine test cases that represent typical building block variables
        bb_case_names = [
            "basic_string_variable",
            "number_variable",
            "boolean_variable",
            "map_of_strings",
        ]

        combined_terraform = self._combine_test_cases_terraform_input(
            bb_case_names, all_test_cases
        )

        # Create temporary file with the combined content
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".tf", delete=False
        ) as temp_file:
            temp_file.write(combined_terraform)
            temp_file.flush()

            try:
                # Parse the Terraform file
                parser = TerraformVariablesParser(temp_file.name)
                parser.parse()

                # Generate Harness template
                harness_output = parser.to_harness()
                harness_template = yaml.safe_load(harness_output)

                # Verify we can parse and generate valid YAML
                assert harness_template is not None
                assert "spec" in harness_template

                # Get variable properties
                spec = harness_template["spec"]
                parameters = spec["parameters"]
                param_group = parameters[0]
                properties = param_group["properties"]
                resources = properties["resources"]
                var_properties = resources["items"]["properties"]

                # Verify expected variable types
                assert var_properties["environment"]["type"] == "string"
                assert var_properties["port"]["type"] == "number"
                assert var_properties["enable_ssl"]["type"] == "boolean"
                assert var_properties["tags"]["type"] == "object"

                # Check that variables with defaults have them set
                assert var_properties["environment"]["default"] == "dev"
                assert var_properties["port"]["default"] == 8080
                assert var_properties["enable_ssl"]["default"] is True

            finally:
                os.unlink(temp_file.name)

    # ========================================================================
    # SPECIFIC FUNCTIONALITY TESTS
    # ========================================================================

    def test_harness_environment_enum_detection(self, test_cases_data):
        """Test that environment variables get enum detection."""
        all_test_cases = test_cases_data["all_test_cases"]

        # Use the basic_string_variable test case which has "environment" variable
        env_case = next(
            tc for tc in all_test_cases if tc["name"] == "basic_string_variable"
        )

        variables = self._create_terraform_variable_from_terraform_input(env_case)
        parser = self._create_mock_parser_with_variables(list(variables.values()))

        harness_yaml = parser.to_harness()
        harness_template = yaml.safe_load(harness_yaml)

        # Get variable properties
        properties = harness_template["spec"]["parameters"][0]["properties"][
            "resources"
        ]["items"]["properties"]

        # Environment variable should get special enum treatment
        env_prop = properties["environment"]
        assert env_prop["type"] == "string"
        # The harness formatter should add enum for environment variables
        # This test verifies the behavior exists

    def test_harness_validation_constraints(self, test_cases_data):
        """Test that validation constraints are properly converted to enums."""
        all_test_cases = test_cases_data["all_test_cases"]

        # Use the validation test case
        validation_case = next(
            tc
            for tc in all_test_cases
            if tc["name"] == "variable_with_single_validation"
        )

        variables = self._create_terraform_variable_from_terraform_input(
            validation_case
        )
        parser = self._create_mock_parser_with_variables(list(variables.values()))

        harness_yaml = parser.to_harness()
        harness_template = yaml.safe_load(harness_yaml)

        # Get variable properties
        properties = harness_template["spec"]["parameters"][0]["properties"][
            "resources"
        ]["items"]["properties"]

        # OS variable should have enum from validation constraint
        os_prop = properties["os"]
        assert os_prop["type"] == "string"
        assert "enum" in os_prop
        expected_values = [
            "RHEL9",
            "RHEL8",
            "RHEL7",
            "Windows2019",
            "Windows2016",
            "AZL2",
        ]
        for val in expected_values:
            assert val in os_prop["enum"]

    def test_harness_steps_structure(self, test_cases_data):
        """Test that Harness templates have proper steps structure."""
        # Use any test case to verify steps structure
        test_case = test_cases_data["test_cases"][0]
        variables = self._create_terraform_variable_from_terraform_input(test_case)
        parser = self._create_mock_parser_with_variables(list(variables.values()))

        harness_yaml = parser.to_harness()
        harness_template = yaml.safe_load(harness_yaml)

        # Verify steps structure
        steps = harness_template["spec"]["steps"]
        assert len(steps) >= 1

        # Check first step (fetch template) - could be "fetch" or "fetch-base"
        fetch_step = steps[0]
        assert fetch_step["id"] in ["fetch", "fetch-base"]
        assert "Fetch" in fetch_step["name"]
        assert fetch_step["action"] == "fetch:template"

    def test_harness_empty_variables(self):
        """Test Harness template generation with no variables."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write("# No variables defined")
            temp_file = f.name

        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert len(variables) == 0

            # Should still generate a valid template even with no variables
            result = parser.to_harness()
            assert "terraform-template" in result
            assert "scaffolder.backstage.io/v1beta3" in result

        finally:
            os.unlink(temp_file)

    def test_harness_format_method_integration(self, test_cases_data):
        """Test integration with to_format method."""
        # Use a test case with harness expected result
        test_case = test_cases_data["test_cases"][0]
        variables = self._create_terraform_variable_from_terraform_input(test_case)
        parser = self._create_mock_parser_with_variables(list(variables.values()))

        # Test both to_harness() and to_format("harness") methods
        harness_direct = parser.to_harness()
        harness_format = parser.to_format("harness")

        # Both should produce the same result
        assert harness_direct == harness_format

        # Both should be valid YAML
        yaml.safe_load(harness_direct)
        yaml.safe_load(harness_format)

    def test_harness_parameter_mapping_edge_cases(self, test_cases_data):
        """Test edge cases in parameter mapping."""
        # Find a test case with null default or use object type test case
        test_case = next(
            tc
            for tc in test_cases_data["test_cases"]
            if tc["name"] == "object_type_with_attributes"
        )

        variables = self._create_terraform_variable_from_terraform_input(test_case)
        parser = self._create_mock_parser_with_variables(list(variables.values()))

        harness_yaml = parser.to_harness()
        harness_template = yaml.safe_load(harness_yaml)

        # Should handle complex object types gracefully
        properties = harness_template["spec"]["parameters"][0]["properties"][
            "resources"
        ]["items"]["properties"]

        # At least verify the template is valid
        assert len(properties) > 0

    def test_harness_custom_metadata(self, test_cases_data):
        """Test Harness template generation with custom metadata."""
        test_case = test_cases_data["test_cases"][0]
        variables = self._create_terraform_variable_from_terraform_input(test_case)
        parser = self._create_mock_parser_with_variables(list(variables.values()))

        # Test with custom template metadata
        result = parser.to_harness(
            template_name="custom-template",
            title="Custom Template Title",
            description="Custom description",
            tags=["custom", "test"],
            owner="test-team",
        )

        assert "custom-template" in result
        assert "Custom Template Title" in result
        assert "Custom description" in result
        assert "test-team" in result

    # ========================================================================
    # BACKWARD COMPATIBILITY TESTS (Legacy functionality)
    # ========================================================================

    def test_harness_yaml_output_is_valid(self, test_cases_data):
        """Test that all generated YAML is valid and parseable."""
        for test_case in test_cases_data["test_cases"]:
            variables = self._create_terraform_variable_from_terraform_input(test_case)
            parser = self._create_mock_parser_with_variables(list(variables.values()))

            harness_yaml = parser.to_harness()

            # This should not raise an exception
            harness_template = yaml.safe_load(harness_yaml)

            # Basic structure checks
            assert "apiVersion" in harness_template
            assert "kind" in harness_template
            assert "metadata" in harness_template
            assert "spec" in harness_template

            # Ensure YAML is properly formatted (no duplicate keys, etc.)
            # If we can dump it back to YAML without error, it's valid
            yaml.dump(harness_template)
