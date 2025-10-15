#!/usr/bin/env python3
"""
CLI tests for terraform-parser command-line interface
"""

import json
import os
import subprocess
import sys
import tempfile
from unittest.mock import patch

import pytest
import yaml


class TestCLI:
    """Test the command-line interface functionality"""

    def create_temp_tf_file(self, content: str) -> str:
        """Helper method to create a temporary .tf file with given content"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".tf", delete=False) as f:
            f.write(content)
            return f.name

    def run_cli(self, args: list[str]) -> tuple[int, str, str]:
        """Run the CLI and return (returncode, stdout, stderr)"""
        try:
            result = subprocess.run(
                ["uv", "run", "terraform-parser"] + args,
                capture_output=True,
                text=True,
                timeout=30,
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return 1, "", "Command timed out"

    def test_cli_version(self):
        """Test --version flag"""
        returncode, stdout, stderr = self.run_cli(["--version"])
        assert returncode == 0
        assert "terraform-parser" in stdout
        assert "0.1.0" in stdout

    def test_cli_help(self):
        """Test --help flag"""
        returncode, stdout, stderr = self.run_cli(["--help"])
        assert returncode == 0
        assert "Parse Terraform variables.tf files" in stdout
        assert "--format" in stdout
        assert "json" in stdout
        assert "yaml" in stdout
        assert "summary" in stdout

    def test_cli_json_output(self):
        """Test JSON output format"""
        tf_content = """
variable "environment" {
  type    = string
  default = "dev"
  description = "Environment name"
}

variable "instance_count" {
  type    = number
  default = 1
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            returncode, stdout, stderr = self.run_cli([temp_file, "--format", "json"])
            assert returncode == 0
            assert stderr == ""

            # Parse JSON output
            output = json.loads(stdout)
            assert "environment" in output
            assert "instance_count" in output

            # Check environment variable
            env_var = output["environment"]
            assert env_var["type"] == "string"
            assert env_var["default"] == "dev"
            assert env_var["description"] == "Environment name"

        finally:
            os.unlink(temp_file)

    def test_cli_yaml_output(self):
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
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            returncode, stdout, stderr = self.run_cli([temp_file, "--format", "yaml"])
            assert returncode == 0
            assert stderr == ""

            # Parse YAML output
            output = yaml.safe_load(stdout)
            assert "environment" in output
            assert "instance_count" in output

            # Check environment variable
            env_var = output["environment"]
            assert env_var["type"] == "string"
            assert env_var["default"] == "dev"
            assert env_var["description"] == "Environment name"

        finally:
            os.unlink(temp_file)

    def test_cli_harness_output(self):
        """Test Harness output format"""
        tf_content = """
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
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            returncode, stdout, stderr = self.run_cli(
                [temp_file, "--format", "harness"]
            )
            assert returncode == 0
            assert stderr == ""

            # Parse YAML output to verify Harness structure
            harness_template = yaml.safe_load(stdout)

            # Verify basic Harness template structure
            assert harness_template["apiVersion"] == "scaffolder.backstage.io/v1beta3"
            assert harness_template["kind"] == "Template"
            assert "metadata" in harness_template
            assert "spec" in harness_template

            # Verify parameters
            spec = harness_template["spec"]
            assert "parameters" in spec
            parameters = spec["parameters"][0]
            properties = parameters["properties"]

            # Verify resources parameter structure
            assert "resources" in properties
            resources_param = properties["resources"]
            assert resources_param["type"] == "array"
            assert "items" in resources_param

            # Get the properties from the array items
            item_properties = resources_param["items"]["properties"]

            # Check environment variable with enum detection
            assert "environment" in item_properties
            env_var = item_properties["environment"]
            assert env_var["type"] == "string"
            assert env_var["default"] == "dev"
            assert "enum" in env_var  # Should auto-detect environment enum
            assert "dev" in env_var["enum"]

            # Check instance_count variable
            assert "instance_count" in item_properties
            count_var = item_properties["instance_count"]
            assert count_var["type"] == "number"
            assert count_var["default"] == 1

        finally:
            os.unlink(temp_file)

    def test_cli_summary_output(self):
        """Test summary output format (default)"""
        tf_content = """
variable "environment" {
  type    = string
  default = "dev"
  description = "Environment name"
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            returncode, stdout, stderr = self.run_cli([temp_file])
            assert returncode == 0
            assert stderr == ""

            # Check summary format
            assert "Parsed 1 variables" in stdout
            assert "environment: PrimitiveType" in stdout
            assert "Description: Environment name" in stdout
            assert "Default: dev" in stdout

        finally:
            os.unlink(temp_file)

    def test_cli_backward_compatibility_output_flag(self):
        """Test backward compatibility with --output flag"""
        tf_content = """
variable "test" {
  type = string
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            returncode, stdout, stderr = self.run_cli([temp_file, "--output", "json"])
            assert returncode == 0
            # Should work but show deprecation warning
            assert "deprecated" in stderr.lower() or "deprecated" in stdout.lower()

            # Parse JSON output
            output = json.loads(stdout)
            assert "test" in output

        finally:
            os.unlink(temp_file)

    def test_cli_file_not_found(self):
        """Test error handling for non-existent file"""
        returncode, stdout, stderr = self.run_cli(["/path/that/does/not/exist.tf"])
        assert returncode == 1
        assert "not found" in stderr

    def test_cli_invalid_format(self):
        """Test error handling for invalid format"""
        tf_content = """
variable "test" {
  type = string
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            returncode, stdout, stderr = self.run_cli([temp_file, "--format", "xml"])
            assert returncode == 2  # argparse error
            assert "invalid choice" in stderr

        finally:
            os.unlink(temp_file)

    def test_cli_exception_in_main(self):
        """Test exception handling in main function"""
        # Create a file that will cause a parsing exception
        tf_content = """
variable "test" {
  # Malformed content that might cause issues
  type = invalid_syntax_here
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            # Should handle exceptions gracefully
            returncode, stdout, stderr = self.run_cli([temp_file])
            # Should either succeed (parsing what it can) or fail gracefully
            assert returncode in [0, 1]  # Success or controlled failure
        finally:
            os.unlink(temp_file)

    def test_cli_with_permission_denied_file(self):
        """Test CLI with file permission issues"""
        tf_content = """
variable "test" {
  type = string
}
"""
        temp_file = self.create_temp_tf_file(tf_content)

        try:
            # Remove read permissions
            os.chmod(temp_file, 0o000)

            returncode, stdout, stderr = self.run_cli([temp_file])
            # CLI gracefully handles permission errors and continues
            assert returncode == 0
            assert "Error parsing" in stdout and "Permission denied" in stdout
            assert "Parsed 0 variables" in stdout

        finally:
            # Restore permissions before cleanup
            os.chmod(temp_file, 0o644)
            os.unlink(temp_file)

    def test_cli_main_without_args(self):
        """Test main function behavior with various argument scenarios"""
        from terraform_parser import main

        # Test with no arguments (should show help)
        with patch.object(sys, "argv", ["terraform-parser"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 2  # argparse error for missing required arg

    def test_cli_directory_instead_of_file(self):
        """Test CLI when given a directory instead of a file"""
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            returncode, stdout, stderr = self.run_cli([temp_dir])
            # CLI gracefully handles directory errors and continues
            assert returncode == 0
            assert "Error parsing" in stdout and "Is a directory" in stdout
            assert "Parsed 0 variables" in stdout

    def test_cli_complex_yaml_output(self):
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
            returncode, stdout, stderr = self.run_cli([temp_file, "--format", "yaml"])
            assert returncode == 0
            assert stderr == ""

            # Parse YAML output
            output = yaml.safe_load(stdout)

            # Check tags variable
            assert "tags" in output
            tags_var = output["tags"]
            assert tags_var["type_class"] == "MapType"
            assert tags_var["default"] == {"Environment": "dev", "Project": "test"}

            # Check subnets variable
            assert "subnets" in output
            subnets_var = output["subnets"]
            assert subnets_var["type_class"] == "ListType"

        finally:
            os.unlink(temp_file)

    def test_cli_yaml_is_sorted(self):
        """Test that YAML CLI output is sorted"""
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
            returncode, stdout, stderr = self.run_cli([temp_file, "--format", "yaml"])
            assert returncode == 0

            # Check that output starts with 'alpha' (first alphabetically)
            lines = stdout.strip().split("\n")
            first_var_line = next(
                line
                for line in lines
                if line and not line.startswith(" ") and ":" in line
            )
            assert first_var_line.startswith("alpha:")

        finally:
            os.unlink(temp_file)

    def test_cli_error_conditions(self):
        """Test various CLI error conditions."""
        from io import StringIO
        from unittest.mock import patch

        # Test both file and building-blocks specified
        with patch(
            "sys.argv", ["terraform-parser", "test.tf", "--building-blocks", "bbs/*"]
        ):
            with patch("sys.stderr", new=StringIO()) as mock_stderr:
                with pytest.raises(SystemExit) as exc_info:
                    from terraform_parser import main

                    main()
                assert exc_info.value.code == 2
                assert (
                    "Cannot specify both file and --building-blocks"
                    in mock_stderr.getvalue()
                )

        # Test neither file nor building-blocks specified
        with patch("sys.argv", ["terraform-parser"]):
            with patch("sys.stderr", new=StringIO()) as mock_stderr:
                with pytest.raises(SystemExit) as exc_info:
                    from terraform_parser import main

                    main()
                assert exc_info.value.code == 2
                assert (
                    "Must specify either file or --building-blocks"
                    in mock_stderr.getvalue()
                )

    def test_cli_building_blocks_edge_cases(self):
        """Test building blocks functionality edge cases."""
        from io import StringIO
        from pathlib import Path
        from unittest.mock import patch

        # Test no matching directories
        with patch(
            "sys.argv",
            ["terraform-parser", "--building-blocks", "nonexistent/pattern/*"],
        ):
            with patch("glob.glob", return_value=[]):
                with patch("sys.stderr", new=StringIO()) as mock_stderr:
                    with pytest.raises(SystemExit) as exc_info:
                        from terraform_parser import main

                        main()
                    assert exc_info.value.code == 1
                    assert (
                        "No directories found matching pattern"
                        in mock_stderr.getvalue()
                    )

        # Test directories without variables.tf files
        with tempfile.TemporaryDirectory() as temp_dir:
            bb_dir = Path(temp_dir) / "test-bb"
            bb_dir.mkdir()

            with patch(
                "sys.argv", ["terraform-parser", "--building-blocks", f"{temp_dir}/*"]
            ):
                with patch("sys.stderr", new=StringIO()) as mock_stderr:
                    with pytest.raises(SystemExit) as exc_info:
                        from terraform_parser import main

                        main()
                    assert exc_info.value.code == 1
                    assert "No valid building blocks found" in mock_stderr.getvalue()

    def test_cli_deprecated_output_flag(self):
        """Test that --output flag generates deprecation warning."""
        from io import StringIO
        from unittest.mock import patch

        temp_file = self.create_temp_tf_file('variable "test" { type = string }')

        try:
            with patch("sys.argv", ["terraform-parser", temp_file, "--output", "json"]):
                with patch("warnings.warn") as mock_warn:
                    with patch("sys.stdout", new=StringIO()):
                        from terraform_parser import main

                        main()
                    mock_warn.assert_called_once()
                    assert "--output is deprecated" in str(mock_warn.call_args)
        finally:
            os.unlink(temp_file)
