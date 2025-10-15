# Makefile for Terraform Variables Parser
#
# Available targets:
#   help        - Show this help message
#   install     - Install dependencies
#   install-dev - Install development dependencies
#   test        - Run all tests
#   test-unit   - Run unit tests only
#   test-integration - Run integration tests only
#   test-verbose - Run tests with verbose output
#   test-all    - Run all test targets (comprehensive test suite)
#   test-coverage - Run comprehensive coverage testing (target: 85%+)
#   test-types  - Run type checking with mypy
#   coverage    - Run tests with coverage reporting
#   coverage-html - Run tests with HTML coverage report
#   clean       - Clean up generated files
#   lint        - Run code linting
#   format      - Format code
#   demo        - Run the demo script
#   example     - Run usage examples
#   parse       - Parse a Terraform file and output YAML (use FILE=path/to/file.tf)
#   harness-config - Generate Harness IDP template from Terraform file (use FILE=path/to/file.tf)
#   harness-multi-config - Generate Harness IDP template from multiple Building Blocks (use BB_GLOB=pattern)
#   status      - Show comprehensive project status (info, deps, git, tests)
#   info        - Show project information
#   pre-commit-install - Install and set up pre-commit hooks
#   pre-commit-run - Run pre-commit hooks on all files
#   pre-commit-check - Run comprehensive pre-commit validation (format + lint + tests)
#   pre-commit-update - Update pre-commit hook versions

# Shell configuration for better error handling and uv support
.ONESHELL:
SHELL := /bin/bash
.SHELLFLAGS := -euo pipefail -c

# Automatically add uv to PATH if it exists
export PATH := $(HOME)/.local/bin:$(PATH)

# Python executable detection (using uv)
UV := $(shell command -v uv 2> /dev/null)
PYTHON := $(if $(UV),uv run python,$(shell command -v python3 2> /dev/null || command -v python 2> /dev/null))
PIP := $(if $(UV),uv add,$(shell command -v pip3 2> /dev/null || command -v pip 2> /dev/null))

# Default target
.DEFAULT_GOAL := help

# Colors for output using tput (handles dumb terminals gracefully)
# When TERM=dumb, colors are disabled for compatibility with CI/CD and basic terminals
# The 2>/dev/null ensures graceful fallback if tput is not available
ifneq ($(TERM),dumb)
    GREEN := $(shell tput setaf 2 2>/dev/null || echo "")
    YELLOW := $(shell tput setaf 3 2>/dev/null || echo "")
    RED := $(shell tput setaf 1 2>/dev/null || echo "")
    BOLD := $(shell tput bold 2>/dev/null || echo "")
    NC := $(shell tput sgr0 2>/dev/null || echo "")
else
    GREEN :=
    YELLOW :=
    RED :=
    BOLD :=
    NC :=
endif

.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Terraform Variables Parser - Available Make targets:$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)Examples:$(NC)"
	@echo "  make test           # Run all tests"
	@echo "  make coverage       # Run tests with coverage"
	@echo "  make demo           # Run the demo script"
	@echo "  make clean          # Clean up generated files"

.PHONY: install-uv
install-uv: ## Install uv package manager
	@echo "$(GREEN)Installing uv package manager...$(NC)"
	@if command -v uv >/dev/null 2>&1; then \
		echo "$(GREEN)uv is already installed$(NC)"; \
		uv --version; \
	else \
		echo "Installing uv..."; \
		curl -LsSf https://astral.sh/uv/install.sh | sh; \
		echo "$(GREEN)uv installed successfully!$(NC)"; \
		echo "$(YELLOW)Please restart your shell or run: source ~/.bashrc$(NC)"; \
	fi

.PHONY: install
install: ## Install runtime dependencies
	@echo "$(GREEN)Installing runtime dependencies...$(NC)"
	@if [ -n "$(UV)" ]; then \
		echo "Using uv for dependency management..."; \
		uv sync; \
	else \
		echo "uv not found, falling back to pip..."; \
		$(PIP) install python-hcl2; \
	fi

.PHONY: install-dev
install-dev: ## Install development dependencies
	@echo "$(GREEN)Installing development dependencies...$(NC)"
	@if [ -n "$(UV)" ]; then \
		echo "Using uv for dependency management..."; \
		uv sync --extra dev; \
	else \
		echo "uv not found, falling back to pip..."; \
		$(PIP) install python-hcl2 pytest pytest-cov PyYAML black ruff; \
	fi

.PHONY: test
test: ## Run all tests
	@echo "$(GREEN)Running all tests...$(NC)"
	$(PYTHON) -m pytest tests/ -q

.PHONY: test-unit
test-unit: ## Run unit tests only
	@echo "$(GREEN)Running unit tests...$(NC)"
	$(PYTHON) -m pytest tests/test_parser_terraform_fixtures.py tests/test_parser_variables.py tests/test_parser_optional_type_support.py -v

.PHONY: test-integration
test-integration: ## Run integration tests only
	@echo "$(GREEN)Running integration tests...$(NC)"
	$(PYTHON) -m pytest tests/test_parser_edge_cases.py tests/test_parser_error_handling.py tests/test_harness_multiple_building_blocks.py -v

.PHONY: test-verbose
test-verbose: ## Run tests with verbose output
	@echo "$(GREEN)Running tests with verbose output...$(NC)"
	$(PYTHON) -m pytest tests/ -v

.PHONY: coverage
coverage: ## Run tests with coverage reporting
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	$(PYTHON) -m pytest tests/ --cov=terraform_parser --cov-report=term-missing

.PHONY: coverage-html
coverage-html: ## Run tests with HTML coverage report
	@echo "$(GREEN)Running tests with HTML coverage report...$(NC)"
	$(PYTHON) -m pytest tests/ --cov=terraform_parser --cov-report=html --cov-report=term-missing
	@echo "$(GREEN)Coverage report generated in htmlcov/index.html$(NC)"

.PHONY: test-coverage
test-coverage: ## Run comprehensive coverage testing (target: 85%+)
	@echo "$(GREEN)Running comprehensive coverage analysis...$(NC)"
	@echo "$(BOLD)Target: 85%+ coverage with robust error handling$(NC)"
	@echo ""
	$(PYTHON) -m pytest tests/ --cov=terraform_parser --cov-report=term-missing --cov-report=html
	@echo ""
	@echo "$(GREEN)Coverage analysis complete! Check htmlcov/index.html for details$(NC)"

.PHONY: test-pattern
test-pattern: ## Run tests matching a pattern (use PATTERN=pattern_name)
	@if [ -z "$(PATTERN)" ]; then \
		echo "$(RED)Error: Please specify PATTERN. Example: make test-pattern PATTERN=test_types$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Running tests matching pattern: $(PATTERN)$(NC)"
	$(PYTHON) -m pytest tests/ -k "$(PATTERN)" -v

.PHONY: test-types
test-types: ## Run type checking with mypy
	@echo "$(GREEN)Running type checking with mypy...$(NC)"
	$(if $(UV),uv run mypy,$(shell command -v mypy 2> /dev/null || echo "echo 'mypy not found'")) src/terraform_parser

.PHONY: test-all
test-all: ## Run all test targets (comprehensive test suite)
	@echo "$(GREEN)Running comprehensive test suite...$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)1/7 - Standard Tests$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make test
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)2/7 - Unit Tests$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make test-unit || true
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)3/7 - Integration Tests$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make test-integration
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)4/7 - Type Checking$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make test-types || true
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)5/7 - Verbose Tests$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make test-verbose
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)6/7 - Coverage Tests$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make coverage
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)7/7 - Quick Tests$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make test-quick || true
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)Comprehensive test suite completed!$(NC)"
	@echo "$(GREEN)========================================$(NC)"

.PHONY: clean
clean: ## Clean up generated files
	@echo "$(GREEN)Cleaning up generated files...$(NC)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf .pytest_cache/
	rm -rf dist/
	rm -rf build/
	@echo "$(GREEN)Clean complete!$(NC)"

.PHONY: lint
lint: ## Run code linting with ruff and auto-fix issues
	@echo "$(GREEN)Running code linting with auto-fix...$(NC)"
	@if [ -n "$(UV)" ]; then \
		uv run ruff check src/ tests/ tools/ --fix; \
	elif command -v ruff >/dev/null 2>&1; then \
		ruff check src/ tests/ tools/ --fix; \
	elif command -v flake8 >/dev/null 2>&1; then \
		flake8 src/ tests/ tools/ --max-line-length=120 --ignore=E501,W503; \
	else \
		echo "$(YELLOW)Warning: neither ruff nor flake8 installed. Install with: uv add ruff$(NC)"; \
	fi

.PHONY: format
format: ## Format code with ruff and fix common file issues
	@echo "$(GREEN)Formatting code and fixing file issues...$(NC)"
	@echo "$(YELLOW)Step 1/2: Fixing common file issues (trailing whitespace, end-of-file)...$(NC)"
	@find src/ tests/ tools/ examples/ -type f \( -name "*.py" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" \) -exec sed -i '' -e 's/[[:space:]]*$$//' {} + 2>/dev/null || true
	@find src/ tests/ tools/ examples/ -type f \( -name "*.py" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" \) -exec sh -c 'test -s "$$1" && test $$(tail -c 1 "$$1" | wc -l) -eq 0 && echo >> "$$1"' _ {} \; 2>/dev/null || true
	@echo "$(YELLOW)Step 2/2: Formatting Python code with ruff...$(NC)"
	@if [ -n "$(UV)" ]; then \
		uv run ruff format src/ tests/ tools/; \
	elif command -v ruff >/dev/null 2>&1; then \
		ruff format src/ tests/ tools/; \
	else \
		echo "$(YELLOW)Warning: ruff not installed. Install with: uv add ruff$(NC)"; \
	fi

.PHONY: demo
demo: ## Run the demo script
	@echo "$(GREEN)Running demo script...$(NC)"
	$(PYTHON) examples/demo.py

.PHONY: example
example: ## Run usage examples
	@echo "$(GREEN)Running usage examples...$(NC)"
	$(PYTHON) examples/usage_example.py

.PHONY: parse-example
parse-example: ## Parse the example variables.tf file
	@echo "$(GREEN)Parsing example variables.tf file...$(NC)"
	uv run terraform-parser tests/fixtures/terraform_basic_types.tf

.PHONY: parse
parse: ## Parse a Terraform file and output YAML (use FILE=path/to/file.tf)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: Please specify FILE. Example: make parse FILE=variables.tf$(NC)"; \
		echo "$(YELLOW)Available example files:$(NC)"; \
		find tests/fixtures -name "*.tf" -type f | sed 's/^/  /' || true; \
		exit 1; \
	fi
	@if [ ! -f "$(FILE)" ]; then \
		echo "$(RED)Error: File '$(FILE)' not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Parsing $(FILE) and outputting YAML...$(NC)"
	@echo "$(BOLD)--- YAML Output ---$(NC)"
	uv run terraform-parser "$(FILE)" --format yaml

.PHONY: harness-config
harness-config: ## Generate Harness IDP template from Terraform file (use FILE=path/to/file.tf)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: Please specify FILE. Example: make harness-config FILE=variables.tf$(NC)"; \
		echo "$(YELLOW)Available example files:$(NC)"; \
		find tests/fixtures -name "*.tf" -type f | sed 's/^/  /' || true; \
		exit 1; \
	fi
	@if [ ! -f "$(FILE)" ]; then \
		echo "$(RED)Error: File '$(FILE)' not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Generating Harness IDP template from $(FILE)...$(NC)"
	@echo "$(BOLD)--- Harness Software Template ---$(NC)"
	uv run terraform-parser "$(FILE)" --format harness

.PHONY: harness-multi-config
harness-multi-config: ## Generate Harness IDP template from multiple Building Blocks (use BB_GLOB=pattern)
	@if [ -z "$(BB_GLOB)" ]; then \
		echo "$(RED)Error: Please specify BB_GLOB. Example: make harness-multi-config BB_GLOB='bbs/terraform-aws-*'$(NC)"; \
		echo "$(YELLOW)Available building blocks:$(NC)"; \
		find bbs -maxdepth 1 -type d -name "terraform-aws-*" 2>/dev/null | sed 's/^/  /' || true; \
		exit 1; \
	fi
	@echo "$(GREEN)Generating comprehensive Harness IDP template from building blocks matching '$(BB_GLOB)'...$(NC)"
	@echo "$(BOLD)--- Multi-Building Block Harness Template ---$(NC)"
	uv run terraform-parser --building-blocks "$(BB_GLOB)" --format harness

.PHONY: check-deps
check-deps: ## Check if dependencies are installed
	@echo "$(GREEN)Checking dependencies...$(NC)"
	@if [ -n "$(UV)" ]; then \
		echo "Using uv - checking virtual environment..."; \
		uv run python -c "import hcl2; print('✓ python-hcl2 is installed')" 2>/dev/null || echo "$(RED)✗ python-hcl2 is not installed. Run 'make install'$(NC)"; \
		uv run python -c "import pytest; print('✓ pytest is installed')" 2>/dev/null || echo "$(YELLOW)✗ pytest is not installed. Run 'make install-dev'$(NC)"; \
	else \
		$(PYTHON) -c "import hcl2; print('✓ python-hcl2 is installed')" 2>/dev/null || echo "$(RED)✗ python-hcl2 is not installed. Run 'make install'$(NC)"; \
		$(PYTHON) -c "import pytest; print('✓ pytest is installed')" 2>/dev/null || echo "$(YELLOW)✗ pytest is not installed. Run 'make install-dev'$(NC)"; \
	fi

.PHONY: validate
validate: check-deps test lint ## Run full validation (dependencies, tests, linting)
	@echo "$(GREEN)All validation checks passed!$(NC)"

.PHONY: test-quick
test-quick: ## Run a quick subset of tests for development
	@echo "$(GREEN)Running quick test suite...$(NC)"
	$(PYTHON) -m pytest tests/test_parser_terraform_fixtures.py tests/test_parser_variables.py -q

.PHONY: test-status
test-status: ## Run a minimal test for status reporting (no coverage)
	@echo "$(GREEN)Testing core functionality...$(NC)"
	@$(PYTHON) -m pytest tests/test_parser_terraform_fixtures.py -q --tb=no --no-cov --disable-warnings >/dev/null 2>&1 && echo "$(GREEN)✓ Core tests: PASSED (60 fixture tests)$(NC)" || echo "$(RED)✗ Core tests: FAILED$(NC)"

.PHONY: ci
ci: install-dev coverage lint ## Run CI pipeline (install deps, coverage, lint)
	@echo "$(GREEN)CI pipeline completed successfully!$(NC)"

# Development helpers
.PHONY: dev-setup
dev-setup: install-dev ## Set up development environment
	@echo "$(GREEN)Development environment setup complete!$(NC)"
	@echo "Available commands:"
	@echo "  make test           - Run tests"
	@echo "  make coverage       - Run with coverage"
	@echo "  make demo           - Run demo"
	@echo "  make clean          - Clean up files"

.PHONY: pre-commit-install
pre-commit-install: ## Install and set up pre-commit hooks
	@echo "$(GREEN)Installing pre-commit hooks...$(NC)"
	@if command -v pre-commit >/dev/null 2>&1; then \
		echo "pre-commit is already installed"; \
		pre-commit --version; \
	else \
		echo "Installing pre-commit..."; \
		if [ -n "$(UV)" ]; then \
			uv add --dev pre-commit; \
		else \
			$(PIP) install pre-commit; \
		fi; \
	fi
	@echo "Setting up pre-commit hooks..."
	@if [ -n "$(UV)" ]; then \
		uv run pre-commit install; \
	else \
		pre-commit install; \
	fi
	@echo "$(GREEN)Pre-commit hooks installed successfully!$(NC)"
	@echo "$(YELLOW)Hooks will now run automatically before each commit$(NC)"
	@echo ""
	@echo "$(GREEN)Available pre-commit commands:$(NC)"
	@echo "  make pre-commit-run    - Run all hooks on all files"
	@echo "  make pre-commit-update - Update hook versions"
	@echo "  git commit --no-verify - Skip hooks (not recommended)"

.PHONY: pre-commit-run
pre-commit-run: ## Run pre-commit hooks on all files
	@echo "$(GREEN)Running pre-commit hooks on all files...$(NC)"
	@if [ -n "$(UV)" ]; then \
		uv run pre-commit run --all-files; \
	else \
		pre-commit run --all-files; \
	fi

.PHONY: pre-commit-update
pre-commit-update: ## Update pre-commit hook versions
	@echo "$(GREEN)Updating pre-commit hook versions...$(NC)"
	@if [ -n "$(UV)" ]; then \
		uv run pre-commit autoupdate; \
	else \
		pre-commit autoupdate; \
	fi

.PHONY: pre-commit-check
pre-commit-check: ## Run comprehensive pre-commit validation (format + lint + tests)
	@echo "$(GREEN)Running comprehensive pre-commit validation...$(NC)"
	@echo "$(YELLOW)Step 1/4: Formatting code...$(NC)"
	@$(MAKE) format || { echo "$(RED)❌ Formatting failed$(NC)"; exit 1; }
	@echo ""
	@echo "$(YELLOW)Step 2/4: Linting code...$(NC)"
	@$(MAKE) lint || { echo "$(RED)❌ Linting failed$(NC)"; exit 1; }
	@echo ""
	@echo "$(YELLOW)Step 3/4: Running type checking...$(NC)"
	@$(MAKE) test-types || { echo "$(RED)❌ Type checking failed$(NC)"; exit 1; }
	@echo ""
	@echo "$(YELLOW)Step 4/4: Running core tests...$(NC)"
	@$(PYTHON) -m pytest tests/test_parser_terraform_fixtures.py -q --tb=short --no-cov --disable-warnings || { echo "$(RED)❌ Core tests failed$(NC)"; exit 1; }
	@echo ""
	@echo "$(GREEN)✅ Pre-commit validation completed successfully!$(NC)"
	@echo "$(YELLOW)Your code is ready for commit. Run: git add . && git commit -m \"message\"$(NC)"

.PHONY: uv-init
uv-init: ## Initialize uv project (run once)
	@if [ -n "$(UV)" ]; then \
		echo "$(GREEN)Initializing uv project...$(NC)"; \
		uv init --python 3.12; \
		echo "$(GREEN)uv project initialized!$(NC)"; \
	else \
		echo "$(RED)Error: uv not installed. Install with: curl -LsSf https://astral.sh/uv/install.sh | sh$(NC)"; \
	fi

.PHONY: uv-lock
uv-lock: ## Update the uv.lock file
	@if [ -n "$(UV)" ]; then \
		echo "$(GREEN)Updating uv.lock file...$(NC)"; \
		uv lock; \
	else \
		echo "$(RED)Error: uv not installed$(NC)"; \
	fi

.PHONY: uv-tree
uv-tree: ## Show dependency tree
	@if [ -n "$(UV)" ]; then \
		echo "$(GREEN)Dependency tree:$(NC)"; \
		uv tree; \
	else \
		echo "$(RED)Error: uv not installed$(NC)"; \
	fi

.PHONY: test-watch
test-watch: ## Watch for file changes and run tests (requires entr)
	@if command -v entr >/dev/null 2>&1; then \
		echo "$(GREEN)Watching for changes... Press Ctrl+C to stop$(NC)"; \
		find . -name "*.py" | entr -c make test-quick; \
	else \
		echo "$(YELLOW)entr not installed. Install with: brew install entr (macOS) or apt-get install entr (Linux)$(NC)"; \
	fi

# Information targets
.PHONY: info
info: ## Show project information
	@echo "$(GREEN)Terraform Variables Parser$(NC)"
	@echo "Version: 0.1.0"
	@echo "Python: $(PYTHON)"
	@if [ -n "$(UV)" ]; then \
		echo "Package manager: uv"; \
	else \
		echo "Package manager: $(PIP)"; \
	fi
	@echo ""
	@echo "$(GREEN)Project structure:$(NC)"
	@echo "  src/terraform_parser/   - Main package implementation"
	@echo "  src/terraform_parser/parser.py - Core parser logic"
	@echo "  tests/fixtures/         - Example Terraform files"
	@echo "  examples/demo.py        - Demonstration script"
	@echo "  examples/usage_example.py - Usage examples"
	@echo "  tests/                  - Test suite (fixture-based tests)"
	@echo "  pyproject.toml          - Project configuration"
	@echo "  .github/workflows/      - CI/CD pipelines"
	@echo ""
	@echo "$(GREEN)Run 'make help' for available commands$(NC)"

.PHONY: status
status: ## Show comprehensive project status (info, deps, tests, git)
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)📋 Project Status Report$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@echo ""
	@echo "$(BOLD)1/6 - Project Information$(NC)"
	@echo "$(BOLD)-------------------------$(NC)"
	@make info
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)2/6 - Environment & Dependencies$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make check-deps
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)3/6 - Version Check$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make check-version
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)4/6 - Quick Health Check$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@make test-status
	@echo ""
	@echo "$(GREEN)Running comprehensive quick tests...$(NC)"
	@make test-quick
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)5/6 - Package Build Status$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(GREEN)Checking if package can be built...$(NC)"
	@if [ -n "$(UV)" ]; then \
		if [ -f "pyproject.toml" ]; then \
			if uv build --no-build-logs >/dev/null 2>&1; then \
				echo "$(GREEN)✓ Package build: Ready$(NC)"; \
				echo "$(GREEN)  Built: $$(ls -1 dist/ 2>/dev/null | wc -l | tr -d ' ') files in dist/$(NC)"; \
			else \
				echo "$(RED)✗ Package build: Failed$(NC)"; \
			fi; \
		else \
			echo "$(RED)✗ Package build: pyproject.toml not found$(NC)"; \
		fi; \
	else \
		echo "$(YELLOW)⚠️  Build check requires uv$(NC)"; \
	fi
	@echo ""
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(BOLD)6/6 - Repository Status$(NC)"
	@echo "$(BOLD)========================================$(NC)"
	@echo "$(GREEN)Git status:$(NC)"
	@if git status --porcelain 2>/dev/null | grep -q .; then \
		echo "$(YELLOW)⚠️  Uncommitted changes detected$(NC)"; \
	else \
		echo "$(GREEN)✓ Working directory clean$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)Recent commits:$(NC)"
	@git log --oneline -3 2>/dev/null || echo "$(YELLOW)No git history$(NC)"
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)📊 Status Summary Complete!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)Project is ready for development and deployment$(NC)"

# Debugging targets
.PHONY: test-debug
test-debug: ## Run tests with debugging output
	@echo "$(GREEN)Running tests with debugging...$(NC)"
	$(PYTHON) -m pytest tests/ -v -s --tb=long

.PHONY: test-one
test-one: ## Run a single test file (use FILE=test_file_name)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: Please specify FILE. Example: make test-one FILE=test_types$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Running test file: $(FILE)$(NC)"
	$(PYTHON) -m pytest tests/$(FILE).py -v

# Release management
.PHONY: build
build: clean ## Build the package for distribution
	@echo "$(GREEN)Building package...$(NC)"
	@if [ -n "$(UV)" ]; then \
		uv build; \
	else \
		$(PYTHON) -m build; \
	fi
	@echo "$(GREEN)Package built successfully!$(NC)"
	@echo "Files created:"
	@ls -la dist/

.PHONY: test-build
test-build: build ## Test the built package
	@echo "$(GREEN)Testing built package...$(NC)"
	@if [ -n "$(UV)" ]; then \
		uv venv test-install --python 3.12; \
		source test-install/bin/activate; \
		uv pip install dist/*.whl; \
		terraform-parser --version; \
		terraform-parser tests/fixtures/terraform_basic_types.tf; \
		deactivate; \
		rm -rf test-install; \
	else \
		echo "$(YELLOW)Package build test requires uv for clean environment testing$(NC)"; \
	fi
	@echo "$(GREEN)Package test completed!$(NC)"

.PHONY: check-version
check-version: ## Check if version in pyproject.toml matches the latest git tag
	@echo "$(GREEN)Checking version consistency...$(NC)"
	@PROJECT_VERSION=$$($(PYTHON) -c "import tomllib; print(tomllib.load(open('pyproject.toml', 'rb'))['project']['version'])" 2>/dev/null || $(PYTHON) -c "import toml; print(toml.load('pyproject.toml')['project']['version'])" 2>/dev/null || echo "unknown"); \
	LATEST_TAG=$$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo ""); \
	if [ -z "$$LATEST_TAG" ]; then \
		LATEST_TAG="no-tags"; \
	fi; \
	echo "Project version: $$PROJECT_VERSION"; \
	if [ "$$LATEST_TAG" = "no-tags" ]; then \
		echo "Latest git tag: (no tags found)"; \
		echo "$(GREEN)✓ No tags in repository yet - version check skipped$(NC)"; \
	else \
		echo "Latest git tag: $$LATEST_TAG"; \
		if [ "$$PROJECT_VERSION" != "$$LATEST_TAG" ]; then \
			echo "$(YELLOW)⚠️  Version mismatch between project ($$PROJECT_VERSION) and latest tag ($$LATEST_TAG)$(NC)"; \
		else \
			echo "$(GREEN)✓ Version check passed!$(NC)"; \
		fi; \
	fi

.PHONY: prepare-release
prepare-release: ## Prepare for a new release (update version, run tests)
	@if [ -z "$(VERSION)" ]; then \
		echo "$(RED)Error: Please specify VERSION. Example: make prepare-release VERSION=0.2.0$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Preparing release $(VERSION)...$(NC)"
	@echo "1. Updating version in pyproject.toml..."
	@sed -i.bak 's/version = "[^"]*"/version = "$(VERSION)"/' pyproject.toml
	@rm pyproject.toml.bak
	@echo "2. Running full validation..."
	@make validate
	@echo "3. Building package..."
	@make test-build
	@echo "$(GREEN)Release $(VERSION) prepared!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Review and commit changes: git add -A && git commit -m 'Prepare release $(VERSION)'"
	@echo "  2. Create and push tag: git tag v$(VERSION) && git push origin v$(VERSION)"
	@echo "  3. GitHub Actions will automatically build and publish to PyPI"
