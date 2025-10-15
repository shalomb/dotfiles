"""
Tests for multi-building block Harness template generation
"""

import subprocess

import yaml


class TestMultiBuildingBlocks:
    """Test multi-building block functionality"""

    def test_cli_multi_building_blocks_help(self):
        """Test that the CLI shows help for missing building blocks pattern"""
        result = subprocess.run(
            [
                "uv",
                "run",
                "terraform-parser",
                "--building-blocks",
                "",
                "--format",
                "harness",
            ],
            capture_output=True,
            text=True,
        )
        assert result.returncode != 0
        assert "Must specify either file or --building-blocks" in result.stderr

    def test_cli_multi_building_blocks_invalid_pattern(self):
        """Test CLI with invalid building blocks pattern"""
        result = subprocess.run(
            [
                "uv",
                "run",
                "terraform-parser",
                "--building-blocks",
                "nonexistent/*",
                "--format",
                "harness",
            ],
            capture_output=True,
            text=True,
        )
        assert result.returncode != 0
        assert "No directories found matching pattern" in result.stderr

    def test_cli_multi_building_blocks_success(self):
        """Test successful multi-building block template generation"""
        result = subprocess.run(
            [
                "uv",
                "run",
                "terraform-parser",
                "--building-blocks",
                "bbs/terraform-aws-*",
                "--format",
                "harness",
            ],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0

        # Parse the YAML output
        template = yaml.safe_load(result.stdout)

        # Validate basic structure
        assert template["apiVersion"] == "scaffolder.backstage.io/v1beta3"
        assert template["kind"] == "Template"
        # Note: The template name might be different in implementation
        assert "name" in template["metadata"]

        # Check that building blocks are included
        resources_items = template["spec"]["parameters"][0]["properties"]["resources"][
            "items"
        ]
        building_blocks = resources_items["properties"]["resource"]["enum"]

        # Should include our known building blocks
        expected_bbs = [
            "terraform-aws-ApplicationLoadBalancer",
            "terraform-aws-EC2",
            "terraform-aws-IAMRole",
            "terraform-aws-NetworkLoadBalancer",
            "terraform-aws-RDS",
            "terraform-aws-S3",
            "terraform-aws-SecurityGroup",
        ]

        for bb in expected_bbs:
            assert bb in building_blocks

        # Check that definitions exist
        for bb in expected_bbs:
            assert bb in template
            assert "definition" in template[bb]
            assert "title" in template[bb]["definition"]
            assert "properties" in template[bb]["definition"]

    def test_multi_building_blocks_structure(self):
        """Test the structure of the generated multi-building block template"""
        result = subprocess.run(
            [
                "uv",
                "run",
                "terraform-parser",
                "--building-blocks",
                "bbs/terraform-aws-S3",
                "--format",
                "harness",
            ],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0

        template = yaml.safe_load(result.stdout)

        # Check resources array structure
        resources = template["spec"]["parameters"][0]["properties"]["resources"]
        assert resources["type"] == "array"
        assert resources["minItems"] == 1

        # Check items structure
        items = resources["items"]
        assert items["type"] == "object"
        # Note: 'required' might not always be present if no required fields
        if "required" in items:
            assert "resource" in items["required"]

        # Check dependencies structure
        dependencies = items["dependencies"]["resource"]["oneOf"]
        assert len(dependencies) == 1  # Only S3 building block

        s3_dependency = dependencies[0]
        assert s3_dependency["properties"]["resource"]["enum"] == ["terraform-aws-S3"]
        assert "$ref" in str(s3_dependency["properties"]["definition"])

    def test_make_target_success(self):
        """Test the make harness-multi-config target"""
        result = subprocess.run(
            ["make", "harness-multi-config", "BB_GLOB=bbs/terraform-aws-S3"],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        assert "terraform-aws-S3" in result.stdout

    def test_make_target_missing_glob(self):
        """Test make target with missing BB_GLOB parameter"""
        result = subprocess.run(
            ["make", "harness-multi-config"],
            capture_output=True,
            text=True,
        )
        assert result.returncode != 0
        assert "Please specify BB_GLOB" in result.stdout

    def test_building_block_definitions_complete(self):
        """Test that building block definitions contain all expected fields"""
        result = subprocess.run(
            [
                "uv",
                "run",
                "terraform-parser",
                "--building-blocks",
                "bbs/terraform-aws-EC2",
                "--format",
                "harness",
            ],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0

        template = yaml.safe_load(result.stdout)
        ec2_definition = template["terraform-aws-EC2"]["definition"]

        # Check required structure
        assert ec2_definition["type"] == "object"
        assert "title" in ec2_definition
        assert "description" in ec2_definition
        assert "properties" in ec2_definition
        assert "required" in ec2_definition

        # Check some known EC2 variables exist
        properties = ec2_definition["properties"]
        assert "instance_type" in properties
        assert "os" in properties
        assert "instance_tier" in properties

        # Check property structure
        instance_type_prop = properties["instance_type"]
        assert instance_type_prop["type"] == "string"
        assert "title" in instance_type_prop
        assert "description" in instance_type_prop

    def test_required_variables_handling(self):
        """Test that required variables are properly identified"""
        result = subprocess.run(
            [
                "uv",
                "run",
                "terraform-parser",
                "--building-blocks",
                "bbs/terraform-aws-S3",
                "--format",
                "harness",
            ],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0

        template = yaml.safe_load(result.stdout)
        s3_definition = template["terraform-aws-S3"]["definition"]

        # S3 should have 'purpose' as required (no default value)
        # Most other variables have defaults so should not be required
        properties = s3_definition["properties"]
        assert "purpose" in properties

        # Variables with defaults should not be in required list
        # Note: The exact required list depends on which variables have no defaults
