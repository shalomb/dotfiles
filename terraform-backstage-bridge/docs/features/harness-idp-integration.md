# Harness IDP Template Generation

## Overview

The terraform-backstage-bridge now supports generating Harness Internal Developer Platform (IDP) templates from Terraform variable definitions. This feature enables organizations to transform Terraform building blocks into self-service developer portals with form-based infrastructure provisioning.

## Features

### Single Building Block Templates

Convert individual Terraform files into Harness IDP service templates:

```bash
terraform-parser terraform-aws-s3/variables.tf --format harness
```

This generates a complete Backstage-compatible YAML template with:
- JSON Schema parameter definitions
- UI widget specifications for optimal user experience
- Metadata configuration (title, description, tags, owner)
- Resource array structure for variable organization

### Multi-Building Block Templates

Aggregate multiple building blocks into comprehensive service templates:

```bash
# Select specific building blocks
terraform-parser --building-blocks "terraform-aws-s3,terraform-aws-iam" --format harness

# Use glob patterns for discovery
terraform-parser --building-blocks "terraform-aws-*" --format harness
```

Multi-building block templates include:
- Dynamic building block selection dropdown
- Aggregated variable collection from all sources
- Template metadata derived from building block names
- Organized parameter sections per building block

### Advanced Type System Mapping

The parser intelligently maps Terraform types to JSON Schema with appropriate UI widgets:

#### Basic Types
- `string` → Text input with enum validation support
- `number` → Number input with min/max validation
- `bool` → Radio buttons for better usability

#### Collection Types
- `list(T)` → Textarea with "one item per line" guidance
- `set(T)` → Textarea with unique item validation
- `map(T)` → Textarea with "key=value" format guidance

#### Complex Types
- `object({...})` → Nested form sections with recursive property handling
- `optional(T, default)` → Type-appropriate widget with inline default values
- `any` → Textarea fallback with type warning

#### Example Type Mapping

```hcl
# Terraform variable definition
variable "database_config" {
  type = object({
    engine      = string
    version     = string
    instance_class = string
    storage = object({
      allocated    = number
      max_allocated = optional(number, 100)
      encrypted    = bool
    })
    backup_config = optional(object({
      retention_days = number
      window        = string
    }), {
      retention_days = 7
      window        = "03:00-04:00"
    })
  })

  validation {
    condition = contains(["mysql", "postgres", "oracle"], var.database_config.engine)
    error_message = "Engine must be mysql, postgres, or oracle."
  }
}
```

Generates JSON Schema:

```yaml
database_config:
  type: object
  title: Database Config
  properties:
    engine:
      type: string
      title: Engine
      enum: ["mysql", "postgres", "oracle"]
    version:
      type: string
      title: Version
    instance_class:
      type: string
      title: Instance Class
    storage:
      type: object
      title: Storage
      properties:
        allocated:
          type: number
          title: Allocated
        max_allocated:
          type: number
          title: Max Allocated
          default: 100
        encrypted:
          type: boolean
          title: Encrypted
    backup_config:
      type: object
      title: Backup Config
      default:
        retention_days: 7
        window: "03:00-04:00"
      properties:
        retention_days:
          type: number
          title: Retention Days
        window:
          type: string
          title: Window
  ui:widget: object
```

## Configuration Options

### Template Customization

```python
from terraform_parser import TerraformParser

parser = TerraformParser("variables.tf")
template = parser.to_harness(
    template_name="my-database-service",
    title="Database Service Template",
    description="Provision managed database instances with backup configuration",
    tags=["database", "aws", "infrastructure"],
    owner="platform-team"
)
```

### CLI Options

```bash
# Basic template generation
terraform-parser file.tf --format harness

# Custom template name and metadata
terraform-parser file.tf --format harness \
  --template-name "my-service" \
  --title "My Service Template" \
  --description "Custom service description" \
  --tags "tag1,tag2,tag3" \
  --owner "platform-team"

# Multi-building block with filtering
terraform-parser --building-blocks "terraform-aws-*" \
  --format harness \
  --exclude-patterns "test,example,demo"
```

## UI Widget Selection

The parser automatically selects optimal UI widgets based on Terraform types:

| Type | UI Widget | Reasoning |
|------|-----------|-----------|
| `bool` | `radio` | Clearer than checkbox for required fields |
| `string` with validation | `select` | Provides dropdown for enum values |
| `list`/`set` | `textarea` | Multi-line input for collections |
| `map` | `textarea` | Key-value pair input format |
| `object` | `object` | Nested form sections |
| `number` | `number` | Native numeric input with validation |

### Widget Customization

Widget selection considers:
- **Validation rules**: Enum constraints become select dropdowns
- **Optional types**: Default values are preserved and displayed
- **Collection semantics**: Sets get unique validation, lists allow duplicates
- **Nested complexity**: Deep objects maintain structure in forms

## Integration Patterns

### Harness IDP Workflow

1. **Template Creation**: Generate templates from Terraform building blocks
2. **Catalog Registration**: Register templates in Harness IDP service catalog
3. **Developer Self-Service**: Developers use forms to provision infrastructure
4. **Pipeline Integration**: Generated configurations trigger Terraform pipelines

### Template Structure

Generated templates follow Backstage specification with Harness extensions:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Template
metadata:
  name: terraform-template
  title: Terraform Template
  description: Generated from Terraform variables
  tags:
    - terraform
    - infrastructure
spec:
  owner: platform-team
  type: service
  parameters:
    - title: Configuration
      required:
        - resources
      properties:
        resources:
          type: array
          title: Resources
          items:
            type: object
            # Variable definitions...
```

## Error Handling and Warnings

### Unsupported Type Warning

When encountering `any` types or complex expressions, the parser:
- Falls back to string/textarea widgets
- Generates warning comments in output
- Preserves original Terraform documentation

```yaml
# Example warning for unsupported type
unknown_variable:
  type: string
  title: Unknown Variable
  description: "Original Terraform type: any (Warning: Complex type not fully supported)"
  ui:widget: textarea
```

### Validation Preservation

Complex Terraform validations are preserved as comments:

```yaml
engine:
  type: string
  title: Engine
  # Original validation: contains(["mysql", "postgres"], var.engine)
  enum: ["mysql", "postgres"]
```

## Testing and Validation

### Comprehensive Test Coverage

The feature includes extensive testing:

- **Type mapping tests**: All Terraform → JSON Schema mappings
- **UI widget tests**: Widget selection for different types
- **Complex object tests**: Nested objects with optional fields
- **Multi-building block tests**: Template aggregation scenarios
- **Real-world fixture tests**: Based on actual Terraform building blocks

### Test Case Structure

```yaml
# tests/fixtures/harness_formatter_test_cases.yaml
test_cases:
  - name: "Complex Object with Optional Fields"
    terraform_content: |
      variable "config" {
        type = object({
          required_field = string
          optional_field = optional(string, "default")
        })
      }
    expected_harness:
      # Expected JSON Schema output...
```

## Best Practices

### Template Organization

1. **Logical Grouping**: Group related building blocks in multi-templates
2. **Clear Naming**: Use descriptive template names that reflect functionality
3. **Comprehensive Metadata**: Include helpful descriptions and tags
4. **Owner Assignment**: Assign clear ownership for template maintenance

### Variable Design

1. **Rich Descriptions**: Include helpful descriptions in Terraform variables
2. **Validation Rules**: Use validation blocks for enum constraints
3. **Sensible Defaults**: Provide defaults in optional types
4. **Clear Types**: Use specific object types instead of `any` where possible

### Development Workflow

```bash
# 1. Develop Terraform building block
# 2. Generate Harness template
terraform-parser building-block/variables.tf --format harness > template.yaml

# 3. Validate template structure
# 4. Register in Harness IDP catalog
# 5. Test developer workflow with forms
```

## Migration Guide

### From Manual Templates

If you currently maintain Harness IDP templates manually:

1. **Extract Variables**: Move form parameters to Terraform variables
2. **Add Validation**: Include validation blocks for constraints
3. **Generate Templates**: Use parser to create base templates
4. **Customize Metadata**: Add project-specific titles and descriptions
5. **Iterate**: Refine based on developer feedback

### From Other IDP Platforms

Templates are Backstage-compatible and can be adapted for:
- GitHub Copilot Workspace templates
- GitLab project templates
- Azure DevOps service templates
- Custom internal developer portals

## Future Enhancements

- **Template Validation**: JSON Schema validation of generated templates
- **Custom UI Widgets**: Support for project-specific widget types
- **Dynamic Validation**: Client-side validation from Terraform constraints
- **Template Composition**: Template inheritance and composition patterns
- **Multi-Format Support**: Additional IDP platform formats
