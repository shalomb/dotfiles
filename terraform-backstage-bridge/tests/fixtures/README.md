# Test Fixtures Directory - Comprehensive Parser Validation Suite

<!--
================================================================================
OVERVIEW:
  Centralized repository of all test data for the terraform-parser project.
  Contains input fixtures, expected outputs, and validation data organized
  by complexity level and testing purpose.

ORGANIZATION PRINCIPLE:
  Files are organized by testing purpose and complexity level, with
  comprehensive headers in each file explaining its specific role
  in the validation ecosystem.
================================================================================
-->

This directory contains all test data files for the terraform-parser project, consolidating both input fixtures and expected outputs in a single organized location.

## 📁 **File Organization**

### **🔹 Terraform Input Fixtures (.tf files)**
Each Terraform file includes comprehensive headers explaining its purpose, coverage, and testing strategy:

- **`terraform_basic_types.tf`** - Fundamental parser test fixture for primitive and collection types
  - *Purpose*: Basic parser validation with canonical type patterns
  - *Coverage*: string, number, bool, list, map, set, object types
  - *Strategy*: Controlled basic patterns for core functionality validation

- **`terraform_complex_types.tf`** - Advanced parser test fixture for complex patterns
  - *Purpose*: Advanced type structures and validation constraints
  - *Coverage*: Nested objects, optional types, advanced validations
  - *Strategy*: Production-level complexity testing

- **`terraform_comprehensive_variables.tf`** - Integration test fixture with mixed patterns
  - *Purpose*: Real Terraform module simulation with diverse patterns
  - *Coverage*: Mixed types, multiple validations, realistic naming
  - *Strategy*: Integration testing with realistic file structures

- **`terraform_building_block_scenarios.tf`** - Real-world building block patterns
  - *Purpose*: Comprehensive test of actual production patterns
  - *Coverage*: 80+ building block derived patterns, all complexity levels
  - *Strategy*: Real-world pattern validation from production infrastructure

- **`terraform_optional_defaults.tf`** - Modern Terraform optional() syntax testing
  - *Purpose*: Cutting-edge Terraform features (optional() function)
  - *Coverage*: Optional types with defaults, nested optional patterns
  - *Strategy*: Modern Terraform version compatibility testing

### **🔹 Test Case Definitions (.yaml files)**
Unit testing scenarios with targeted validation:

- **`parser_test_cases.yaml`** - Individual unit test case definitions for granular testing

### **🔹 Harness IDP Integration Files (.yaml/.yml files)**
Developer platform integration testing:

- **`harness_formatter_fixtures.yaml`** - IDP template validation fixtures
- **`harness_formatter_test_cases.yaml`** - Comprehensive IDP validation scenarios
- **`harness_baseline_template.yaml`** - Reference template structure
- **`harness_cloud_deployment.yml`** - Production-grade enterprise template

## 🎯 **Usage Guidelines**

### **For Basic Tests**
Use `basic_types.tf` when testing:
- Simple variable parsing
- Basic type inference
- Primitive type handling

### **For Complex Tests**
Use `complex_types.tf` and `real_world_patterns.tf` when testing:
- Advanced type parsing
- Complex validation rules
- Production-grade scenarios

### **For Harness Formatter Tests**
Use `harness_formatter_fixtures.yaml` for:
- UI widget assignment testing
- Template generation validation
- Expected output comparison

## 📋 **Consolidation Notes**

This directory consolidates the previous `tests/test_data/` structure:
- `tests/test_data/expected/` → **moved to** `tests/fixtures/`
- `tests/test_data/templates/` → **moved to** `tests/fixtures/`
- All fixture references updated in test files to use single location

Benefits:
- **Single source of truth** for all test data
- **Simplified maintenance** - all related files in one place
- **Clear organization** - input fixtures and expected outputs together
- **Reduced complexity** - no need to navigate multiple directories
- Basic collection types

### **For Comprehensive Tests**
Use `comprehensive_variables.tf` when testing:
- Validation rule parsing
- Description extraction
- Default value handling
- Mixed variable scenarios

### **For Advanced Tests**
Use the complex fixtures when testing:
- **`complex_types.tf`** - Type parsing edge cases
- **`building_block_scenarios.tf`** - Real-world patterns
- **`real_world_patterns.tf`** - Production patterns with advanced validation

### **For Optional Type Tests**
Use `optional_defaults.tf` when testing:
- Optional field parsing
- Default value inference
- Object type with optional attributes

## 📋 **Fixture Contents Summary**

| File | Variables | Focus Area |
|------|-----------|------------|
| `basic_types.tf` | 9 | Simple types, basic collections |
| `comprehensive_variables.tf` | 12+ | Validation, descriptions, mixed scenarios |
| `complex_types.tf` | 50+ | Edge cases, inference, complex structures |
| `building_block_scenarios.tf` | 100+ | Real-world building block patterns |
| `real_world_examples.tf` | 30+ | Production examples |
| `real_world_patterns.tf` | 25+ | Advanced validation patterns |
| `optional_defaults.tf` | 15+ | Optional field handling |

## 🔄 **Migration Notes**

This directory consolidates fixtures from:
- Previous `tests/fixtures/` files
- Previous `tests/test_data/terraform/` files

All test files have been updated to reference this consolidated location.

## Overview

The fixture-based testing system allows humans to easily define test cases for the Harness formatter without writing complex test code. Test cases are defined in YAML format and are automatically executed by the test suite.

## Files

- **`harness_formatter_test_cases.yaml`** - Human-editable YAML file containing test case definitions
- **`test_harness_formatter_fixtures.py`** - Automated test suite that executes the fixture-based tests

## Test Case Structure

Each test case in `harness_formatter_test_cases.yaml` has the following structure:

```yaml
- name: "test_case_name"
  description: "Human-readable description of what this test case covers"
  terraform_variables:
    - name: "variable_name"
      type: "terraform_type"
      description: "Variable description"
      default: default_value
      # Additional properties: nullable, sensitive, validation, etc.
  expected_harness_properties:
    variable_name:
      title: "Expected title"
      description: "Expected description"
      type: "expected_json_schema_type"
      # Additional expected properties: default, ui:widget, etc.
```

## Current Test Cases

1. **basic_primitives** - Tests string, number, and boolean types
2. **list_types** - Tests list(string), list(number), and empty lists
3. **set_types** - Tests set(string) with uniqueItems constraint
4. **map_types** - Tests map(string) and map(number) types
5. **object_types** - Tests object types with nested properties
6. **nullable_and_required** - Tests nullable and required constraints
7. **variables_with_validation** - Tests validation constraint handling (basic)
8. **complex_nested** - Tests complex nested types like list(object(...))
9. **no_descriptions** - Tests auto-generated titles and descriptions
10. **edge_cases** - Tests edge cases like 'any' type and sensitive variables

## Adding New Test Cases

To add a new test case:

1. Open `harness_formatter_test_cases.yaml`
2. Add a new test case following the structure above
3. Define the input Terraform variables
4. Specify the expected Harness output properties
5. Run the tests to verify: `pytest tests/test_harness_formatter_fixtures.py -v`

## Test Types

### Parameterized Tests
- `test_individual_test_cases[N]` - Runs each test case individually
- These tests automatically verify that the actual output matches expected properties

### Specific Feature Tests
- `test_basic_primitives` - Focused test for primitive type handling
- `test_list_types_comprehensive` - Detailed list type testing
- `test_object_types_comprehensive` - Object type property verification
- `test_validation_constraints` - Validation rule processing
- `test_edge_cases` - Edge case and unusual configuration handling

### Template Structure Tests
- `test_global_template_structure` - Verifies overall Harness template structure
- `test_template_customization` - Tests custom metadata options
- `test_yaml_output_is_valid` - Ensures generated YAML is valid

## Type Mapping Reference

The fixture system tests the following Terraform → Harness mappings:

| Terraform Type | Harness Type | Special Properties |
|----------------|--------------|-------------------|
| `string` | `string` | Environment variables get enum options |
| `number` | `number` | Supports min/max validation |
| `bool` | `boolean` | Uses radio widget with inline options |
| `list(T)` | `array` | textarea widget, items.type from T |
| `set(T)` | `array` | textarea widget, uniqueItems: true |
| `map(T)` | `object` | textarea widget with key=value help |
| `object({...})` | `object` | Nested properties for each field |
| `any` | `string` | Falls back to textarea widget |

## Running Tests

```bash
# Run all fixture-based tests
pytest tests/test_harness_formatter_fixtures.py -v

# Run specific test case
pytest tests/test_harness_formatter_fixtures.py::TestHarnessFormatterFixtures::test_basic_primitives -v

# Run with coverage
pytest tests/test_harness_formatter_fixtures.py --cov

# Run without coverage for faster feedback
pytest tests/test_harness_formatter_fixtures.py --no-cov
```

## Debugging Test Failures

When a test fails:

1. **Check the assertion message** - It will show expected vs actual values
2. **Update expectations in YAML** - If the behavior is correct but expectations are wrong
3. **Fix the implementation** - If the actual output is incorrect
4. **Add debug output** - Temporarily print the generated template to inspect structure

Example debug code:
```python
parser = self._create_mock_parser_with_variables(variables)
harness_yaml = parser.to_harness()
print("Generated template:", harness_yaml)  # Temporary debug
harness_template = yaml.safe_load(harness_yaml)
```

## Future Enhancements

The fixture system can be extended to test:

- Complex validation rule parsing
- Custom UI widget configurations
- Advanced nested type scenarios
- Multi-building block templates
- Template inheritance and composition
- Error handling and edge cases

## Contributing

When modifying the Harness formatter:

1. Update relevant test cases in the YAML fixture file
2. Add new test cases for new functionality
3. Ensure all existing tests continue to pass
4. Document any breaking changes in expected output format
