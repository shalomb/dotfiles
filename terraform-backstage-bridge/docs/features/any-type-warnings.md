# Any Type Warning Documentation

## Overview

The Terraform parser now emits warnings when it encounters variables with `any` type, as these are often mis-typed and should use more specific types for better type safety and documentation.

## Warning Scenarios

### 1. Explicit `any` Type Declaration

**Trigger**: When a variable explicitly uses `type = "any"`

**Example**:
```hcl
variable "my_var" {
  type        = any
  description = "Some variable"
  default     = "test"
}
```

**Warning Message**:
```
Variable 'my_var' uses 'any' type which is probably mis-typed.
Consider using a more specific type (string, number, bool, list, map, object, etc.).
Please raise a bug to update this variable's type definition.
```

### 2. Collection Types with `any` Elements

**Trigger**: When using collection types like `list(any)`, `set(any)`, `map(any)`

**Example**:
```hcl
variable "my_list" {
  type        = list(any)
  description = "List of anything"
  default     = ["item1", "item2"]
}
```

**Warning Message**:
```
Variable 'my_list' uses 'any' type which is probably mis-typed.
Consider using a more specific type (string, number, bool, list, map, object, etc.).
Please raise a bug to update this variable's type definition.
```

### 3. Unparseable Type Definitions

**Trigger**: When the parser encounters a type definition it cannot understand and falls back to `any`

**Example**:
```hcl
variable "unknown_var" {
  type        = unknown_function("param")
  description = "Unknown type"
}
```

**Warning Message**:
```
Variable 'unknown_var' has unparseable type definition, falling back to 'any' type.
This is probably due to an unsupported or mis-typed type definition.
Please raise a bug to add support for this type or fix the type definition.
```

### 4. Unrecognized Default Value Types

**Trigger**: When inferring type from a default value that doesn't match known patterns

**Example** (in Python context):
```python
# Complex object that can't be mapped to Terraform types
var_def = {
    "default": datetime.datetime.now(),
    "description": "Variable with complex default"
}
```

**Warning Message**:
```
Variable 'my_var' has unrecognized default value type 'datetime',
falling back to 'any' type. This might indicate an unsupported type.
Please raise a bug to add support for this default value type.
```

## No Warning Scenarios

### 1. Null Defaults
Variables without defaults (null defaults) do not trigger warnings as this is a common and acceptable pattern:

```hcl
variable "optional_var" {
  description = "Optional variable"
  # No default, no type - inferred as any but no warning
}
```

### 2. Normal Type Declarations
Well-defined types work normally without warnings:

```hcl
variable "good_var" {
  type        = string
  description = "Well-typed variable"
  default     = "test"
}
```

## Rationale

The warning system helps identify:

1. **Mis-typed variables**: Where `any` was used instead of a specific type
2. **Incomplete type definitions**: Where the type system needs enhancement
3. **Configuration errors**: Where unsupported type patterns are used

## Implementation Details

- Warnings use Python's `warnings` module with `UserWarning` category
- Stack level is set appropriately to point to the calling code
- Warnings are emitted during variable parsing, not during output generation
- Test framework includes comprehensive warning tests

## Testing

The warning functionality includes comprehensive tests in `tests/test_any_type_warnings.py`:

- Test explicit `any` type warnings
- Test collection type warnings (`list(any)`, etc.)
- Test unparseable type warnings
- Test unrecognized default value warnings
- Test that null defaults don't trigger warnings
- Test that normal types don't trigger warnings

Run tests with:
```bash
make test tests/test_any_type_warnings.py
```

## Usage in CI/CD

Warnings will appear in logs during parsing but won't fail the build. Teams can:

1. Monitor warning output to identify problematic type definitions
2. Use warning filters in Python to turn warnings into errors if desired
3. Track warning trends over time to measure type definition quality

## Future Enhancements

Consider adding:
- Configuration options to control warning verbosity
- Warning filters for specific variable patterns
- Integration with linting tools to surface warnings in IDEs
- Metrics collection for warning frequency by building block
