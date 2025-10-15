# ADR-002: YAML Output Format Support

## Context

The terraform-parser currently supports JSON output format for machine-readable structured data. However, users have expressed the need for a more human-readable and editable representation of the parsed Terraform variable definitions.

Key drivers for this requirement:
- **Human Readability**: YAML is more readable than JSON for humans, especially for complex nested structures
- **Editability**: Users want to be able to manually edit the output and use it as input for other tools
- **CI/CD Integration**: Many CI/CD tools and DevOps workflows prefer YAML for configuration
- **Documentation Generation**: Documentation tools often work better with YAML input
- **Industry Standard**: YAML is widely adopted in the DevOps and infrastructure-as-code community

Current limitations:
- Only JSON output available, which is not easily human-readable
- Users must use external tools to convert JSON to YAML
- Integration with YAML-based toolchains requires additional processing steps

## Date

2025-08-06

## Status

Accepted

## Options

### Option 1: YAML-only output (replace JSON)
- **Pros**:
  - Simpler implementation with single output format
  - YAML is human-readable and machine-parseable
  - Reduces maintenance burden
- **Cons**:
  - Breaking change for existing users relying on JSON
  - Some tools specifically expect JSON format
  - YAML parsing is generally slower than JSON

### Option 2: YAML support alongside JSON (dual format)
- **Pros**:
  - Backward compatibility maintained
  - Users can choose appropriate format for their use case
  - Supports both machine automation (JSON) and human workflows (YAML)
  - No breaking changes to existing integrations
- **Cons**:
  - More complex implementation and testing
  - Additional dependency (PyYAML)
  - Increased maintenance burden

### Option 3: Pluggable output format system
- **Pros**:
  - Extensible architecture for future formats
  - Clean separation of concerns
  - Could support XML, TOML, or other formats later
- **Cons**:
  - Over-engineering for current requirements
  - Significant implementation complexity
  - May not provide immediate value

## Decision

We choose **Option 2: YAML support alongside JSON (dual format)** for the following reasons:

1. **Backward Compatibility**: Existing integrations and users continue to work without changes
2. **User Choice**: Different use cases benefit from different formats (automation vs. human workflows)
3. **Industry Alignment**: Both JSON and YAML are standard formats in DevOps toolchains
4. **Incremental Implementation**: Can be added without disrupting existing functionality
5. **Clear Use Cases**: JSON for machine consumption, YAML for human readability and editing

Implementation approach:
- Add `--format yaml` CLI option alongside existing `--json` flag
- Extend programmatic API with `output_format` parameter
- Use PyYAML library for YAML serialization
- Maintain identical data structure for both formats

## Consequences

### Positive
- Enhanced user experience with human-readable output
- Better integration with YAML-based CI/CD and documentation tools
- Maintains backward compatibility for existing users
- Supports diverse workflow requirements
- Positions project well for DevOps community adoption

### Negative
- Additional dependency on PyYAML library
- Increased test coverage requirements (both formats must be tested)
- Slightly more complex CLI interface with format options
- Documentation needs to cover both output formats

### Neutral
- Code complexity increases moderately with dual format support
- Package size increases minimally with PyYAML dependency
- Release testing must validate both output formats

## People Involved

- **Decision Makers**: Project maintainer
- **Consulted**: DevOps community feedback, YAML specification documentation
- **Informed**: Current and future users requiring human-readable output

## References

- [YAML Specification](https://yaml.org/spec/1.2/spec.html)
- [PyYAML Documentation](https://pyyaml.org/wiki/PyYAMLDocumentation)
- [JSON vs YAML: Which is Better for DevOps?](https://www.redhat.com/en/topics/automation/yaml-vs-json)
- [Terraform Variable Documentation](https://www.terraform.io/docs/language/values/variables.html)

---

*This ADR follows the format: Context (*), Date (*), Status (*), Options, Decision (*), Consequences (*), People involved*
