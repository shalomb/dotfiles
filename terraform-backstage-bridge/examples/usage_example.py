#!/usr/bin/env python3
"""
Usage example showing different ways to use the Terraform Variables Parser
"""

import sys

sys.path.append("/tmp")

from terraform_parser import (
    ListType,
    MapType,
    ObjectType,
    PrimitiveType,
    TerraformVariablesParser,
)


def usage_examples():
    """Show various ways to use the parser"""

    # Basic usage
    parser = TerraformVariablesParser("/tmp/example_variables.tf")
    variables = parser.parse()

    print("=== Basic Usage ===")
    print(f"Found {len(variables)} variables")

    # Access specific variable
    if "server_config" in variables:
        server_var = variables["server_config"]
        print("\nServer config variable:")
        print(f"  Name: {server_var.name}")
        print(f"  Type: {server_var.type}")
        print(f"  Default: {server_var.default}")

    # Iterate through all variables
    print("\n=== All Variable Names ===")
    for name in parser.list_variables():
        print(f"- {name}")

    # Filter variables by type
    print("\n=== Variables by Type ===")

    primitive_vars = []
    object_vars = []
    list_vars = []
    map_vars = []

    for name, var in variables.items():
        if isinstance(var.type, PrimitiveType):
            primitive_vars.append(name)
        elif isinstance(var.type, ObjectType):
            object_vars.append(name)
        elif isinstance(var.type, ListType):
            list_vars.append(name)
        elif isinstance(var.type, MapType):
            map_vars.append(name)

    print(f"Primitive types: {primitive_vars}")
    print(f"Object types: {object_vars}")
    print(f"List types: {list_vars}")
    print(f"Map types: {map_vars}")

    # Analyze object types
    print("\n=== Object Type Analysis ===")
    for name, var in variables.items():
        if isinstance(var.type, ObjectType):
            print(f"\n{name}:")
            for attr_name, attr_type in var.type.attributes.items():
                print(f"  {attr_name}: {attr_type}")

    # Check for sensitive variables
    print("\n=== Sensitive Variables ===")
    sensitive_vars = [name for name, var in variables.items() if var.sensitive]
    print(f"Sensitive variables: {sensitive_vars}")

    # Check for variables with validation rules
    print("\n=== Variables with Validation ===")
    validated_vars = [name for name, var in variables.items() if var.validation]
    for name in validated_vars:
        var = variables[name]
        print(f"{name}: {len(var.validation)} validation rule(s)")
        for rule in var.validation:
            print(f"  - {rule.get('error_message', 'No message')}")


if __name__ == "__main__":
    usage_examples()
