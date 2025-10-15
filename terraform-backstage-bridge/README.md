# Terraform Variables Parser

A Python library for parsing Terraform `variables.tf` files and representing variable types as complex Python objects using `python-hcl2`.

## Use Cases

This library enables automation and analysis of Terraform configurations by providing programmatic access to variable definitions. Common use cases include:

- **Configuration Validation**: Automate validation of Terraform variable definitions in CI/CD pipelines
- **Documentation Generation**: Generate documentation from variable definitions with types and descriptions
- **Security Auditing**: Identify sensitive variables and validate security configurations
- **Infrastructure Analysis**: Analyze and compare variable definitions across environments
- **Custom Tooling**: Build custom tools and integrations that work with Terraform configurations

For detailed user stories and requirements, see [REQUIREMENTS.md](REQUIREMENTS.md).

## Features

- **Comprehensive Type Support**: Handles all Terraform variable types including:
  - Primitive types: `string`, `number`, `bool`, `any`
  - Collection types: `list(T)`, `set(T)`, `map(T)`
  - Structural types: `object({...})`, `tuple([...])`
  - Complex nested structures

- **Rich Object Model**: Each variable type is represented as a Python class with full introspection capabilities

- **Complete Variable Information**: Extracts all variable attributes:
  - Type definitions
  - Descriptions
  - Default values
  - Sensitivity settings
  - Nullable settings
  - Validation rules

- **Multiple Output Formats**: Support for both Python objects and JSON serialization

## Installation

```bash
pip install python-hcl2
```

## Usage

### Command Line

```bash
python terraform_parser.py variables.tf
```

### Python API

```python
from terraform_parser import TerraformVariablesParser

# Parse a variables.tf file
parser = TerraformVariablesParser('variables.tf')
variables = parser.parse()

# Access specific variables
server_config = variables['server_config']
print(f"Type: {server_config.type}")
print(f"Description: {server_config.description}")
print(f"Default: {server_config.default}")

# Iterate through all variables
for name, variable in variables.items():
    print(f"{name}: {variable.type}")

# Get JSON representation
json_output = parser.to_json()
print(json_output)
```

## Type System

The parser represents Terraform types using a hierarchy of Python classes:

### Primitive Types
- `PrimitiveType('string')` - String values
- `PrimitiveType('number')` - Numeric values
- `PrimitiveType('bool')` - Boolean values
- `AnyType()` - Any type

### Collection Types
- `ListType(element_type)` - Ordered collections
- `SetType(element_type)` - Unordered unique collections
- `MapType(value_type)` - Key-value mappings

### Structural Types
- `ObjectType(attributes)` - Complex objects with named attributes
- `TupleType(element_types)` - Fixed-length sequences with typed positions

## Examples

### Simple Variable
```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
```

**Parsed as:**
```python
TerraformVariable(
    name='environment',
    type=PrimitiveType('string'),
    description='Environment name',
    default='dev'
)
```

### Complex Object Variable
```hcl
variable "server_config" {
  description = "Server configuration"
  type = object({
    instance_type = string
    ami_id        = string
    disk_size     = number
    monitoring    = bool
  })
  default = {
    instance_type = "t3.micro"
    ami_id        = "ami-12345678"
    disk_size     = 20
    monitoring    = false
  }
}
```

**Parsed as:**
```python
TerraformVariable(
    name='server_config',
    type=ObjectType({
        'instance_type': PrimitiveType('string'),
        'ami_id': PrimitiveType('string'),
        'disk_size': PrimitiveType('number'),
        'monitoring': PrimitiveType('bool')
    }),
    description='Server configuration',
    default={
        'instance_type': 't3.micro',
        'ami_id': 'ami-12345678',
        'disk_size': 20,
        'monitoring': False
    }
)
```

### Nested Complex Types
```hcl
variable "load_balancer_config" {
  description = "Load balancer configuration"
  type = object({
    name = string
    listeners = list(object({
      port     = number
      protocol = string
      ssl_cert = string
    }))
    health_check = object({
      path                = string
      interval            = number
      healthy_threshold   = number
      unhealthy_threshold = number
    })
  })
}
```

**Parsed as:**
```python
TerraformVariable(
    name='load_balancer_config',
    type=ObjectType({
        'name': PrimitiveType('string'),
        'listeners': ListType(
            ObjectType({
                'port': PrimitiveType('number'),
                'protocol': PrimitiveType('string'),
                'ssl_cert': PrimitiveType('string')
            })
        ),
        'health_check': ObjectType({
            'path': PrimitiveType('string'),
            'interval': PrimitiveType('number'),
            'healthy_threshold': PrimitiveType('number'),
            'unhealthy_threshold': PrimitiveType('number')
        })
    })
)
```

## Advanced Usage

### Type Introspection
```python
for name, var in variables.items():
    if isinstance(var.type, ObjectType):
        print(f"{name} has attributes:")
        for attr_name, attr_type in var.type.attributes.items():
            print(f"  {attr_name}: {attr_type}")
    elif isinstance(var.type, ListType):
        print(f"{name} is a list of: {var.type.element_type}")
```

### Finding Variables by Characteristics
```python
# Find all sensitive variables
sensitive_vars = [v for v in variables.values() if v.sensitive]

# Find variables with validation rules
validated_vars = [v for v in variables.values() if v.validation]

# Find variables with defaults
defaulted_vars = [v for v in variables.values() if v.default is not None]
```

### JSON Export
```python
# Export all variables to JSON
json_data = parser.to_json()

# Export specific variable
server_var = variables['server_config']
var_dict = server_var.to_dict()
```

## Files

- `terraform_parser.py` - Main parser implementation
- `example_variables.tf` - Sample Terraform variables file
- `examples/demo.py` - Demonstration script
- `examples/usage_example.py` - Advanced usage examples

## Dependencies

- `python-hcl2` - HCL2 parser for Python
- `json` - JSON serialization (built-in)
- `pathlib` - Path handling (built-in)
- `typing` - Type hints (built-in)

## Limitations

- Requires valid HCL2 syntax
- Complex nested interpolations may not parse perfectly
- Variable references and functions in default values are preserved as-is

## Contributing

The parser is designed to be extensible. To add support for new type patterns:

1. Extend the `_parse_function_type` method for new function-style types
2. Add new type classes inheriting from `TerraformType`
3. Update the type introspection logic as needed

## Development

### Setup Development Environment

```bash
# Install uv (recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
make install-dev

# Set up pre-commit hooks (optional)
uv add pre-commit
uv run pre-commit install
```

### Running Tests

```bash
# Run all tests
make test

# Run with coverage
make coverage

# Run specific test patterns
make test-pattern PATTERN=test_types

# Run linting and formatting
make lint
make format
```

### Available Make Targets

- `make help` - Show all available targets
- `make test` - Run all tests
- `make coverage` - Run tests with coverage
- `make lint` - Run linting with auto-fix
- `make format` - Format code
- `make clean` - Clean up generated files
- `make build` - Build package for distribution
- `make validate` - Run full validation (tests + linting)

## Release Process

### Automated Releases

This project uses GitHub Actions for automated CI/CD:

- **Pull Requests**: Automatically run tests on multiple Python versions (3.10-3.13)
- **Tags**: Automatically build and publish to PyPI when version tags are pushed

### Creating a Release

1. **Prepare the release:**
   ```bash
   make prepare-release VERSION=0.2.0
   ```
   This will:
   - Update the version in `pyproject.toml`
   - Run full validation (tests + linting)
   - Build and test the package

2. **Commit and tag:**
   ```bash
   git add -A
   git commit -m "Prepare release 0.2.0"
   git tag v0.2.0
   git push origin main
   git push origin v0.2.0
   ```

3. **Automated publishing:**
   - GitHub Actions will automatically build and test the package
   - If all tests pass, it will publish to PyPI using trusted publishing
   - A GitHub release will be created with the built artifacts

### PyPI Publishing Setup

The project uses PyPI's [Trusted Publishing](https://docs.pypi.org/trusted-publishers/) for secure, token-free publishing:

1. Go to [PyPI Trusted Publishers](https://pypi.org/manage/account/publishing/)
2. Add a new trusted publisher with these settings:
   - **Repository**: `your-username/terraform-parser`
   - **Workflow filename**: `release.yml`
   - **Environment**: Leave empty

### Version Management

- Version is managed in `pyproject.toml`
- Use semantic versioning (e.g., `0.1.0`, `0.2.0`, `1.0.0`)
- Update `CHANGELOG.md` with notable changes
- The release workflow verifies version consistency between git tags and `pyproject.toml`

### Manual Publishing (if needed)

```bash
# Build the package
make build

# Upload to PyPI (requires API token)
uv publish

# Or upload to Test PyPI first
uv publish --repository testpypi
```

## Documentation

- **[Requirements](REQUIREMENTS.md)** - Detailed user stories and requirements
- **[Changelog](CHANGELOG.md)** - Version history and changes
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to the project
