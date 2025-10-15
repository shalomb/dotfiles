"""
Tests for OptionalType integration and formatting behaviors.

This module tests integration behaviors like real-world fixtures, harness formatting,
and string representation. Basic parsing logic is covered by fixture-based tests.

Migration Status:
- Basic optional parsing logic → migrated to fixtures (3 test cases)
- Integration tests → preserved here (real-world fixtures, formatting, representation)
"""

import os
import tempfile

from terraform_parser import TerraformVariablesParser
from terraform_parser.parser import ListType, ObjectType, OptionalType, PrimitiveType


class TestOptionalTypes:
    """Test OptionalType integration and formatting behaviors."""

    def test_real_world_ebs_config(self):
        """Test parsing of the real-world additional_ebs_config variable."""
        # Define the terraform content inline
        terraform_content = """
variable "additional_ebs_config" {
  type = list(object({
    additional_ebs_volume_size = optional(number)
    additional_ebs_device_name = string
    additional_ebs_mount_point = string
    additional_ebs_iops        = optional(number)
    additional_ebs_type        = optional(string, "gp3")
    additional_ebs_throughput  = optional(number)
  }))
  description = "Configuration for additional EBS volumes with optional parameters"
  default     = []
}

variable "server_config_with_defaults" {
  type = object({
    name            = string
    port            = optional(number, 8080)
    ssl_enabled     = optional(bool, true)
    timeout         = optional(number, 30)
    protocol        = optional(string, "https")
    retries         = optional(number, 3)
  })
  description = "Server configuration with mixed type defaults"
  default = {
    name = "default-server"
  }
}

variable "database_connection_config" {
  type = object({
    host               = string
    port               = optional(number, 5432)
    database           = string
    username           = string
    ssl_mode           = optional(string, "require")
    connection_timeout = optional(number, 10)
    max_connections    = optional(number, 100)
    ssl_enabled        = optional(bool, true)
  })
  description = "Database connection configuration with defaults"
  default     = {}
}
"""

        # Create temporary file with the terraform content
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(terraform_content)
            temp_file = f.name

        try:
            parser = TerraformVariablesParser(temp_file)
            variables = parser.parse()

            var = variables["additional_ebs_config"]
            assert isinstance(var.type, ListType)
            assert isinstance(var.type.element_type, ObjectType)

            attributes = var.type.element_type.attributes

            # Check that additional_ebs_type has the default value "gp3"
            ebs_type = attributes["additional_ebs_type"]
            assert isinstance(ebs_type, OptionalType)
            assert isinstance(ebs_type.inner_type, PrimitiveType)
            assert ebs_type.inner_type.type_name == "string"
            assert ebs_type.has_default
            assert ebs_type.default_value == "gp3"

            # Check that other optional fields don't have defaults
            volume_size = attributes["additional_ebs_volume_size"]
            assert isinstance(volume_size, OptionalType)
            assert not volume_size.has_default

            iops = attributes["additional_ebs_iops"]
            assert isinstance(iops, OptionalType)
            assert not iops.has_default
        finally:
            # Clean up temporary file
            os.unlink(temp_file)

        throughput = attributes["additional_ebs_throughput"]
        assert isinstance(throughput, OptionalType)
        assert not throughput.has_default

    def test_harness_formatting_with_optional_defaults(self):
        """Test that harness formatter properly handles optional types with defaults."""
        tf_content = """
variable "test_object" {
  type = object({
    required_field = string
    optional_with_default = optional(string, "default_val")
    optional_without_default = optional(number)
  })
  description = "Test object with optional fields"
  default = {}
}
"""
        import tempfile

        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(tf_content)
            temp_path = f.name

        try:
            parser = TerraformVariablesParser(temp_path)
            # Parse variables (not used but needed for harness generation)
            parser.parse()

            # Generate harness output
            harness_output = parser.to_harness()

            # Parse the YAML to check structure
            import yaml

            harness_yaml = yaml.safe_load(harness_output)
            resources_properties = harness_yaml["spec"]["parameters"][0]["properties"][
                "resources"
            ]["items"]["properties"]

            test_object = resources_properties["test_object"]
            assert test_object["type"] == "object"
            assert "properties" in test_object

            # Check that the properties are properly mapped
            properties = test_object["properties"]

            # Required field should not have default
            required_field = properties["required_field"]
            assert required_field["type"] == "string"
            assert "default" not in required_field

            # Optional with default should have the default value
            optional_with_default = properties["optional_with_default"]
            assert optional_with_default["type"] == "string"
            assert optional_with_default["default"] == "default_val"

            # Optional without default should not have default
            optional_without_default = properties["optional_without_default"]
            assert optional_without_default["type"] == "number"
            assert "default" not in optional_without_default

        finally:
            import os

            os.unlink(temp_path)

    def test_optional_type_representation(self):
        """Test string representation of OptionalType."""
        # Test without default
        inner_type = PrimitiveType("string")
        optional_type = OptionalType(inner_type)

        assert str(optional_type) == "optional(string)"
        assert repr(optional_type) == "OptionalType(PrimitiveType('string'))"

        # Test with default
        optional_with_default = OptionalType(
            inner_type, "default_value", explicit_default=True
        )

        assert str(optional_with_default) == "optional(string, 'default_value')"
        assert (
            repr(optional_with_default)
            == "OptionalType(PrimitiveType('string'), default='default_value')"
        )
