# ADR-003: Harness IDP Template Generation

## Status

Accepted

## Date

2025-08-08

## Context

The terraform-backstage-bridge project needed to extend beyond simple Terraform variable parsing to provide integration with Harness Internal Developer Platform (IDP). Organizations using Harness IDP require the ability to dynamically generate service templates from Terraform building blocks, enabling developers to self-serve infrastructure components through forms and wizards.

### Requirements Identified

1. **Single Building Block Templates**: Convert individual Terraform variable definitions into Harness IDP-compatible JSON Schema forms
2. **Multi-Building Block Templates**: Aggregate multiple building blocks into comprehensive service templates with dynamic selection
3. **Type System Mapping**: Translate complex Terraform types (objects, lists, maps, optionals) into appropriate JSON Schema and UI widgets
4. **Developer Experience**: Provide intuitive form interfaces with proper validation, help text, and sensible defaults
5. **CLI Integration**: Enable both single-file and multi-building block workflows through command-line interface

### Technical Challenges

- Terraform's rich type system (including optional types) needed mapping to JSON Schema
- Complex nested objects required recursive property generation
- UI widget selection needed to match Terraform type semantics
- Multi-building block aggregation required dynamic template composition
- Integration with existing parser architecture without breaking changes

## Decision

We implemented a comprehensive Harness IDP template generation system with the following architecture:

### 1. Core Template Generation (`to_harness()` method)

```python
def to_harness(self, template_name: str = "terraform-template", **kwargs) -> str:
    """Convert Terraform variables to Harness IDP template format"""
```

**Key Features:**

- Generates Backstage-compatible YAML templates (Harness IDP standard)
- Supports customizable metadata (title, description, tags, owner)
- Creates resource-array parameter structure for variable aggregation
- Handles template naming and organization conventions

### 2. Type System Mapping (`_terraform_var_to_harness_param()`)

**Terraform Type → JSON Schema + UI Widget Mapping:**

| Terraform Type | JSON Schema Type | UI Widget | Special Handling |
|----------------|------------------|-----------|------------------|
| `string` | `string` | Default input | Enum detection for validation |
| `number` | `number` | Number input | Min/max from validation |
| `bool` | `boolean` | Radio buttons | Inline options |
| `list(T)` | `array` with `items` | Textarea | One item per line |
| `set(T)` | `array` with `uniqueItems` | Textarea | Unique validation |
| `map(T)` | `object` with `additionalProperties` | Textarea | Key=value format |
| `object({...})` | `object` with `properties` | Nested form | Recursive handling |
| `optional(T, default)` | Type `T` with `default` | Based on `T` | Inline default extraction |
| `any` | String fallback | Textarea | Warning generation |

### 3. Multi-Building Block Support

**CLI Enhancement:**

```bash
# Single building block
terraform-parser file.tf --format harness

# Multiple building blocks with glob patterns
terraform-parser --building-blocks "terraform-aws-*" --format harness
```

**Features Implemented:**

- Glob pattern matching for building block discovery
- Dynamic building block selection dropdown in templates
- Aggregated variable collection from multiple sources
- Template metadata derived from building block names
- Error handling for missing or invalid building blocks

### 4. Advanced Type Inference

**Enhanced Default Value Processing:**

- Primitive type inference from default values
- Collection type detection (list/map/set)
- Complex object structure preservation
- Null handling and optional type support

### 5. Comprehensive Testing Framework

**Fixture-Based Testing:**

- Human-editable YAML test cases (`harness_formatter_test_cases.yaml`)
- Parameterized test execution for all type mappings
- Template structure validation
- Output format verification
- Multi-building block scenario testing

## Consequences

### Positive

1. **Developer Self-Service**: Teams can now generate infrastructure through Harness IDP forms instead of writing Terraform directly
2. **Type Safety**: Complex Terraform types are properly represented in JSON Schema with appropriate validation
3. **Extensibility**: New building blocks automatically integrate with multi-template generation
4. **Testing Coverage**: Comprehensive fixture-based testing ensures reliability across type system mappings
5. **CLI Flexibility**: Both single and multi-building block workflows supported
6. **Integration Ready**: Output format matches Harness IDP expectations exactly

### Negative

1. **Complexity**: Additional code paths for template generation and type mapping
2. **Dependencies**: Harness IDP format coupling (though based on Backstage standard)
3. **Maintenance**: UI widget mappings may need updates as Harness IDP evolves
4. **Performance**: Multi-building block processing can be slower with large glob patterns

### Trade-offs Made

1. **Resource Array Structure**: Chose array-based parameter structure over flat variables for better organization in complex templates
2. **UI Widget Selection**: Prioritized usability over exact Terraform semantics (e.g., radio buttons for booleans)
3. **Default Handling**: Inline defaults in optional types vs. explicit default sections for better user experience
4. **Error Handling**: Graceful degradation with warnings rather than failures for unsupported types

## Implementation Details

### File Structure

```text
src/terraform_parser/
├── parser.py                    # Core harness generation logic
└── __init__.py                 # CLI integration

tests/
├── fixtures/
│   ├── harness_formatter_test_cases.yaml    # Human-editable test cases
│   └── README.md                            # Test documentation
├── test_harness_formatter.py               # Core functionality tests
├── test_harness_formatter_fixtures.py      # Fixture-based tests
└── test_harness_multiple_building_blocks.py # Multi-BB tests
```

### Key Methods Added

- `to_harness()`: Main template generation
- `_terraform_var_to_harness_param()`: Type mapping logic
- `_get_ui_widget()`: UI widget selection
- `_extract_enum_from_validation()`: Validation rule processing
- `generate_multi_building_block_template()`: Multi-BB aggregation

### Configuration Options

```python
harness_template = parser.to_harness(
    template_name="my-service",
    title="My Service Template",
    description="Custom description",
    tags=["infrastructure", "aws"],
    owner="platform-team"
)
```

## Alternatives Considered

1. **Direct JSON Schema Generation**: Would have required custom UI widget mapping
2. **Multiple Template Formats**: Considered supporting multiple IDP platforms but chose Harness/Backstage focus
3. **Flat Parameter Structure**: Rejected in favor of resource array for better organization
4. **Custom DSL**: Considered intermediate representation but direct mapping proved sufficient

## Related ADRs

- ADR-001: Package Structure - Established foundation for parser extension
- ADR-002: YAML Output Format - Provided YAML serialization patterns

## Future Considerations

1. **Template Validation**: Could add JSON Schema validation of generated templates
2. **Custom Widgets**: Could support custom UI widget definitions
3. **Template Composition**: Could enable template inheritance and composition
4. **Alternative Formats**: Could support other IDP platforms (GitHub Copilot, etc.)
5. **Dynamic Validation**: Could generate client-side validation from Terraform constraints
