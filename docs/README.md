# Documentation Structure

This documentation follows the **Diataxis framework** for technical documentation, organizing content into four distinct types based on user needs.

## Documentation Types

### 📚 **Tutorials** (`tutorials/`)
**Learning-oriented** - Step-by-step guides for newcomers

**Available:**
- [GPG BDD Scenarios](./tutorials/gpg-bdd-scenarios.md) - Behavior-driven development scenarios for GPG integration

### 🎯 **How-to Guides** (`how-to-guides/`)
**Problem-oriented** - Practical solutions for specific tasks

**Available:**
- [GPG TUI Setup](./how-to-guides/gpg-tui-setup.md) - How to configure GPG in terminal environments

### 📖 **Technical Reference** (`technical-reference/`)
**Information-oriented** - Detailed technical specifications

**Available:**
- [Agent Context Documentation](./technical-reference/agent-context-documentation.md) - Standards for agent context headers
- [Bash Standards](./technical-reference/bash-standards/) - Bash coding standards and references
  - [Bash Practices](./technical-reference/bash-standards/bash-practices.html) - Modern bash practices
  - [Bash FAQ 073](./technical-reference/bash-standards/bash-faq-073.html) - Parameter expansions
  - [Bash Pitfalls](./technical-reference/bash-standards/bash-pitfalls.html) - Common mistakes
- [Cursor Agent GPG Integration](./technical-reference/cursor-agent-gpg-integration.md) - Technical specifications
- [Shell Sourcing Analysis](./reference/shell-sourcing-analysis.md) - Detailed shell sourcing flow analysis
- [Variable Sourcing Analysis](./reference/variable-sourcing-analysis.md) - Variable, function, and alias sourcing analysis

### 💡 **Explanation** (`explanation/`)
**Understanding-oriented** - Conceptual background and context

**Available:**
- [End-State Evolution](./explanation/end-state-evolution.md) - How the end-state evolves and discovery process
- [GPG TUI Integration](./explanation/gpg-tui-integration.md) - Why and how GPG works in TUI environments
- [Final Shell Sourcing Analysis](./explanation/FINAL-SHELL-SOURCING-ANALYSIS.md) - Proven consistency across all shell types
- [Final Variable Sourcing Proof](./explanation/FINAL-VARIABLE-SOURCING-PROOF.md) - Cleanroom validation of sourcing model
- [Architecture Decision Records](./explanation/decisions/) - Key architectural decisions
  - [ADR-001: Environment Variables in Login Shells](./explanation/decisions/ADR-001-environment-variables-in-login-shells.md)
  - [ADR-002: tmuxie Script Replacement](./explanation/decisions/ADR-002-tmuxie-script-replacement.md)
  - [ADR-003: XDG-Compliant Bash Deployment](./explanation/decisions/ADR-003-xdg-compliant-bash-deployment.md)

## Key Documentation Areas

### 🔐 **GPG Integration**
- **Problem**: GPG pinentry fails in TUI environments (tmux, SSH, cursor-agent)
- **Solution**: Comprehensive GPG workflow documentation and tooling
- **Focus**: Mandatory GPG signing for all commits

### 🤖 **Agent Integration**
- **Problem**: Agent workflows need clear context and standards
- **Solution**: Agent context documentation and coding standards
- **Focus**: Prevent misunderstandings and improve efficiency

### 🛠️ **Development Standards**
- **Problem**: Inconsistent bash coding practices
- **Solution**: Bash standards documentation and validation
- **Focus**: Modern bash practices, shellcheck integration

### 🧪 **Testing Framework**
- **Problem**: Need comprehensive validation of shell sourcing behavior
- **Solution**: Behavioral testing framework with cleanroom validation
- **Focus**: Prove consistency across all shell types and contexts

## Documentation Standards

- **Diataxis Compliance**: Clear separation of documentation types
- **BDD Modeling**: Workflows documented with Given-When-Then scenarios
- **Practical Focus**: Real-world problems and solutions
- **Agent-Friendly**: Documentation optimized for AI agent consumption
- **Living Documentation**: Updated with architectural decisions and changes

## Quick Navigation

**Getting Started:**
- Start with [GPG TUI Setup](./how-to-guides/gpg-tui-setup.md) for basic configuration
- Read [GPG TUI Integration](./explanation/gpg-tui-integration.md) for understanding

**Development:**
- Reference [Bash Standards](./technical-reference/bash-standards/) for coding
- Follow [Agent Context Documentation](./technical-reference/agent-context-documentation.md) for file headers

**Architecture:**
- Review [Architecture Decision Records](./explanation/decisions/) for context
- Check [Architecture Directory](./architecture/) for additional ADRs
- Understand [Cursor Agent GPG Integration](./technical-reference/cursor-agent-gpg-integration.md) for technical details

**Testing:**
- Run [Shell Sourcing Tests](../tests/shell-sourcing/) for validation
- Review [Final Analysis](./explanation/FINAL-SHELL-SOURCING-ANALYSIS.md) for conclusions