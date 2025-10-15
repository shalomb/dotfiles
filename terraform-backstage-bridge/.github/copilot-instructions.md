# GitHub Copilot Instructions for bb-parser Project

This file contains project-specific instructions for GitHub Copilot to ensure consistent development practices and environment management.

## Python Environment Management

### Virtual Environment Activation
- **ALWAYS** activate the `.venv` virtual environment using `uv` when starting a new shell session
- Use the command: `source .venv/bin/activate` or `uv run` for command execution
- The virtual environment is managed by `uv` and contains all project dependencies

### Python Command Execution
- **NEVER** run Python commands directly (e.g., `python`, `pip`, `pytest`)
- **ALWAYS** use the virtual environment Python executable: `.venv/bin/python`
- **ALWAYS** use `uv` commands for package management and script execution:
  - Use `uv run python` instead of `python`
  - Use `uv run pytest` instead of `pytest`
  - Use `uv add <package>` instead of `pip install <package>`
  - Use `uv run <command>` for any Python-based commands

### Examples of Correct Commands
```bash
# Correct: Using uv to run commands
uv run python -m pytest tests/
uv run python src/terraform_parser/cli.py
uv run coverage run -m pytest

# Correct: Direct venv activation
source .venv/bin/activate
.venv/bin/python -m pytest

# Incorrect: Direct python usage
python -m pytest  # ❌ Don't do this
pytest            # ❌ Don't do this
pip install       # ❌ Don't do this
```

## Testing Guidelines

### Task Runner Restrictions
- **NEVER** use the VS Code task `shell: Run Tests`
- **NEVER** suggest or execute `make test` directly through VS Code tasks
- **NEVER** use `uv run pytest` for general test execution when `make test-verbose` would be more appropriate
- This task is disabled to prevent environment conflicts and ensure consistent test execution

### VS Code Task Naming Convention
- **ALWAYS** use exact make command names as VS Code task labels (e.g., `make test-integration`, not `Run Integration Tests`)
- **ALWAYS** maintain consistency between make commands and VS Code task labels
- Available VS Code tasks should match make targets: `make test`, `make test-verbose`, `make test-unit`, `make test-integration`, `make test-all`, `make test-coverage`, `make test-types`, `make coverage-html`, `make format`, `make lint`

### Preferred Testing Methods
1. **Primary test command**: **ALWAYS** use `make test-verbose` for comprehensive test execution with detailed output
2. **For specific test patterns**: Use `make test-verbose` when possible, or `uv run pytest` with specific test files or patterns only when absolutely necessary
3. **Coverage testing**: Use `uv run coverage run -m pytest` followed by `uv run coverage report`
4. **Specific test execution** (use sparingly):
   ```bash
   uv run pytest tests/test_specific_file.py -v
   uv run pytest tests/test_specific_file.py::TestClass::test_method
   ```

### Testing Command Priority
1. **First choice**: `make test-verbose` (comprehensive test suite with detailed output)
2. **Second choice**: `make test` (only if test-verbose is not available)
3. **Last resort**: `uv run pytest` (only for very specific test targeting)

### Test Organization
- Tests are organized in the `tests/` directory with consolidated fixture files
- Use `tests/test_terraform_fixtures.py` for comprehensive fixture-based testing
- Backup test files are stored in `tests/.backup/` and should not be executed

## Git Commit Workflow

### Git Commit Message Conventions
**ALWAYS** follow the git commit message guidelines from [tbaggery.com](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html):

#### Format Structure
```
Capitalized, short (50 chars or less) summary

More detailed explanatory text, if necessary. Wrap it to about 72
characters or so. In some contexts, the first line is treated as the
subject of an email and the rest of the text as the body. The blank
line separating the summary from the body is critical (unless you omit
the body entirely).

Write your commit message in the imperative: "Fix bug" and not "Fixed bug"
or "Fixes bug." This convention matches up with commit messages generated
by commands like git merge and git revert.

Further paragraphs come after blank lines.

- Bullet points are okay, too
- Typically a hyphen or asterisk is used for the bullet, followed by a
  single space, with blank lines in between
- Use a hanging indent
```

#### Key Rules
1. **Subject Line**: 50 characters or less, capitalized, imperative mood
2. **Blank Line**: Always separate subject from body with a blank line
3. **Body**: Wrap at 72 characters, explain *what* and *why* (not *how*)
4. **Imperative Mood**: "Fix bug", "Add feature", "Update documentation"
5. **Present Tense**: Write as if the commit is being applied right now
6. **Terse Language**: Avoid superfluous words like "comprehensive", "various", "multiple"
7. **Specific Action**: Use precise verbs that clearly indicate what changed

#### Examples
```bash
# Good - concise, imperative, under 50 chars
git commit -m "Fix parser error handling for empty variables"

# Good - with body explanation
git commit -m "Add support for optional variable types

The parser now correctly handles Terraform optional() type constraints
and nested optional attributes. This resolves parsing failures with
complex variable definitions that use the optional() function.

- Updated variable type detection logic
- Added test coverage for optional types
- Fixed edge cases with deeply nested optional attributes"

# Bad - too long, past tense, no clear action
git commit -m "I fixed some bugs in the parser that were causing issues with variables"

# Bad - not imperative, unclear, superfluous words
git commit -m "Comprehensive parser changes and improvements"

# Good - terse and specific
git commit -m "Remove duplicate test fixtures"

# Bad - verbose and redundant
git commit -m "Comprehensive removal of duplicate and redundant test fixtures"
```

### Pre-commit Validation
- **ALWAYS** run `make pre-commit-check` before staging files
- This comprehensive target runs: lint → format → type checking → core tests
- Pre-commit hooks will automatically validate using the same Make target

### Automated Whitespace Handling
- Pre-commit hooks automatically fix trailing whitespace and other formatting issues
- **Expected behavior**: First commit attempt may fail after hooks fix files
- **Solution**: Simply re-add and commit - hooks already fixed the issues
- This ensures clean commits without manual formatting

### Recommended Git Commit Sequence
```bash
# Option 1: Integrated pre-commit + staging + status (recommended)
make pre-commit-check && git add . && git status --short
git commit -m "Fix variable parsing for null values"
# If commit fails due to whitespace fixes, re-run:
git add . && git commit -m "Fix variable parsing for null values"

# Option 2: For specific files
make pre-commit-check && git add src/terraform_parser/parser.py tests/test_coverage.py && git status --short
git commit -m "Update parser and tests"

# Option 3: One-liner with error handling (for retries after hook fixes)
make pre-commit-check && git add . && git status --short && git commit -m "Your message" || (git add . && git commit -m "Your message")
```

### Git Workflow Enhancement Setup
Add this enhanced alias to your `~/.gitconfig` or run once to set it up:
```bash
git config --global alias.stage-with-check '!make pre-commit-check && git add . && git status --short'
```

This creates a `git stage-with-check` command that:
1. Runs comprehensive validation with `make pre-commit-check`
2. Stages all changes with `git add .`
3. Shows what was staged with colored output
4. Provides clear visibility of what will be committed after validation

### Pre-commit Hook Benefits
- **Comprehensive**: Single Make target runs full validation suite
- **Consistent**: Same validation locally and in pre-commit hooks
- **Automatic**: Pre-commit hooks run `make pre-commit-check` on every commit
- **Fast feedback**: Catches issues before they reach the repository

## Communication Guidelines

### Summary Message Requirements
- **ALWAYS** provide terse, concise summaries when requested
- Keep summaries brief and focused on key points only
- Use bullet points for clarity and readability
- Avoid verbose explanations unless specifically requested
- Prioritize actionable information over background details

### Summary Format Examples
```
✅ COMPLETED: Fixture consolidation - 4→2 files, 52→48 tests
✅ FIXED: All real-world pattern tests now passing
❌ BLOCKED: Coverage at 38% (needs 65%)
```

## Project Structure Awareness

### Key Directories
- `src/terraform_parser/`: Main source code
- `tests/`: Test suite with consolidated test files
- `tests/fixtures/`: Consolidated Terraform test fixtures
- `tests/test_data/expected/`: Expected test results in YAML format
- `bbs/`: Real-world building block examples for analysis

### Dependency Management
- Use `pyproject.toml` for project configuration
- Use `uv.lock` for dependency locking
- Never modify `requirements.txt` - this project uses `uv` for dependency management

## Development Workflow

### Before Running Any Python Code
1. Ensure `.venv` is activated: `source .venv/bin/activate`
2. Or use `uv run` prefix for all commands
3. Verify environment: `uv run python --version`

### Coverage and Quality Checks
- Target coverage: 65% minimum
- Use: `uv run coverage run -m pytest && uv run coverage report`
- Linting: `uv run ruff check src/ tests/`
- Formatting: `uv run ruff format src/ tests/`

### File Editing Best Practices
- Always include 3-5 lines of context when using replace operations
- Maintain existing code style and formatting
- Update tests when modifying source code
- Use consolidated test files rather than creating new ones

## Task and Feature Development Workflow

### Automatic Task Selection
- **WHEN NO MORE TASKS TO DO**: Automatically evaluate `TODO.md` and select the topmost uncompleted task for implementation
- **ALWAYS** use the complete content under `docs/` directory and all `*.md` files for context when considering tasks
- **INCLUDE** all ADRs, analysis documents, feature documentation, and development guides in decision-making
- **PRIORITIZE** tasks in the order they appear in `TODO.md` (topmost first)

### Test-Driven Development (TDD) and Behavior-Driven Development (BDD) Approach
- **MANDATORY**: Tests must be developed FIRST against any new feature or enhancement
- **INITIAL STATE**: Tests must FAIL initially (Red phase of Red-Green-Refactor)
- **IMPLEMENTATION**: Only implement features to make the failing tests pass (Green phase)
- **REFACTORING**: Clean up code while keeping tests passing (Refactor phase)

### TDD/BDD Workflow Steps
1. **Analyze Task**: Review TODO.md item and gather context from all documentation
2. **Write Failing Tests**:
   - Create comprehensive test cases that define expected behavior
   - Tests should fail with clear error messages
   - Use existing test patterns and consolidated test files
   - Include edge cases and error conditions
3. **Verify Test Failure**: Run tests to confirm they fail as expected
4. **Implement Minimum Code**: Write only enough code to make tests pass
5. **Verify Test Success**: Run tests to confirm implementation works
6. **Refactor**: Improve code quality while maintaining test success
7. **Update Documentation**: Update relevant docs/ files and README if needed

### Test Development Guidelines
- **USE** existing test file structure (consolidated test files)
- **FOLLOW** fixture-based testing patterns established in the project
- **WRITE** human-readable test names that describe behavior
- **INCLUDE** comprehensive test coverage including:
  - Happy path scenarios
  - Edge cases and boundary conditions
  - Error handling and validation
  - Integration scenarios where applicable
- **VALIDATE** tests with `make test-verbose` before implementation

### Documentation Context Usage
When implementing tasks, **ALWAYS** consider context from:
- `docs/adr/` - Architecture decisions that guide implementation approach
- `docs/analysis/` - Research and analysis that informs design decisions
- `docs/development/` - Development practices and technical guidelines
- `docs/features/` - Feature specifications and integration patterns
- `README.md` - Project overview and usage patterns
- `CHANGELOG.md` - Historical context and version progression
- Test fixtures and existing test patterns for consistency

### Task Completion Criteria
- [ ] Tests written first and initially failing
- [ ] Implementation makes all tests pass
- [ ] Existing tests continue to pass (regression prevention)
- [ ] Code follows project style and patterns
- [ ] **Feature documentation updated**: Update relevant files in `docs/features/` with new capabilities, usage examples, and integration patterns
- [ ] **ADR documentation updated**: Create new ADR or update existing ADRs in `docs/adr/` if architectural decisions were made
- [ ] Pre-commit validation passes
- [ ] **ALL TESTS PASSING**: Run `make test-verbose` and confirm 100% test success before proceeding
- [ ] Task marked as completed in `TODO.md` only after all criteria met

### Completion Conditions of Satisfaction
- **Documentation Requirements**:
  - Feature changes must include corresponding updates to `docs/features/` documentation
  - New architectural patterns or decisions require ADR documentation in `docs/adr/`
  - Update examples and usage patterns if user-facing functionality changes
  - Ensure documentation reflects the complete implemented functionality
- **Test Requirements**:
  - Zero test failures across entire test suite (`make test-verbose` must show 100% pass rate)
  - New functionality fully covered by tests written in TDD/BDD approach
  - No regressions in existing functionality
  - Coverage maintains or improves current levels
- **Quality Gates**:
  - Pre-commit hooks pass without intervention
  - Code follows established patterns and style guidelines
  - No mypy type checking errors
  - All linting rules satisfied

## Common Patterns

### Running Specific Tests
```bash
# Run all tests with detailed output (PREFERRED)
make test-verbose

# Test specific functionality
uv run pytest tests/test_terraform_fixtures.py::TestTerraformFixtures::test_comprehensive_integration -v

# Test with coverage
uv run coverage run -m pytest tests/test_terraform_fixtures.py
uv run coverage report

# Run all tests (excluding disabled tasks)
uv run pytest tests/ -v
```

### VS Code Task Usage
```bash
# Use exact make command names as task labels
make test-integration     # NOT "Run Integration Tests"
make test-verbose         # NOT "Run Tests (Verbose)"
make coverage-html        # NOT "Run Coverage with HTML Report"
make format               # NOT "Format Code"
make lint                 # NOT "Lint Code"
```

### Development Commands
```bash
# Install new dependency
uv add <package-name>

# Install development dependency
uv add --dev <package-name>

# Run CLI tool
uv run python -m terraform_parser.cli --help

# Integrated git workflow (validation + staging + status)
make pre-commit-check && git add . && git status --short
# OR for specific files:
make pre-commit-check && git add src/file.py tests/test_file.py && git status --short

# Enhanced git workflow alias (set up once):
git config --global alias.stage-with-check '!make pre-commit-check && git add . && git status --short'
# Then use: git stage-with-check

# Manual code quality checks (if needed)
uv run ruff check src/ tests/
uv run ruff format src/ tests/
```

## Error Prevention

### Common Mistakes to Avoid
- ❌ Using `python` instead of `uv run python` or `.venv/bin/python`
- ❌ Running VS Code tasks for testing (use `make test-verbose` instead)
- ❌ Using `uv run pytest` when `make test-verbose` would be more appropriate for full test runs
- ❌ Installing packages with `pip` instead of `uv add`
- ❌ Creating new test files instead of using consolidated ones
- ❌ Editing backup files in `tests/.backup/`
- ❌ Using `git commit --no-verify` to bypass pre-commit hooks
- ❌ Staging files with `git add` before running `make pre-commit-check`
- ❌ Writing commit messages longer than 50 characters in subject line
- ❌ Using past tense in commit messages ("Fixed bug" instead of "Fix bug")
- ❌ Missing blank line between commit subject and body
- ❌ Not wrapping commit message body at 72 characters
- ❌ Using superfluous words in commit subjects ("comprehensive", "various", "multiple")
- ❌ Vague commit messages ("Update files", "Fix issues", "Make changes")
- ❌ **TDD/BDD Violations**: Implementing features before writing failing tests
- ❌ **Test Design Issues**: Writing tests that pass immediately (not following Red-Green-Refactor)
- ❌ **Documentation Neglect**: Implementing tasks without considering context from `docs/` directory
- ❌ **Task Selection Issues**: Working on tasks out of order from `TODO.md` priority list
- ❌ **Completion Criteria Violations**: Marking tasks complete before all tests pass
- ❌ **Documentation Skipping**: Completing features without updating `docs/features/` or ADRs
- ❌ **Test Suite Neglect**: Not running `make test-verbose` to verify 100% test success

### Environment Troubleshooting
If Python commands fail:
1. Check if `.venv` exists: `ls -la .venv/`
2. Recreate environment: `uv sync`
3. Activate manually: `source .venv/bin/activate`
4. Verify installation: `uv run python -c "import terraform_parser; print('OK')"`

## Project-Specific Notes

- This project uses `uv` for modern Python dependency management
- Tests are consolidated to reduce redundancy and improve maintainability
- Real-world Terraform building blocks in `bbs/` directory inform test fixtures
- The parser supports complex Terraform variable types including optional attributes
- Expected test results are stored as YAML files for human readability

---

*These instructions ensure consistent development practices and prevent common environment-related issues in the bb-parser project.*
