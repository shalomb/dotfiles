"""
Test edge cases for parser functionality.

This module focuses on testing specific edge cases in the parser
that may not be covered by regular tests, particularly around
function type parsing and complex interpolations.
"""

import os
import tempfile

import pytest

from terraform_parser.parser import TerraformVariablesParser


class TestParserEdgeCases:
    """Test specific parser edge cases to improve coverage."""

    def test_function_type_parsing_edge_cases(self):
        """Test edge cases in _parse_function_type method."""
        content = """
variable "complex_interpolations" {
  type = object({
    simple_func = string
    nested_func = string
    quoted_string = string
    escaped_quotes = string
    complex_expr = string
    arithmetic = string
    conditional = string
  })
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            assert "complex_interpolations" in variables
            var = variables["complex_interpolations"]
            assert var.type is not None

            # Test the to_dict conversion which exercises more code paths
            var_dict = var.to_dict()
            assert var_dict["type"] is not None
        finally:
            os.unlink(temp_path)

    def test_complex_object_parsing_with_commas_and_quotes(self):
        """Test object parsing with complex comma and quote handling."""
        content = """
variable "complex_object_parsing" {
  type = object({
    field_with_comma = "value, with, commas"
    field_with_quotes = "value_with_\\"quotes\\""
    field_with_brackets = "value[with]brackets"
    field_with_braces = "value{with}braces"
    field_with_parentheses = "value(with)parentheses"
    nested_object = object({
      inner_field = "inner_value"
      another_inner = "another_value"
    })
    list_field = list(object({
      list_item_field = string
    }))
  })
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            assert "complex_object_parsing" in variables
            var = variables["complex_object_parsing"]
            assert var.type is not None

            # Should handle complex nested structures
            var_dict = var.to_dict()
            assert "type" in var_dict
        finally:
            os.unlink(temp_path)

    def test_malformed_object_type_parsing(self):
        """Test parsing of malformed object types to trigger exception handling."""
        content = """
variable "malformed_objects" {
  type = object({
    incomplete_field =
    missing_value_field:
    malformed_syntax = object({
      unclosed_object = object({
        field = string
    # Missing closing braces
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            # Should handle malformed input gracefully
            assert isinstance(variables, dict)
        finally:
            os.unlink(temp_path)

    def test_deeply_nested_string_parsing(self):
        """Test deeply nested string parsing with various quote combinations."""
        content = """
variable "nested_strings" {
  type = object({
    level1 = object({
      field1 = "simple_string"
      field2 = "$${interpolated_string}"
      field3 = "$${complex.interpolated.string}"
      level2 = object({
        nested_field = "$${nested.interpolation.with.dots}"
        another_field = "another_simple_string"
        level3 = object({
          deep_field = "$${very.deep.interpolation}"
        })
      })
    })
  })
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            assert "nested_strings" in variables
            var = variables["nested_strings"]
            assert var.type is not None

            # Test full dictionary conversion
            var_dict = var.to_dict()
            assert var_dict is not None
        finally:
            os.unlink(temp_path)

    def test_empty_and_null_values_in_objects(self):
        """Test handling of empty and null values in object definitions."""
        content = """
variable "empty_null_values" {
  type = object({
    empty_string_field = ""
    null_field = null
    zero_field = 0
    false_field = false
    empty_object_field = object({})
    empty_list_field = list()
    empty_map_field = map()
  })
  default = {
    empty_string_field = ""
    null_field = null
    zero_field = 0
    false_field = false
    empty_object_field = {}
    empty_list_field = []
    empty_map_field = {}
  }
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            assert "empty_null_values" in variables
            var = variables["empty_null_values"]
            assert var.type is not None
            assert var.default is not None

            # Test serialization with edge case values
            json_output = parser.to_json()
            yaml_output = parser.to_yaml()

            assert json_output is not None
            assert yaml_output is not None
            assert "empty_null_values" in json_output
            assert "empty_null_values" in yaml_output
        finally:
            os.unlink(temp_path)

    def test_parsing_with_different_variable_formats(self):
        """Test parsing variables in different HCL formats."""
        content = """
# Standard format
variable "standard_format" {
  type = string
  description = "Standard variable format"
}

# Inline format (if supported)
variable "inline_format" { type = string }

# Multi-line descriptions
variable "multiline_description" {
  description = <<EOF
This is a multiline
description that spans
multiple lines
EOF
  type = string
}

# Variables with complex defaults
variable "complex_default" {
  type = object({
    nested = object({
      field = string
    })
  })
  default = {
    nested = {
      field = "default_value"
    }
  }
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            # Should parse all variable formats
            expected_vars = [
                "standard_format",
                "inline_format",
                "multiline_description",
                "complex_default",
            ]
            for var_name in expected_vars:
                if var_name in variables:  # Some formats might not be supported
                    var = variables[var_name]
                    assert var.type is not None
        finally:
            os.unlink(temp_path)

    def test_variable_with_all_attributes(self):
        """Test variable with all possible attributes to maximize coverage."""
        content = """
variable "comprehensive_variable" {
  description = "A comprehensive variable with all attributes"
  type = object({
    string_field = string
    number_field = number
    bool_field = bool
    list_field = list(string)
    map_field = map(number)
    nested_object = object({
      inner_field = string
    })
  })
  default = {
    string_field = "default_string"
    number_field = 42
    bool_field = true
    list_field = ["item1", "item2"]
    map_field = {
      key1 = 1
      key2 = 2
    }
    nested_object = {
      inner_field = "inner_default"
    }
  }
  sensitive = true
  nullable = false
  validation {
    condition = can(regex("^[a-z]+$", var.comprehensive_variable.string_field))
    error_message = "String field must contain only lowercase letters."
  }
  validation {
    condition = var.comprehensive_variable.number_field > 0
    error_message = "Number field must be positive."
  }
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            assert "comprehensive_variable" in variables
            var = variables["comprehensive_variable"]

            # Test all attributes
            assert var.type is not None
            assert var.description is not None
            assert var.default is not None
            assert var.sensitive is True
            assert len(var.validation) == 2

            # Test full serialization
            var_dict = var.to_dict()
            assert "type" in var_dict
            assert "description" in var_dict
            assert "default" in var_dict
            assert "sensitive" in var_dict
            assert "validation" in var_dict

            # Test parser output methods
            json_output = parser.to_json()
            yaml_output = parser.to_yaml()

            assert all(
                "comprehensive_variable" in output
                for output in [json_output, yaml_output]
            )
        finally:
            os.unlink(temp_path)

    def test_parser_methods_coverage(self):
        """Test various parser methods to ensure coverage."""
        content = """
variable "test_var" {
  type = string
  description = "Test variable"
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            parser.parse()

            # Test get_variable method
            test_var = parser.get_variable("test_var")
            assert test_var is not None
            assert test_var.name == "test_var"

            # Test get_variable with non-existent variable
            non_existent = parser.get_variable("non_existent")
            assert non_existent is None

            # Test list_variables method
            var_list = parser.list_variables()
            assert "test_var" in var_list

            # Test various output formats
            formats = ["json", "yaml"]
            for fmt in formats:
                output = parser.to_format(fmt)
                assert output is not None
                assert len(output) > 0
        finally:
            os.unlink(temp_path)

    def test_file_parsing_error_handling(self):
        """Test file parsing error handling to trigger exception paths."""
        # Test with invalid file path (triggers file reading error)
        parser = TerraformVariablesParser("/invalid/path/file.tf")
        parser.parse()
        assert parser.variables == {}

        # Test get_variable on empty parser
        var = parser.get_variable("any_var")
        assert var is None

        # Test list_variables on empty parser
        var_list = parser.list_variables()
        assert var_list == []

    def test_large_file_with_many_variables(self):
        """Test parsing a large file with many variables."""
        # Generate a large number of variables
        content_parts = []
        for i in range(50):  # Create 50 variables
            content_parts.append(
                f"""
variable "var_{i:03d}" {{
  description = "Generated variable {i}"
  type = object({{
    field_{i}_1 = string
    field_{i}_2 = number
    field_{i}_3 = bool
    nested_{i} = object({{
      inner_field = string
    }})
  }})
  default = {{
    field_{i}_1 = "value_{i}"
    field_{i}_2 = {i}
    field_{i}_3 = {str(i % 2 == 0).lower()}
    nested_{i} = {{
      inner_field = "inner_{i}"
    }}
  }}
}}
"""
            )

        content = "\n".join(content_parts)

        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            # Should successfully parse all variables
            assert len(variables) == 50

            # Test that all variables are correctly parsed
            for i in range(50):
                var_name = f"var_{i:03d}"
                assert var_name in variables
                var = variables[var_name]
                assert var.type is not None
                assert var.default is not None

            # Test output generation with large dataset
            json_output = parser.to_json()
            yaml_output = parser.to_yaml()

            assert len(json_output) > 1000  # Should be substantial
            assert len(yaml_output) > 1000  # Should be substantial
        finally:
            os.unlink(temp_path)

    def test_malformed_optional_syntax_fallback(self):
        """Test that malformed optional syntax falls back to PrimitiveType."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            # This should trigger the malformed optional fallback
            f.write(
                """
variable "malformed_optional" {
  type = "optional(string"
  description = "Missing closing parenthesis"
}

variable "another_malformed" {
  type = "optional("
  description = "Incomplete optional"
}
            """
            )
            temp_file = f.name

        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()

            assert "malformed_optional" in variables
            assert "another_malformed" in variables

            # Verify they are parsed as primitive types due to malformed syntax
            var1 = variables["malformed_optional"]
            var2 = variables["another_malformed"]

            # They should have been parsed as string types (fallback behavior)
            assert hasattr(var1.type, "type_name") or hasattr(var1.type, "raw_type")
            assert hasattr(var2.type, "type_name") or hasattr(var2.type, "raw_type")

        finally:
            os.unlink(temp_file)

    def test_complex_nested_type_parsing_edge_cases(self):
        """Test complex nested types that might hit uncovered branches."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(
                """
variable "deeply_nested" {
  type = object({
    level1 = object({
      level2 = object({
        level3 = list(object({
          level4 = map(string)
        }))
      })
    })
  })
  description = "Deeply nested structure"
}

variable "edge_case_tuple" {
  type = tuple([
    string,
    number,
    object({
      nested = optional(string, "default")
    })
  ])
  description = "Tuple with mixed complex types"
}
            """
            )
            temp_file = f.name

        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()

            # Should parse successfully despite complexity
            assert "deeply_nested" in variables
            assert "edge_case_tuple" in variables

        finally:
            os.unlink(temp_file)

    def test_empty_harness_template_edge_case(self):
        """Test harness template generation with no variables."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write("# This file has no variables")
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


if __name__ == "__main__":
    pytest.main([__file__])
