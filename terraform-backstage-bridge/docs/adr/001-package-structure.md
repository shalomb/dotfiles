# ADR-001: Package Structure and PyPI Publishing

## Context

The terraform-parser project started as a standalone script but needed to be reorganized into a proper Python package suitable for PyPI distribution. The original structure had the main parsing code in the root directory, making it difficult to import as a library and not following Python packaging best practices.

Key challenges:
- Script was not importable as a library
- No proper package structure for distribution
- Missing setup configuration for PyPI publishing
- Tests were not properly organized
- CLI functionality needed to be separated from core parsing logic

## Date

2025-08-06

## Status

Accepted

## Options

### Option 1: Keep script structure with setup.py
- **Pros**:
  - Minimal changes required
  - Familiar setup.py approach
- **Cons**:
  - Does not follow modern Python packaging standards
  - setup.py is being deprecated in favor of pyproject.toml
  - Would still require significant restructuring for proper imports

### Option 2: Modern src/ layout with pyproject.toml
- **Pros**:
  - Follows PEP 517/518 modern packaging standards
  - Clear separation between source code and tests
  - Prevents accidental imports from development directory
  - Supports modern build tools (uv, pip-tools)
  - Better for CI/CD and automated publishing
- **Cons**:
  - Requires more significant restructuring
  - Need to update all import statements

### Option 3: Flat package structure
- **Pros**:
  - Simpler directory structure
  - Easier to understand for beginners
- **Cons**:
  - Not recommended for libraries
  - Harder to maintain as project grows
  - Import issues in development

## Decision

We chose **Option 2: Modern src/ layout with pyproject.toml** for the following reasons:

1. **Future-proof**: Aligns with modern Python packaging standards (PEP 517/518)
2. **Professional quality**: src/ layout is the recommended practice for library packages
3. **Better tooling support**: Works optimally with modern tools like uv, ruff, and GitHub Actions
4. **Clear separation**: Distinct boundaries between source, tests, and build artifacts
5. **PyPI ready**: Structure supports automated publishing workflows

## Consequences

### Positive
- Package can be properly installed via pip/uv
- Clear import structure with `from terraform_parser import ...`
- Automated CI/CD pipeline with GitHub Actions
- Professional-grade project structure
- Ready for PyPI publication with trusted publishing
- Better development experience with proper virtual environment isolation

### Negative
- Required updating all existing import statements
- More complex directory structure initially
- Need to understand src/ layout concepts

### Neutral
- All configuration consolidated in pyproject.toml
- CLI entry point defined as console script
- Tests remain in separate directory structure

## People Involved

- **Decision Makers**: Project maintainer
- **Consulted**: Python packaging best practices documentation, PEP 517/518
- **Informed**: Future contributors and users

## References

- [PEP 517 - A build-system independent format for source trees](https://peps.python.org/pep-0517/)
- [PEP 518 - Specifying Minimum Build System Requirements](https://peps.python.org/pep-0518/)
- [Python Packaging User Guide - Packaging Python Projects](https://packaging.python.org/tutorials/packaging-projects/)
- [src layout documentation](https://hynek.me/articles/testing-packaging/)

---

*This ADR follows the format: Context (*), Date (*), Status (*), Options, Decision (*), Consequences (*), People involved*
