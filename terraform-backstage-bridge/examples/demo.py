#!/usr/bin/env python3
"""
Demo script showing how to use the Terraform Variables Parser
"""

import sys

sys.path.append("/tmp")

from terraform_parser import (
    TerraformVariablesParser,
)


def demo():
    """Demonstrate the parser functionality"""

    # Parse the example variables.tf file
    parser = TerraformVariablesParser("/tmp/example_variables.tf")
    variables = parser.parse()

    print("=== Terraform Variables Parser Demo ===\n")

    print(f"Parsed {len(variables)} variables from example_variables.tf\n")

    # Show detailed information for some interesting variables
    interesting_vars = [
        "server_config",
        "load_balancer_config",
        "deployment_matrix",
        "database_configs",
    ]

    for var_name in interesting_vars:
        if var_name in variables:
            var = variables[var_name]
            print(f"Variable: {var_name}")
            print(f"  Type: {var.type}")
            print(f"  Description: {var.description}")

            # Show type details for complex types
            if hasattr(var.type, "attributes"):
                print("  Object attributes:")
                for attr_name, attr_type in var.type.attributes.items():
                    print(f"    {attr_name}: {attr_type}")
            elif hasattr(var.type, "element_type"):
                print(f"  Element type: {var.type.element_type}")
            elif hasattr(var.type, "element_types"):
                print(f"  Tuple elements: {[str(t) for t in var.type.element_types]}")

            print(f"  Default: {var.default}")
            print()

    # Show all variables in a compact format
    print("=== All Variables (Compact) ===")
    for name, var in variables.items():
        print(f"{name:20} | {str(var.type):40} | {var.description[:50]}")

    print("\n=== JSON Output ===")
    print(parser.to_json())


if __name__ == "__main__":
    demo()
