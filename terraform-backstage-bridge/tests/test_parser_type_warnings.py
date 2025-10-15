"""
Test warnings emitted for 'any' type variables.

This test verifies that appropriate warnings are emitted when the parser
encounters variables with 'any' type, which are likely mis-typed.
"""

import warnings

from terraform_parser.parser import TerraformVariable


class TestAnyTypeWarnings:
    """Test warning behavior for 'any' type variables."""

    def test_explicit_any_type_warning(self):
        """Test that explicit 'any' type triggers a warning."""
        with warnings.catch_warnings(record=True) as warning_list:
            warnings.simplefilter("always")

            var_def = {
                "type": "any",
                "description": "Variable with any type",
                "default": "test_value",
            }
            var = TerraformVariable("test_any_var", var_def)

            # Verify the variable was created correctly
            assert var.name == "test_any_var"
            assert var.type.__class__.__name__ == "AnyType"

            # Verify warning was emitted
            assert len(warning_list) == 1
            warning = warning_list[0]
            assert issubclass(warning.category, UserWarning)
            assert "Variable 'test_any_var' uses 'any' type" in str(warning.message)
            assert "probably mis-typed" in str(warning.message)
            assert "Please raise a bug" in str(warning.message)

    def test_list_any_type_warning(self):
        """Test that list(any) type triggers a warning."""
        with warnings.catch_warnings(record=True) as warning_list:
            warnings.simplefilter("always")

            var_def = {
                "type": "list(any)",
                "description": "List of any type",
                "default": ["item1", "item2"],
            }
            var = TerraformVariable("test_list_any", var_def)

            # Verify the variable was created correctly
            assert var.name == "test_list_any"
            assert var.type.__class__.__name__ == "ListType"

            # Verify warning was emitted for the element type
            assert len(warning_list) == 1
            warning = warning_list[0]
            assert issubclass(warning.category, UserWarning)
            assert "Variable 'test_list_any' uses 'any' type" in str(warning.message)

    def test_unparseable_type_warning(self):
        """Test that unparseable types trigger a warning."""
        with warnings.catch_warnings(record=True) as warning_list:
            warnings.simplefilter("always")

            var_def = {
                "type": ["unknown_function", "param"],
                "description": "Unknown function type",
            }
            var = TerraformVariable("test_unknown", var_def)

            # Verify the variable was created correctly (falls back to any)
            assert var.name == "test_unknown"
            assert var.type.__class__.__name__ == "AnyType"

            # Verify warning was emitted
            assert len(warning_list) == 1
            warning = warning_list[0]
            assert issubclass(warning.category, UserWarning)
            assert "Variable 'test_unknown' has unparseable type definition" in str(
                warning.message
            )
            assert "falling back to 'any' type" in str(warning.message)

    def test_unrecognized_default_value_warning(self):
        """Test that unrecognized default value types trigger a warning."""
        with warnings.catch_warnings(record=True) as warning_list:
            warnings.simplefilter("always")

            # Use a complex object as default that doesn't match our patterns
            import datetime

            complex_default = datetime.datetime.now()

            var_def = {
                "description": "Variable with complex default type",
                "default": complex_default,
            }
            var = TerraformVariable("test_complex_default", var_def)

            # Verify the variable was created correctly (falls back to any)
            assert var.name == "test_complex_default"
            assert var.type.__class__.__name__ == "AnyType"

            # Verify warning was emitted
            assert len(warning_list) == 1
            warning = warning_list[0]
            assert issubclass(warning.category, UserWarning)
            assert (
                "Variable 'test_complex_default' has unrecognized default value type"
                in str(warning.message)
            )
            assert "datetime" in str(warning.message)

    def test_null_default_no_warning(self):
        """Test that null defaults do not trigger warnings (acceptable case)."""
        with warnings.catch_warnings(record=True) as warning_list:
            warnings.simplefilter("always")

            var_def = {"description": "Variable with null default", "default": None}
            var = TerraformVariable("test_null_default", var_def)

            # Verify the variable was created correctly
            assert var.name == "test_null_default"
            assert var.type.__class__.__name__ == "AnyType"

            # Verify NO warning was emitted (null defaults are acceptable)
            assert len(warning_list) == 0

    def test_normal_types_no_warning(self):
        """Test that normal types do not trigger warnings."""
        with warnings.catch_warnings(record=True) as warning_list:
            warnings.simplefilter("always")

            var_def = {
                "type": "string",
                "description": "Normal string variable",
                "default": "test_value",
            }
            var = TerraformVariable("test_normal", var_def)

            # Verify the variable was created correctly
            assert var.name == "test_normal"
            assert var.type.__class__.__name__ == "PrimitiveType"

            # Verify NO warning was emitted
            assert len(warning_list) == 0
