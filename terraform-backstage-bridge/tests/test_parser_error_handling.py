"""
Test error handling and edge cases for terraform_parser.

This module tests various error conditions, malformed inputs,
and edge cases to ensure robust error handling throughout the codebase.
"""

import os
import sys
import tempfile
from unittest.mock import patch

import pytest

from terraform_parser import main
from terraform_parser.parser import TerraformVariablesParser


class TestErrorHandling:
    """Test various error conditions and edge cases."""

    def test_nonexistent_file(self):
        """Test parsing a non-existent file."""
        parser = TerraformVariablesParser("nonexistent_file.tf")
        variables = parser.parse()
        assert variables == {}

    def test_empty_file(self):
        """Test parsing an empty file."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write("")
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            assert variables == {}
        finally:
            os.unlink(temp_path)

    def test_whitespace_only_file(self):
        """Test parsing a file with only whitespace."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write("   \n\t\n   \n")
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            assert variables == {}
        finally:
            os.unlink(temp_path)

    def test_comments_only_file(self):
        """Test parsing a file with only comments."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(
                """
# This is a comment
// This is another comment
/* This is a
   multiline comment */
"""
            )
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            assert variables == {}
        finally:
            os.unlink(temp_path)

    def test_malformed_hcl_syntax(self):
        """Test parsing a file with malformed HCL syntax."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(
                """
variable "test" {
  description = "Missing closing quote
  type = string
}
"""
            )
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            # Should return empty dict instead of crashing
            assert variables == {}
        finally:
            os.unlink(temp_path)

    def test_incomplete_variable_block(self):
        """Test parsing incomplete variable blocks."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(
                """
variable "incomplete" {
  description = "This variable is incomplete"
  # Missing closing brace
"""
            )
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            assert variables == {}
        finally:
            os.unlink(temp_path)

    def test_binary_file(self):
        """Test parsing a binary file."""
        with tempfile.NamedTemporaryFile(mode="wb", suffix=".tf", delete=False) as f:
            # Write some binary data
            f.write(b"\x00\x01\x02\x03\x04\x05")
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            assert variables == {}
        finally:
            os.unlink(temp_path)

    def test_extremely_nested_structure(self):
        """Test parsing extremely nested type structures."""
        nested_content = """
variable "deeply_nested" {
  type = object({
    level1 = object({
      level2 = object({
        level3 = object({
          level4 = object({
            level5 = object({
              level6 = string
            })
          })
        })
      })
    })
  })
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(nested_content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            assert "deeply_nested" in variables
            # Should handle deep nesting gracefully
            assert variables["deeply_nested"].type is not None
        finally:
            os.unlink(temp_path)

    def test_malformed_object_syntax(self):
        """Test malformed object type syntax."""
        malformed_content = """
variable "malformed_object" {
  type = object({
    name = string
    age = number
    # Missing closing parenthesis and brace
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(malformed_content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            # Should handle gracefully and either parse what it can or return empty
            assert isinstance(variables, dict)
        finally:
            os.unlink(temp_path)

    def test_invalid_type_definitions(self):
        """Test various invalid type definitions."""
        invalid_types_content = """
variable "invalid_type1" {
  type = unknown_type
}

variable "invalid_type2" {
  type = list(unknown_element_type)
}

variable "invalid_type3" {
  type = map(invalid_value_type)
}

variable "invalid_type4" {
  type = object({
    field = invalid_field_type
  })
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(invalid_types_content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            # Should parse what it can and handle invalid types gracefully
            assert isinstance(variables, dict)
            for var_name in [
                "invalid_type1",
                "invalid_type2",
                "invalid_type3",
                "invalid_type4",
            ]:
                if var_name in variables:
                    # Should have some type assigned (likely AnyType as fallback)
                    assert variables[var_name].type is not None
        finally:
            os.unlink(temp_path)

    def test_unicode_and_special_characters(self):
        """Test handling of Unicode and special characters."""
        unicode_content = """
variable "unicode_test" {
  description = "Testing with emojis and special characters"
  type = string
  default = "Hello World"
}

variable "special_chars" {
  description = "Testing with special chars"
  type = string
}
"""
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".tf", delete=False, encoding="utf-8"
        ) as f:
            f.write(unicode_content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            assert "unicode_test" in variables
            assert "special_chars" in variables

            unicode_var = variables["unicode_test"]
            assert "emojis" in unicode_var.description
            assert unicode_var.default == "Hello World"
        finally:
            os.unlink(temp_path)

    @patch("builtins.open", side_effect=PermissionError("Permission denied"))
    def test_file_permission_error(self, mock_file):
        """Test handling of file permission errors."""
        parser = TerraformVariablesParser("permission_denied.tf")
        variables = parser.parse()
        assert variables == {}

    @patch("builtins.open", side_effect=OSError("Disk full"))
    def test_file_os_error(self, mock_file):
        """Test handling of OS errors when reading files."""
        parser = TerraformVariablesParser("os_error.tf")
        variables = parser.parse()
        assert variables == {}

    def test_circular_references_in_types(self):
        """Test handling of potentially circular type references."""
        circular_content = """
variable "circular_ref" {
  type = object({
    self_ref = object({
      inner = object({
        back_ref = string
      })
    })
  })
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(circular_content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()
            assert "circular_ref" in variables
            # Should handle without infinite recursion
            assert variables["circular_ref"].type is not None
        finally:
            os.unlink(temp_path)


class TestCLIErrorHandling:
    """Test CLI error handling scenarios."""

    def test_cli_nonexistent_file(self, capsys):
        """Test CLI with non-existent file."""
        with patch.object(sys, "argv", ["terraform-parser", "nonexistent_file.tf"]):
            with pytest.raises(SystemExit) as exc_info:
                main()

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "not found" in captured.err

    def test_cli_invalid_format_argument(self, capsys):
        """Test CLI with invalid format argument."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write('variable "test" { type = string }')
            temp_path = f.name

        try:
            with patch.object(
                sys,
                "argv",
                ["terraform-parser", temp_path, "--format", "invalid_format"],
            ):
                with pytest.raises(SystemExit) as exc_info:
                    main()

            # Should exit with error code
            assert exc_info.value.code != 0
        finally:
            os.unlink(temp_path)

    def test_cli_file_permission_error(self, capsys):
        """Test CLI with file permission error."""
        # Create a file and then remove read permissions
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write('variable "test" { type = string }')
            temp_path = f.name

        try:
            # Remove read permissions
            os.chmod(temp_path, 0o000)

            with patch.object(sys, "argv", ["terraform-parser", temp_path]):
                # CLI handles permission errors gracefully, doesn't exit
                main()

            captured = capsys.readouterr()
            assert (
                "Error parsing" in captured.out or "Permission denied" in captured.out
            )
        finally:
            # Restore permissions before cleanup
            os.chmod(temp_path, 0o644)
            os.unlink(temp_path)

    def test_cli_exception_handling(self, capsys):
        """Test general exception handling in CLI."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write("invalid syntax {{{")
            temp_path = f.name

        try:
            with patch.object(sys, "argv", ["terraform-parser", temp_path]):
                # CLI handles parsing errors gracefully, doesn't exit
                main()

            captured = capsys.readouterr()
            assert "Error parsing" in captured.out
        finally:
            os.unlink(temp_path)

    @patch("sys.argv", ["terraform-parser", "--help"])
    def test_cli_help_exit(self):
        """Test that help flag causes proper exit."""
        with pytest.raises(SystemExit) as exc_info:
            main()

        # Help should exit with code 0
        assert exc_info.value.code == 0

    @patch("sys.argv", ["terraform-parser", "--version"])
    def test_cli_version_exit(self):
        """Test that version flag causes proper exit."""
        with pytest.raises(SystemExit) as exc_info:
            main()

        # Version should exit with code 0
        assert exc_info.value.code == 0


class TestComplexTypeEdgeCases:
    """Test complex type parsing edge cases."""

    def test_malformed_interpolated_strings(self):
        """Test malformed interpolated string parsing."""
        content = """
variable "malformed_interpolation" {
  type = object({
    field1 = "${{invalid_syntax"
    field2 = "normal_string"
    field3 = "${unclosed_interpolation"
  })
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            # Should handle malformed interpolations gracefully
            if "malformed_interpolation" in variables:
                var = variables["malformed_interpolation"]
                assert var.type is not None
        finally:
            os.unlink(temp_path)

    def test_deeply_nested_collections(self):
        """Test deeply nested collection types."""
        content = """
variable "nested_collections" {
  type = list(map(set(list(object({
    deeply_nested = map(list(string))
  })))))
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            assert "nested_collections" in variables
            var = variables["nested_collections"]
            assert var.type is not None
            # Should be a ListType containing nested structures
            assert hasattr(var.type, "element_type") or hasattr(var.type, "type_name")
        finally:
            os.unlink(temp_path)

    def test_empty_object_and_tuple_types(self):
        """Test empty object and tuple type definitions."""
        content = """
variable "empty_object" {
  type = object({})
}

variable "empty_tuple" {
  type = tuple([])
}

variable "empty_list" {
  type = list()
}

variable "empty_map" {
  type = map()
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            for var_name in ["empty_object", "empty_tuple", "empty_list", "empty_map"]:
                assert var_name in variables
                var = variables[var_name]
                assert var.type is not None
        finally:
            os.unlink(temp_path)

    def test_mixed_type_syntax(self):
        """Test mixing different type definition syntaxes."""
        content = """
variable "mixed_syntax" {
  type = object({
    string_field = string
    list_field = list(string)
    map_field = map(number)
    nested_object = object({
      inner_field = any
    })
    tuple_field = tuple([string, number, bool])
  })
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            variables = parser.parse()

            assert "mixed_syntax" in variables
            var = variables["mixed_syntax"]
            assert var.type is not None

            # Should successfully parse the complex mixed type
            type_dict = var.to_dict()
            assert type_dict["type"] is not None
        finally:
            os.unlink(temp_path)


class TestParserFormatMethods:
    """Test the to_format and serialization methods."""

    def test_to_format_invalid_format(self):
        """Test to_format method with invalid format."""
        parser = TerraformVariablesParser("dummy.tf")

        with pytest.raises(ValueError) as exc_info:
            parser.to_format("invalid_format")

        assert "Unsupported format" in str(exc_info.value)
        assert "invalid_format" in str(exc_info.value)

    def test_to_format_with_empty_variables(self):
        """Test to_format methods with empty variables."""
        parser = TerraformVariablesParser("dummy.tf")
        parser.variables = {}  # Empty variables

        # Should not raise errors
        json_output = parser.to_format("json")
        yaml_output = parser.to_format("yaml")

        assert json_output == "{}"
        assert yaml_output == "{}\n"

    def test_yaml_serialization_edge_cases(self):
        """Test YAML serialization with edge case values."""
        content = """
variable "edge_cases" {
  type = object({
    null_value = any
    boolean_true = bool
    boolean_false = bool
    empty_string = string
    number_zero = number
  })
  default = {
    null_value = null
    boolean_true = true
    boolean_false = false
    empty_string = ""
    number_zero = 0
  }
}
"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            parser.parse()

            # Test YAML output with edge case values
            yaml_output = parser.to_yaml()
            assert yaml_output is not None
            assert len(yaml_output) > 0

            # Should handle null, boolean, and zero values correctly
            assert "edge_cases" in yaml_output
        finally:
            os.unlink(temp_path)


if __name__ == "__main__":
    pytest.main([__file__])
