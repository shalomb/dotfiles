# Documentation Structure

This documentation follows the **Diataxis framework** for technical documentation, organizing content into four distinct types:

## Documentation Types

### 📚 **Tutorials** (`tutorials/`)
**Learning-oriented** - Step-by-step guides for newcomers
- How to set up GPG signing in TUI environments
- How to configure cursor-agent for GPG integration
- How to troubleshoot GPG pinentry issues

### 🎯 **How-to Guides** (`how-to-guides/`)
**Problem-oriented** - Practical solutions for specific tasks
- How to fix GPG pinentry in tmux/SSH sessions
- How to configure GPG agent for cursor-agent
- How to validate GPG signing in CI/CD

### 📖 **Technical Reference** (`technical-reference/`)
**Information-oriented** - Detailed technical specifications
- GPG configuration reference
- cursor-agent API documentation
- Environment variable specifications

### 💡 **Explanation** (`explanation/`)
**Understanding-oriented** - Conceptual background and context
- Why GPG signing is mandatory
- How TUI environments affect GPG workflows
- The cursor-agent GPG integration architecture

## Key Documentation Areas

### 🔐 **GPG Integration**
- **Problem**: GPG pinentry fails in TUI environments (tmux, SSH, cursor-agent)
- **Solution**: Comprehensive GPG workflow documentation and tooling
- **Focus**: Mandatory GPG signing for all commits

### 🤖 **Cursor-Agent Integration**
- **Problem**: Agent workflows need GPG signing capability
- **Solution**: cursor-agent GPG integration design
- **Focus**: Seamless GPG operations in agent environments

## Documentation Standards

- **BDD Modeling**: All workflows documented with Given-When-Then scenarios
- **Diataxis Compliance**: Clear separation of documentation types
- **Practical Focus**: Real-world problems and solutions
- **Agent-Friendly**: Documentation optimized for AI agent consumption