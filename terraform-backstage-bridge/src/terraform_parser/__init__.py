"""
Terraform Parser Library

A Python library for parsing Terraform variables.tf files using python-hcl2.
Provides comprehensive support for all Terraform variable types including
primitives, collections, and structural types.
"""

from .parser import (
    AnyType,
    ListType,
    MapType,
    ObjectType,
    OptionalType,
    PrimitiveType,
    SetType,
    TerraformType,
    TerraformVariable,
    TerraformVariablesParser,
    TupleType,
)

__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

# Public API
__all__ = [
    "TerraformType",
    "PrimitiveType",
    "ListType",
    "SetType",
    "MapType",
    "ObjectType",
    "TupleType",
    "AnyType",
    "OptionalType",
    "TerraformVariable",
    "TerraformVariablesParser",
]


def main():
    """Main entry point for CLI usage."""
    import argparse
    import sys
    from pathlib import Path

    parser = argparse.ArgumentParser(description="Parse Terraform variables.tf files")
    parser.add_argument(
        "file", nargs="?", help="Path to the Terraform variables.tf file to parse"
    )
    parser.add_argument(
        "--building-blocks",
        help="Glob pattern for building block directories (e.g., 'bbs/terraform-aws-*')",
    )
    parser.add_argument(
        "--format",
        choices=["json", "yaml", "harness", "summary"],
        default="summary",
        help="Output format (default: summary)",
    )
    # Keep --output for backward compatibility (deprecated)
    parser.add_argument(
        "--output",
        choices=["json", "summary"],
        help="Output format (deprecated, use --format)",
    )
    parser.add_argument(
        "--version", action="version", version=f"terraform-parser {__version__}"
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.file and not args.building_blocks:
        print("Error: Must specify either file or --building-blocks", file=sys.stderr)
        parser.print_help()
        sys.exit(2)

    if args.file and args.building_blocks:
        print("Error: Cannot specify both file and --building-blocks", file=sys.stderr)
        parser.print_help()
        sys.exit(2)

    # Handle backward compatibility for --output flag
    output_format = args.format
    if args.output:
        output_format = args.output
        import warnings

        warnings.warn(
            "--output is deprecated, use --format instead",
            DeprecationWarning,
            stacklevel=2,
        )

    try:
        # Import TerraformVariablesParser for both modes
        from .parser import TerraformVariablesParser

        if args.building_blocks:
            # Multiple building block mode
            import glob

            # Find all building block directories
            bb_dirs = glob.glob(args.building_blocks)
            if not bb_dirs:
                print(
                    f"Error: No directories found matching pattern '{args.building_blocks}'",
                    file=sys.stderr,
                )
                sys.exit(1)

            building_blocks = {}
            for bb_dir in bb_dirs:
                bb_path = Path(bb_dir)
                if not bb_path.is_dir():
                    continue

                # Look for variables.tf in the directory
                variables_file = bb_path / "variables.tf"
                if not variables_file.exists():
                    print(
                        f"Warning: No variables.tf found in {bb_dir}", file=sys.stderr
                    )
                    continue

                # Extract building block name from directory
                bb_name = bb_path.name

                # Parse the variables file
                tf_parser = TerraformVariablesParser(variables_file)
                variables = tf_parser.parse()
                building_blocks[bb_name] = {
                    "parser": tf_parser,
                    "variables": variables,
                    "path": str(variables_file),
                }

            if not building_blocks:
                print("Error: No valid building blocks found", file=sys.stderr)
                sys.exit(1)

            if output_format == "harness":
                # Generate comprehensive Harness IDP template
                from .parser import generate_multi_building_block_harness

                print(generate_multi_building_block_harness(building_blocks))
            else:
                print(f"Found {len(building_blocks)} building blocks:")
                for bb_name, bb_data in building_blocks.items():
                    print(f"• {bb_name}: {len(bb_data['variables'])} variables")

        else:
            # Single file mode (existing behavior)
            terraform_file = Path(args.file)
            if not terraform_file.exists():
                print(f"Error: File '{terraform_file}' not found", file=sys.stderr)
                sys.exit(1)

            # Parse the file
            tf_parser = TerraformVariablesParser(terraform_file)
            variables = tf_parser.parse()

            if output_format in ["json", "yaml", "harness"]:
                if output_format == "harness":
                    # Use the new to_harness method
                    print(tf_parser.to_harness())
                else:
                    # Convert variables to serializable format using to_dict method
                    output = {}
                    for name, var in variables.items():
                        output[name] = var.to_dict()

                    if output_format == "json":
                        import json

                        print(json.dumps(output, indent=2))
                    elif output_format == "yaml":
                        import yaml

                        print(
                            yaml.dump(output, default_flow_style=False, sort_keys=True)
                        )
            else:
                # Summary output
                print(f"Parsed {len(variables)} variables from {terraform_file}")
                print("-" * 50)
                for name, var in variables.items():
                    print(f"• {name}: {var.type}")
                    if var.description:
                        print(f"  Description: {var.description}")
                    if var.default is not None:
                        print(f"  Default: {var.default}")
                    print()

    except Exception as e:
        print(f"Error parsing file: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
