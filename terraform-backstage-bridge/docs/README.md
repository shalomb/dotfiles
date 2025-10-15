# Documentation Index

This directory contains comprehensive documentation for the Terraform Variables Parser project.

## 📁 Directory Structure

```
docs/
├── README.md                    # This file - documentation index
├── REQUIREMENTS.md              # System requirements and dependencies
├── adr/                         # Architecture Decision Records
│   ├── 001-package-structure.md     # Package and publishing decisions
│   ├── 002-yaml-output-format.md    # YAML format implementation
│   └── 003-harness-idp-template-generation.md  # Harness IDP feature
├── analysis/                    # Analysis and research documents
│   ├── BUILDING_BLOCK_ANALYSIS.md   # Analysis of Terraform building blocks
│   ├── COMPLEX_TYPE_ANALYSIS.md     # Complex type pattern analysis
│   └── DOCUMENTATION_REORGANIZATION.md  # Documentation structure changes
├── development/                 # Development-related documentation
│   ├── MYPY_FIXES.md           # MyPy type checking fixes and solutions
│   ├── PRE_COMMIT.md           # Pre-commit hooks setup and usage
│   └── TEST_CONSOLIDATION_SUMMARY.md  # Test consolidation improvements
└── features/                    # Feature-specific documentation
    ├── any-type-warnings.md    # Any type warnings system documentation
    ├── harness-idp-integration.md  # Harness IDP integration guide
    └── ROBUSTNESS_ENHANCEMENTS.md  # Test fixture robustness improvements
```

## 📖 Documentation Categories

### 🏛️ Architecture Decision Records (`adr/`)
Formal documentation of architectural decisions:

- **[ADR-001: Package Structure](adr/001-package-structure.md)** - Package organization and PyPI publishing decisions
- **[ADR-002: YAML Output Format](adr/002-yaml-output-format.md)** - YAML format implementation approach
- **[ADR-003: Harness IDP Template Generation](adr/003-harness-idp-template-generation.md)** - Comprehensive Harness IDP integration

### � Analysis Documentation (`analysis/`)
Research and analysis documents:

- **[BUILDING_BLOCK_ANALYSIS.md](analysis/BUILDING_BLOCK_ANALYSIS.md)** - Analysis of real-world Terraform building blocks
- **[COMPLEX_TYPE_ANALYSIS.md](analysis/COMPLEX_TYPE_ANALYSIS.md)** - Complex type pattern analysis across building blocks
- **[DOCUMENTATION_REORGANIZATION.md](analysis/DOCUMENTATION_REORGANIZATION.md)** - Documentation structure evolution

### �🔧 Development Documentation (`development/`)
Technical documentation for developers working on the project:

- **[MYPY_FIXES.md](development/MYPY_FIXES.md)** - Solutions for MyPy type checking issues
- **[PRE_COMMIT.md](development/PRE_COMMIT.md)** - Pre-commit hooks configuration and usage
- **[TEST_CONSOLIDATION_SUMMARY.md](development/TEST_CONSOLIDATION_SUMMARY.md)** - Test suite organization improvements

### 🚀 Features Documentation (`features/`)
Documentation for specific features and enhancements:

- **[any-type-warnings.md](features/any-type-warnings.md)** - Warning system for `any` type usage
- **[harness-idp-integration.md](features/harness-idp-integration.md)** - Complete Harness IDP integration guide
- **[ROBUSTNESS_ENHANCEMENTS.md](features/ROBUSTNESS_ENHANCEMENTS.md)** - Test fixture robustness improvements

### 📋 Requirements

- **[REQUIREMENTS.md](REQUIREMENTS.md)** - System requirements and dependency information

## 🔗 Related Documentation

- **[Main README](../README.md)** - Project overview, installation, and usage
- **[CHANGELOG](../CHANGELOG.md)** - Version history and release notes
- **[ADR Directory](adr/)** - Architecture Decision Records

## 📝 Contributing to Documentation

When adding new documentation:

1. **Architecture decisions** → Place in `adr/` directory with numbered ADR format
2. **Analysis and research** → Place in `analysis/` directory
3. **Development docs** → Place in `development/` directory
4. **Feature docs** → Place in `features/` directory
5. **General docs** → Place in root `docs/` directory
6. **Update this index** → Add entries to the appropriate sections above

## 🎯 Quick Links

- [Project README](../README.md#readme)
- [Installation Guide](../README.md#installation)
- [Usage Examples](../README.md#usage)
- [API Documentation](../README.md#api-reference)
- [Contributing Guide](../README.md#contributing)
