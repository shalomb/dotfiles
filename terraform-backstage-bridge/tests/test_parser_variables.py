#!/usr/bin/env python3
"""
Integration tests for TerraformVariablesParser class methods and edge cases.

This file focuses on testing parser methods and integration scenarios
rather than individual parsing logic, which is now covered by fixtures.
"""

import os
import tempfile

from terraform_parser import TerraformVariablesParser


class TestTerraformVariablesParser:
    """Test the TerraformVariablesParser class methods and integration scenarios"""

    def create_temp_tf_file(self, content: str) -> str:
        """Helper method to create a temporary .tf file with given content"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            return f.name

    def test_get_variable_method(self):
        """Test the get_variable method"""
        tf_content = """
variable "test_var" {
  type    = string
  default = "test"
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            parser.parse()

            # Test getting existing variable
            var = parser.get_variable("test_var")
            assert var is not None
            assert var.name == "test_var"

            # Test getting non-existent variable
            var = parser.get_variable("non_existent")
            assert var is None

        finally:
            os.unlink(temp_file)

    def test_list_variables_method(self):
        """Test the list_variables method"""
        tf_content = """
variable "var1" {
  type = string
}

variable "var2" {
  type = number
}

variable "var3" {
  type = bool
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            parser.parse()

            var_names = parser.list_variables()
            assert len(var_names) == 3
            assert "var1" in var_names
            assert "var2" in var_names
            assert "var3" in var_names

        finally:
            os.unlink(temp_file)

    def test_to_json_method(self):
        """Test the to_json method"""
        tf_content = """
variable "test_var" {
  type        = string
  default     = "test"
  description = "Test variable"
}
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            parser.parse()

            json_output = parser.to_json()

            # Basic validation that it's valid JSON and contains expected fields
            import json

            data = json.loads(json_output)

            assert "test_var" in data
            var_data = data["test_var"]
            assert var_data["name"] == "test_var"
            assert var_data["description"] == "Test variable"
            assert var_data["default"] == "test"
            assert var_data["sensitive"] is False
            assert var_data["nullable"] is True

        finally:
            os.unlink(temp_file)

    def test_parse_empty_file(self):
        """Test parsing an empty terraform file"""
        tf_content = """
# This file has no variables
"""
        temp_file = self.create_temp_tf_file(tf_content)
        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()

            assert len(variables) == 0
            assert variables == {}

        finally:
            os.unlink(temp_file)

    def test_parse_invalid_file(self):
        """Test parsing a file that doesn't exist"""
        parser = TerraformVariablesParser("/path/that/does/not/exist.tf")
        variables = parser.parse()

        # Should return empty dict and not raise exception
        assert variables == {}

    def test_to_yaml_output(self):
        """Test YAML output format"""
        tf_content = """
variable "environment" {
  type    = string
  default = "dev"
  description = "Environment name"
}

variable "instance_count" {
  type    = number
  default = 1
  description = "Number of instances"
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            parser = TerraformVariablesParser(temp_file)
            parser.parse()

            # Test YAML output
            yaml_output = parser.to_yaml()

            # Verify it's valid YAML
            import yaml

            parsed_yaml = yaml.safe_load(yaml_output)

            # Check structure
            assert "environment" in parsed_yaml
            assert "instance_count" in parsed_yaml

            # Check environment variable
            env_var = parsed_yaml["environment"]
            assert env_var["type"] == "string"
            assert env_var["default"] == "dev"
            assert env_var["description"] == "Environment name"

            # Check instance_count variable
            count_var = parsed_yaml["instance_count"]
            assert count_var["type"] == "number"
            assert count_var["default"] == 1
            assert count_var["description"] == "Number of instances"

        finally:
            os.unlink(temp_file)

    def test_to_yaml_complex_types(self):
        """Test YAML output with complex types"""
        tf_content = """
variable "tags" {
  type = map(string)
  default = {
    Environment = "dev"
    Project     = "test"
  }
  description = "Resource tags"
}

variable "subnets" {
  type = list(object({
    name = string
    cidr = string
  }))
  description = "List of subnet configurations"
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            parser = TerraformVariablesParser(temp_file)
            parser.parse()

            yaml_output = parser.to_yaml()

            # Verify it's valid YAML
            import yaml

            parsed_yaml = yaml.safe_load(yaml_output)

            # Check tags variable
            assert "tags" in parsed_yaml
            tags_var = parsed_yaml["tags"]
            assert tags_var["type_class"] == "MapType"
            assert tags_var["default"] == {"Environment": "dev", "Project": "test"}

            # Check subnets variable
            assert "subnets" in parsed_yaml
            subnets_var = parsed_yaml["subnets"]
            assert subnets_var["type_class"] == "ListType"

        finally:
            os.unlink(temp_file)

    def test_to_format_method(self):
        """Test the generic to_format method"""
        tf_content = """
variable "test_var" {
  type    = string
  default = "test"
  description = "Test variable"
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            parser = TerraformVariablesParser(temp_file)
            parser.parse()

            # Test JSON format
            json_output = parser.to_format("json")
            import json

            parsed_json = json.loads(json_output)
            assert "test_var" in parsed_json

            # Test YAML format
            yaml_output = parser.to_format("yaml")
            import yaml

            parsed_yaml = yaml.safe_load(yaml_output)
            assert "test_var" in parsed_yaml

            # Test invalid format
            try:
                parser.to_format("xml")
                raise AssertionError("Should have raised ValueError")
            except ValueError as e:
                assert "Unsupported format" in str(e)

        finally:
            os.unlink(temp_file)

    def test_yaml_output_sorted(self):
        """Test that YAML output is sorted by keys"""
        tf_content = """
variable "zebra" {
  type = string
}

variable "alpha" {
  type = string
}

variable "beta" {
  type = string
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            parser = TerraformVariablesParser(temp_file)
            parser.parse()

            yaml_output = parser.to_yaml()

            # Check that keys appear in sorted order
            lines = yaml_output.strip().split("\n")
            key_lines = [line for line in lines if line and not line.startswith(" ")]

            # Extract variable names from the key lines
            var_names = []
            for line in key_lines:
                if ":" in line:
                    var_name = line.split(":")[0].strip()
                    var_names.append(var_name)

            # Should be sorted
            assert var_names == sorted(var_names)

        finally:
            os.unlink(temp_file)

    def test_variables_single_dictionary_format(self):
        """Test parsing variables in single dictionary format."""
        tf_content = """
variable "single_var" {
  type = string
  description = "A single test variable"
  default = "test"
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            # Parse the file normally - this exercises the single dict path
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()

            # Verify the variable was parsed correctly
            assert len(variables) == 1
            assert "single_var" in variables
            assert variables["single_var"].type.type_name == "string"
            assert variables["single_var"].default == "test"

        finally:
            os.unlink(temp_file)

    def test_type_inference_edge_cases(self):
        """Test type inference from default values with comprehensive cases."""
        test_cases = [
            # Basic types
            ({"default": "string_value"}, "PrimitiveType"),
            ({"default": True}, "PrimitiveType"),
            ({"default": 42}, "PrimitiveType"),
            ({"default": 3.14}, "PrimitiveType"),
            # Collections
            ({"default": []}, "ListType"),
            ({"default": ["str1", "str2"]}, "ListType"),
            ({"default": [True, False]}, "ListType"),
            ({"default": [1, 2, 3]}, "ListType"),
            ({"default": {}}, "MapType"),
            ({"default": {"key": "value"}}, "MapType"),
            ({"default": {"key": True}}, "MapType"),
            ({"default": {"key": 42}}, "MapType"),
        ]

        for var_def, expected_type in test_cases:
            from terraform_parser.parser import TerraformVariable

            var = TerraformVariable("test", var_def)
            assert var.type.__class__.__name__ == expected_type

    def test_comprehensive_variable_attributes(self):
        """Test variable with all possible attributes."""
        tf_content = """
variable "comprehensive_variable" {
  description = "A comprehensive variable with all attributes"
  type = object({
    string_field = string
    number_field = number
    bool_field = bool
  })
  default = {
    string_field = "default_string"
    number_field = 42
    bool_field = true
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
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()

            assert "comprehensive_variable" in variables
            var = variables["comprehensive_variable"]

            # Test all attributes
            assert var.type is not None
            assert var.description is not None
            assert var.default is not None
            assert var.sensitive is True
            assert len(var.validation) == 2

            # Test serialization methods
            var_dict = var.to_dict()
            assert all(
                key in var_dict
                for key in ["type", "description", "default", "sensitive", "validation"]
            )

            # Test parser output methods
            json_output = parser.to_json()
            yaml_output = parser.to_yaml()
            assert all(
                "comprehensive_variable" in output
                for output in [json_output, yaml_output]
            )

        finally:
            os.unlink(temp_file)
