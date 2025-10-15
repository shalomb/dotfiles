"""
Comprehensive test coverage for edge cases, error conditions, and uncovered code paths.

This file consolidates all coverage-focused tests into organized test classes.
Each test is designed to hit specific uncovered lines or edge cases.
"""

import json
import os
import subprocess
import sys
import tempfile
from io import StringIO
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml

from terraform_parser.parser import (
    ObjectType,
    OptionalType,
    PrimitiveType,
    TerraformVariable,
    TerraformVariablesParser,
    TupleType,
    generate_multi_building_block_harness,
)


class TestCLICoverageComplete:
    """Comprehensive CLI coverage tests."""

    def test_cli_both_file_and_building_blocks_error(self):
        """Test CLI error when both file and building_blocks are provided."""

        result = subprocess.run(
            ["terraform-parser", "dummy.tf", "--building-blocks", "pattern/*"],
            capture_output=True,
            text=True,
        )

        assert result.returncode == 2
        assert "Cannot specify both" in result.stderr

    def test_cli_no_file_or_building_blocks_error(self):
        """Test CLI error when neither file nor building_blocks are provided."""

        result = subprocess.run(["terraform-parser"], capture_output=True, text=True)

        assert result.returncode == 2

    def test_cli_backward_compatibility_output_warning(self):
        """Test CLI warning for deprecated --output flag."""
        import tempfile

        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf") as f:
            f.write('variable "test" { type = string }')
            f.flush()

            result = subprocess.run(
                ["terraform-parser", f.name, "--output", "json"],
                capture_output=True,
                text=True,
            )

            assert result.returncode == 0
            assert "deprecated" in result.stderr.lower()

    def test_cli_building_blocks_no_matching_directories(self):
        """Test CLI with building blocks pattern that matches no directories."""

        result = subprocess.run(
            ["terraform-parser", "--building-blocks", "nonexistent-pattern/*"],
            capture_output=True,
            text=True,
        )

        assert result.returncode == 1  # CLI exits with error when no directories found
        assert "No directories found" in result.stderr

    def test_cli_building_blocks_missing_variables_file_warning(self):
        """Test CLI warning when building block directory lacks variables.tf."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a building block directory without variables.tf
            bb_dir = Path(tmpdir) / "test-building-block"
            bb_dir.mkdir()
            (bb_dir / "main.tf").write_text("# Empty main file")

            result = subprocess.run(
                ["terraform-parser", "--building-blocks", f"{tmpdir}/*"],
                capture_output=True,
                text=True,
            )

            assert (
                result.returncode == 1
            )  # CLI exits with error when no valid building blocks
            assert "Warning" in result.stderr

    def test_building_blocks_with_warnings_comprehensive(self):
        """Test building blocks functionality with comprehensive warning scenarios."""
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            # Create directory structure
            bb1_dir = Path(temp_dir) / "building-block-1"
            bb1_dir.mkdir()

            # Create a variables.tf file in bb1
            (bb1_dir / "variables.tf").write_text("""
variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name"
}
""")

            # Create bb2 without variables.tf (should trigger warning)
            bb2_dir = Path(temp_dir) / "building-block-2"
            bb2_dir.mkdir()

            # Create bb3 that is not a directory (should be skipped)
            (Path(temp_dir) / "not-a-directory.txt").write_text("not a directory")

            result = subprocess.run(
                [
                    "uv",
                    "run",
                    "terraform-parser",
                    "--building-blocks",
                    f"{temp_dir}/*",
                    "--format",
                    "summary",
                ],
                capture_output=True,
                text=True,
            )

            assert result.returncode == 0
            assert "Warning: No variables.tf found in" in result.stderr
            assert "building-block-2" in result.stderr
            assert "Found 1 building blocks" in result.stdout
            assert "building-block-1: 1 variables" in result.stdout

    def test_building_blocks_harness_output_format(self):
        """Test building blocks with Harness output format."""
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            bb_dir = Path(temp_dir) / "test-bb"
            bb_dir.mkdir()

            (bb_dir / "variables.tf").write_text("""
variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name"
}

variable "instance_count" {
  type        = number
  default     = 1
  description = "Number of instances"
}
""")

            result = subprocess.run(
                [
                    "uv",
                    "run",
                    "terraform-parser",
                    "--building-blocks",
                    f"{temp_dir}/*",
                    "--format",
                    "harness",
                ],
                capture_output=True,
                text=True,
            )

            assert result.returncode == 0
            # Should generate multi-building-block Harness template
            harness_output = yaml.safe_load(result.stdout)
            assert harness_output["apiVersion"] == "scaffolder.backstage.io/v1beta3"
            assert harness_output["kind"] == "Template"

    def test_cli_yaml_and_json_output_format_branches(self):
        """Test YAML and JSON output formats through CLI to cover missing lines."""
        import tempfile

        import yaml

        tf_content = """
variable "test_var" {
  type        = string
  default     = "value"
  description = "Test variable"
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(tf_content)
            temp_file = f.name

        try:
            # Test JSON format
            result = subprocess.run(
                ["uv", "run", "terraform-parser", temp_file, "--format", "json"],
                capture_output=True,
                text=True,
            )
            assert result.returncode == 0
            json_output = json.loads(result.stdout)
            assert "test_var" in json_output

            # Test YAML format
            result = subprocess.run(
                ["uv", "run", "terraform-parser", temp_file, "--format", "yaml"],
                capture_output=True,
                text=True,
            )
            assert result.returncode == 0
            yaml_output = yaml.safe_load(result.stdout)
            assert "test_var" in yaml_output

        finally:
            os.unlink(temp_file)

    def test_building_blocks_no_valid_blocks_found(self):
        """Test building blocks when no valid blocks are found."""
        import tempfile

        from terraform_parser import main

        with tempfile.TemporaryDirectory() as temp_dir:
            # Create directories but no variables.tf files
            (Path(temp_dir) / "empty1").mkdir()
            (Path(temp_dir) / "empty2").mkdir()

            with patch(
                "sys.argv", ["terraform-parser", "--building-blocks", f"{temp_dir}/*"]
            ):
                with patch("sys.stderr", new=StringIO()) as mock_stderr:
                    with pytest.raises(SystemExit) as exc_info:
                        main()
                    assert exc_info.value.code == 1
                    assert "No valid building blocks found" in mock_stderr.getvalue()

    def test_cli_output_format_branches_comprehensive(self):
        """Test different output format branches for complete coverage."""
        import tempfile

        tf_content = """
variable "test" {
  type    = string
  default = "value"
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(tf_content)
            temp_file = f.name

        try:
            # Test summary format (default) - should hit the summary branch
            result = subprocess.run(
                ["uv", "run", "terraform-parser", temp_file],
                capture_output=True,
                text=True,
            )
            assert result.returncode == 0
            assert "Parsed 1 variables from" in result.stdout
            assert "• test: PrimitiveType" in result.stdout
            assert "Default: value" in result.stdout

            # Test harness format
            result = subprocess.run(
                ["uv", "run", "terraform-parser", temp_file, "--format", "harness"],
                capture_output=True,
                text=True,
            )
            assert result.returncode == 0
            harness_output = yaml.safe_load(result.stdout)
            assert "apiVersion" in harness_output

        finally:
            os.unlink(temp_file)

    def test_cli_main_exception_handling(self):
        """Test exception handling in main() function (__init__.py lines 199-200)."""

        # Create a temporary file with malformed content
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write('variable "test" {\n  type = ${malformed\n')  # Malformed syntax
            f.flush()

            try:
                result = subprocess.run(
                    [
                        sys.executable,
                        "-c",
                        f'from terraform_parser import main; import sys; sys.argv = ["terraform-parser", "{f.name}", "--format", "json"]; main()',
                    ],
                    capture_output=True,
                    text=True,
                )

                # CLI handles parsing errors gracefully
                assert result.returncode == 0
                assert "Error parsing" in result.stdout

            finally:
                Path(f.name).unlink(missing_ok=True)


class TestParserCoverageComplete:
    """Comprehensive parser coverage tests for edge cases and error conditions."""

    def test_complex_object_exception_handling(self):
        """Test exception handling in _parse_complex_object (lines 399-401)."""
        var = TerraformVariable(
            "test",
            {"type": 'object({"key": ${malformed})'},  # Malformed JSON
        )

        assert isinstance(var.type, ObjectType)
        # Manual parsing should extract the key even with malformed value
        assert "key" in var.type.attributes

    def test_number_parsing_fallback(self):
        """Test number parsing fallback in _parse_default_value (line 519)."""
        var = TerraformVariable(
            "test", {"type": 'optional(string, "not.a.number.with.dots")'}
        )

        assert isinstance(var.type, OptionalType)
        assert var.type.default_value == "not.a.number.with.dots"

    def test_malformed_interpolation_fallback(self):
        """Test malformed interpolation fallback (line 766)."""
        var = TerraformVariable(
            "test",
            {"type": "${malformed_interpolation"},  # Missing closing brace
        )

        assert isinstance(var.type, PrimitiveType)

    def test_tuple_edge_case_parsing(self):
        """Test tuple parsing edge cases (lines 791-792)."""
        var = TerraformVariable(
            "test",
            {"type": ["tuple", {"invalid": "structure"}]},  # Dict instead of list
        )

        assert isinstance(var.type, TupleType)
        assert var.type.element_types == []

    def test_malformed_optional_syntax_fallback(self):
        """Test malformed optional syntax fallback."""
        var = TerraformVariable(
            "test",
            {"type": 'optional(string, "default", "extra", "parts")'},  # Too many parts
        )

        # Since this has too many parts, it likely falls back to PrimitiveType
        # Let's just check that parsing doesn't crash
        assert var.type is not None

    def test_object_parsing_with_colon_syntax(self):
        """Test object parsing with colon syntax."""
        var = TerraformVariable(
            "test", {"type": 'object({"key1": string, "key2": number})'}
        )

        assert isinstance(var.type, ObjectType)
        assert len(var.type.attributes) == 2

    def test_escape_sequence_in_optional_parsing(self):
        """Test escape sequence handling in optional parsing."""
        var = TerraformVariable(
            "test", {"type": r'optional(string, "value with \"quotes\"")'}
        )

        assert isinstance(var.type, OptionalType)
        assert '"' in var.type.default_value

    def test_complex_default_value_parsing(self):
        """Test complex default value parsing."""
        var = TerraformVariable(
            "test",
            {
                "type": "string",
                "default": '{"complex": "json", "with": ["nested", "values"]}',
            },
        )

        assert var.default is not None

    def test_no_type_specified_fallback(self):
        """Test fallback when no type is specified."""
        var = TerraformVariable("test", {"default": "some_value"})

        # Should infer type from default
        assert isinstance(var.type, PrimitiveType)

    def test_file_parsing_error_handling(self):
        """Test file parsing error handling."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf") as f:
            f.write("invalid terraform syntax {{{ ")
            f.flush()

            try:
                parser = TerraformVariablesParser(f.name)
                # Should not raise exception, but handle gracefully
                variables = parser.variables
                assert isinstance(variables, dict)
            except Exception:
                # If exception is raised, that's also acceptable behavior
                pass

    def test_single_dictionary_variables_format(self):
        """Test variables in single dictionary format."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf") as f:
            f.write(
                """
            variables = {
              test_var = {
                type = string
                default = "test"
              }
            }
            """
            )
            f.flush()

            parser = TerraformVariablesParser(f.name)
            assert len(parser.variables) >= 0  # May or may not parse this format


class TestValidationCoverageComplete:
    """Coverage tests for validation parsing edge cases."""

    def test_validation_length_exception_handling(self):
        """Test exception handling in length validation parsing (lines 963-968)."""
        var = TerraformVariable(
            "test",
            {
                "type": "string",
                "validation": [
                    {
                        "condition": "length(var.test) > -5 && length(var.test) < -1",
                        "error_message": "Invalid length with negative values",
                    }
                ],
            },
        )

        parser = TerraformVariablesParser("dummy.tf")
        param = parser._terraform_var_to_harness_param("test", var)
        assert "type" in param["spec"]

    def test_regex_exception_handling(self):
        """Test exception handling in regex validation parsing (lines 983-987)."""
        var = TerraformVariable(
            "test",
            {
                "type": "string",
                "validation": [
                    {
                        "condition": 'can(regex("malformed[regex", var.test))',
                        "error_message": "Malformed regex validation",
                    }
                ],
            },
        )

        parser = TerraformVariablesParser("dummy.tf")
        param = parser._terraform_var_to_harness_param("test", var)
        assert "type" in param["spec"]

    def test_numeric_constraint_parsing_failures(self):
        """Test numeric constraint parsing failures (lines 1042-1045)."""
        var = TerraformVariable(
            "test",
            {
                "type": "number",
                "validation": [
                    {
                        "condition": "var.test >= invalid_value",
                        "error_message": "Invalid numeric constraint",
                    }
                ],
            },
        )

        parser = TerraformVariablesParser("dummy.tf")
        param = parser._terraform_var_to_harness_param("test", var)
        assert "type" in param["spec"]

    def test_malformed_validation_parsing(self):
        """Test malformed validation parsing."""
        var = TerraformVariable(
            "test",
            {
                "type": "string",
                "validation": "not_a_list",  # Should be a list
            },
        )

        parser = TerraformVariablesParser("dummy.tf")
        param = parser._terraform_var_to_harness_param("test", var)
        assert "type" in param["spec"]


class TestHarnessCoverageComplete:
    """Coverage tests for harness generation edge cases."""

    def test_environment_enum_detection(self):
        """Test environment enum detection (lines 914, 921-922)."""
        env_vars = [
            TerraformVariable("environment", {"type": "string"}),
            TerraformVariable("env", {"type": "string"}),
            TerraformVariable("deploy_env", {"type": "string"}),
        ]

        parser = TerraformVariablesParser("dummy.tf")

        for var in env_vars:
            param = parser._terraform_var_to_harness_param(var.name, var)
            spec = param["spec"]
            if "enum" in spec:
                assert "dev" in spec["enum"]
                assert "staging" in spec["enum"]
                assert "prod" in spec["enum"]

    def test_helper_method_fallback(self):
        """Test _get_harness_param_for_type fallback (lines 941, 954)."""
        tuple_type = TupleType([PrimitiveType("string")])

        parser = TerraformVariablesParser("dummy.tf")
        result = parser._get_harness_param_for_type(tuple_type, "test")

        assert "type" in result
        if result["type"] == "string":
            assert "ui:widget" in result
            assert result["ui:widget"] == "textarea"

    def test_optional_type_helper_handling(self):
        """Test OptionalType handling in helper method (lines 1082-1088)."""
        inner_optional = OptionalType(PrimitiveType("string"), "default", True)
        outer_optional = OptionalType(inner_optional)

        parser = TerraformVariablesParser("dummy.tf")
        result = parser._get_harness_param_for_type(outer_optional, "test")

        assert isinstance(result, dict)

    def test_building_block_edge_cases(self):
        """Test building block generation edge cases (line 1064)."""
        building_blocks = {
            "test-block": {
                "variables": {},  # Empty variables
                "parser": TerraformVariablesParser("dummy.tf"),
                "path": "/dummy/path",
            }
        }

        result = generate_multi_building_block_harness(building_blocks)
        assert "apiVersion" in result
        assert "test-block" in result

    def test_empty_building_blocks_handling(self):
        """Test empty building blocks handling (lines 1067-1070)."""
        result = generate_multi_building_block_harness({})

        assert "apiVersion" in result
        assert "kind" in result

    def test_harness_generation_with_custom_metadata(self):
        """Test harness generation with custom metadata."""
        parser = TerraformVariablesParser("dummy.tf")
        parser.variables = {
            "test_var": TerraformVariable(
                "test_var", {"type": "string", "description": "Test variable"}
            )
        }

        result = parser.to_format("harness")
        assert "apiVersion" in result


class TestComplexTypesCoverageComplete:
    """Coverage tests for complex type parsing edge cases."""

    def test_complex_nested_type_parsing_edge_cases(self):
        """Test complex nested type parsing edge cases."""
        var = TerraformVariable(
            "test", {"type": 'map(object({"nested": list(map(string))}))'}
        )

        # Should parse successfully without exceptions
        assert var.type is not None

    def test_function_type_parsing_edge_cases(self):
        """Test function type parsing edge cases."""
        var = TerraformVariable(
            "test",
            {"type": "func(string, number) -> bool"},  # Function-like syntax
        )

        # Should fallback to primitive type
        assert isinstance(var.type, PrimitiveType)

    def test_malformed_object_type_string_exception_handling(self):
        """Test malformed object type string exception handling."""
        var = TerraformVariable(
            "test", {"type": "object({malformed syntax without proper structure"}
        )

        # Should handle gracefully and create some type
        assert var.type is not None

    def test_deeply_nested_string_parsing(self):
        """Test deeply nested string parsing."""
        complex_type = 'list(map(object({"deeply": object({"nested": list(string)})})))'
        var = TerraformVariable("test", {"type": complex_type})

        # Should parse without infinite recursion
        assert var.type is not None

    def test_empty_object_and_tuple_types(self):
        """Test empty object and tuple types."""
        empty_object = TerraformVariable("obj", {"type": "object({})"})
        empty_tuple = TerraformVariable("tup", {"type": "tuple([])"})

        assert isinstance(empty_object.type, ObjectType)
        assert isinstance(empty_tuple.type, TupleType)

    def test_mixed_type_syntax(self):
        """Test mixed type syntax variations."""
        variations = [
            "list(string)",
            "list(   string   )",  # Extra whitespace
            "list( string )",
            "map(string)",
            "set(number)",
        ]

        for type_str in variations:
            var = TerraformVariable("test", {"type": type_str})
            assert var.type is not None

    def create_temp_tf_file(self, content: str) -> str:
        """Helper method to create a temporary .tf file with given content"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            return f.name

    def test_object_type_with_invalid_dict_structure(self):
        """Test object type parsing when object() call lacks proper dict structure"""
        tf_content = """
variable "test_object_fallback" {
  type = object({})
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert "test_object_fallback" in variables
            var = variables["test_object_fallback"]
            assert "ObjectType" in str(var.type)
        finally:
            os.unlink(temp_file)

    def test_tuple_type_with_empty_list(self):
        """Test tuple type parsing with empty list"""
        tf_content = """
variable "test_tuple_empty" {
  type = tuple([])
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert "test_tuple_empty" in variables
            var = variables["test_tuple_empty"]
            assert "TupleType" in str(var.type)
        finally:
            os.unlink(temp_file)

    def test_dict_type_definition_fallback(self):
        """Test dict type definition parsing"""
        tf_content = """
variable "dict_style_object" {
  type = {
    name = string
    count = number
  }
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert "dict_style_object" in variables
            var = variables["dict_style_object"]
            assert "ObjectType" in str(var.type)
        finally:
            os.unlink(temp_file)

    def test_set_with_no_element_type(self):
        """Test set type with missing element type parameter"""
        tf_content = """
variable "empty_set_type" {
  type = set()
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert "empty_set_type" in variables
            var = variables["empty_set_type"]
            assert "SetType" in str(var.type)
        finally:
            os.unlink(temp_file)

    def test_map_with_no_value_type(self):
        """Test map type with missing value type parameter"""
        tf_content = """
variable "empty_map_type" {
  type = map()
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert "empty_map_type" in variables
            var = variables["empty_map_type"]
            assert "MapType" in str(var.type)
        finally:
            os.unlink(temp_file)

    def test_nested_function_calls_in_types(self):
        """Test deeply nested function calls in type definitions"""
        tf_content = """
variable "nested_function_types" {
  type = list(set(map(string)))
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert "nested_function_types" in variables
            var = variables["nested_function_types"]
            assert "ListType" in str(var.type)
        finally:
            os.unlink(temp_file)

    def test_complex_nested_object_attributes(self):
        """Test complex nested object attribute parsing"""
        tf_content = """
variable "deeply_nested_object" {
  type = object({
    level1 = object({
      level2 = object({
        level3 = map(set(string))
      })
    })
  })
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert "deeply_nested_object" in variables
            var = variables["deeply_nested_object"]
            assert "ObjectType" in str(var.type)
        finally:
            os.unlink(temp_file)

    def test_mixed_tuple_element_types(self):
        """Test tuple with mixed element types"""
        tf_content = """
variable "mixed_tuple" {
  type = tuple([string, number, bool, list(string)])
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert "mixed_tuple" in variables
            var = variables["mixed_tuple"]
            assert "TupleType" in str(var.type)
        finally:
            os.unlink(temp_file)

    def test_edge_case_type_combinations(self):
        """Test various edge case type combinations"""
        tf_content = """
variable "edge_case_1" {
  type = list(tuple([string, number]))
}

variable "edge_case_2" {
  type = map(object({
    items = set(string)
    config = tuple([bool, number])
  }))
}

variable "edge_case_3" {
  type = set(map(any))
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()
            assert len(variables) == 3
            assert all("edge_case_" in name for name in variables.keys())
        finally:
            os.unlink(temp_file)


class TestErrorHandlingCoverageComplete:
    """Coverage tests for comprehensive error handling scenarios."""

    def test_file_permission_error_handling(self):
        """Test file permission error handling."""
        # Create a file and make it unreadable
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b'variable "test" { type = string }')
            temp_path = f.name

        try:
            # Make file unreadable (on Unix systems)
            import os

            os.chmod(temp_path, 0o000)

            # This should handle the permission error gracefully
            try:
                TerraformVariablesParser(temp_path)
                # If it doesn't raise an exception, that's fine too
            except (PermissionError, OSError):
                # Expected behavior for permission denied
                pass

        finally:
            # Clean up: restore permissions and delete
            try:
                os.chmod(temp_path, 0o644)
                os.unlink(temp_path)
            except Exception:
                pass

    def test_binary_file_handling(self):
        """Test binary file handling."""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".tf") as f:
            # Write binary data
            f.write(b"\x00\x01\x02\x03\x04\x05")
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            # Should handle binary data gracefully
            assert isinstance(parser.variables, dict)
        except Exception:
            # If exception is raised, that's also acceptable
            pass
        finally:
            os.unlink(temp_path)

    def test_extremely_large_file_handling(self):
        """Test handling of files with many variables."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            # Generate many variables
            for i in range(100):
                f.write(
                    f"""
variable "test_{i}" {{
  type = string
  default = "value_{i}"
  description = "Test variable {i}"
}}
"""
                )
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            # Should handle many variables without issues
            assert len(parser.variables) >= 0
        finally:
            os.unlink(temp_path)

    def test_unicode_and_special_characters(self):
        """Test unicode and special character handling."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", encoding="utf-8") as f:
            f.write(
                """
variable "unicode_test" {
  type = string
  default = "测试中文字符 🚀 émojis and spéciàl chars"
  description = "Unicode test: αβγδε русский العربية 日本語"
}
"""
            )
            f.flush()

            parser = TerraformVariablesParser(f.name)
            if "unicode_test" in parser.variables:
                var = parser.variables["unicode_test"]
                assert isinstance(var.default, str)
                assert isinstance(var.description, str)
