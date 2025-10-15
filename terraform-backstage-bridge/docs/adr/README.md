# Architectural Decision Records (ADR)

This directory contains Architectural Decision Records for the terraform-parser project. ADRs document important architectural decisions, their context, alternatives considered, and consequences.

## Format

Each ADR follows a structured format with the following required sections (marked with *):

- **Context** (*): The situation that led to the decision
- **Date** (*): When the decision was made
- **Status** (*): Current state (Proposed | Accepted | Rejected | Deprecated | Superseded)
- **Options**: Alternatives that were considered
- **Decision** (*): What was decided and why
- **Consequences** (*): Positive and negative impacts
- **People Involved**: Who was involved in the decision

## Naming Convention

ADR files should be named using the pattern: `XXX-title-of-decision.md` where XXX is a zero-padded number.

Examples:
- `001-package-structure.md`
- `002-dependency-management.md`
- `003-testing-strategy.md`

## Status Values

- **Proposed**: Decision is under consideration
- **Accepted**: Decision has been approved and implemented
- **Rejected**: Decision was considered but not adopted
- **Deprecated**: Decision is no longer relevant
- **Superseded by ADR-XXX**: Decision was replaced by a newer ADR

## Current ADRs

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [001](001-package-structure.md) | Package Structure and PyPI Publishing | Accepted | 2025-08-06 |
| [002](002-yaml-output-format.md) | YAML Output Format Support | Accepted | 2025-08-06 |

## Template

Use the [template.md](template.md) file as a starting point for new ADRs.

## References

- [Documenting Architecture Decisions by Michael Nygard](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
