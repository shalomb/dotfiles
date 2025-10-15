# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of terraform-parser library
- Support for parsing all Terraform variable types
- CLI interface for parsing Terraform files
- Comprehensive test suite
- GitHub Actions CI/CD pipeline

## [0.1.0] - 2025-08-05

### Added
- Complete Terraform variables.tf parser
- Support for primitive types (string, number, bool, any)
- Support for collection types (list, set, map)
- Support for structural types (object, tuple)
- Complex nested type parsing
- Variable metadata extraction (description, default, sensitive, nullable, validation)
- CLI tool with JSON and summary output formats
- Comprehensive test coverage
- Package structure ready for PyPI distribution

### Features
- **Type System**: Full support for Terraform's type system
- **CLI Interface**: Command-line tool for parsing files
- **Library API**: Programmatic access to parser functionality
- **Extensible**: Modular design for easy extension

### Technical
- Python 3.10+ support
- Modern type hints using PEP 585 syntax
- Comprehensive error handling
- Development tooling (linting, formatting, testing)
