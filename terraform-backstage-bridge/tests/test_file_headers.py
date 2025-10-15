"""
Test for ensuring all Python files have proper headers - TDD approach.
This test should FAIL initially, then we implement headers to make it pass.
"""

import ast
from pathlib import Path


class TestFileHeaders:
    """Test suite to validate that all Python files have proper headers."""

    def test_all_python_files_have_headers(self):
        """
        FAILING TEST: Verify every Python file has a docstring header.

        This test should FAIL initially because some Python files
        are missing proper headers.
        """
        project_root = Path(__file__).parent.parent
        python_files = []

        # Find all Python files, excluding __pycache__ and .mypy_cache
        for pattern in [
            "src/**/*.py",
            "tests/**/*.py",
            "scripts/**/*.py",
            "examples/**/*.py",
        ]:
            python_files.extend(project_root.glob(pattern))

        missing_headers = []

        for py_file in python_files:
            # Skip __pycache__ and cache directories
            if "__pycache__" in str(py_file) or ".mypy_cache" in str(py_file):
                continue

            try:
                with open(py_file, encoding="utf-8") as f:
                    content = f.read()

                # Parse the AST to get the module docstring
                try:
                    tree = ast.parse(content)
                    docstring = ast.get_docstring(tree)

                    if not docstring:
                        missing_headers.append(str(py_file.relative_to(project_root)))
                    elif len(docstring.strip()) < 10:  # Too short to be meaningful
                        missing_headers.append(
                            f"{py_file.relative_to(project_root)} (too short)"
                        )

                except SyntaxError:
                    # If file has syntax errors, still note it needs a header
                    missing_headers.append(
                        f"{py_file.relative_to(project_root)} (syntax error)"
                    )

            except Exception as e:
                missing_headers.append(
                    f"{py_file.relative_to(project_root)} (read error: {e})"
                )

        # This assertion should FAIL initially - that's the TDD approach
        assert not missing_headers, (
            f"Python files missing proper headers: {missing_headers}"
        )

    def test_all_fixture_files_have_headers(self):
        """
        FAILING TEST: Verify all fixture files have proper headers.

        This test should FAIL initially because fixture files
        are missing documentation headers.
        """
        project_root = Path(__file__).parent.parent
        fixture_dir = project_root / "tests" / "fixtures"

        missing_headers = []

        # Check all fixture files (YAML and Markdown)
        for fixture_file in fixture_dir.glob("*"):
            if fixture_file.is_file() and fixture_file.suffix in [
                ".yaml",
                ".yml",
                ".md",
            ]:
                try:
                    with open(fixture_file, encoding="utf-8") as f:
                        content = f.read()

                    # Check for header comment at the beginning
                    lines = content.strip().split("\n")
                    if not lines:
                        missing_headers.append(
                            str(fixture_file.relative_to(project_root))
                        )
                        continue

                    first_line = lines[0].strip()

                    # For YAML files, expect # comment header
                    if fixture_file.suffix in [".yaml", ".yml"]:
                        if not first_line.startswith("#") or len(first_line) < 10:
                            missing_headers.append(
                                str(fixture_file.relative_to(project_root))
                            )

                    # For Markdown files, expect # heading or descriptive text
                    elif fixture_file.suffix == ".md":
                        if len(first_line) < 10 and not first_line.startswith("#"):
                            missing_headers.append(
                                str(fixture_file.relative_to(project_root))
                            )

                except Exception as e:
                    missing_headers.append(
                        f"{fixture_file.relative_to(project_root)} (read error: {e})"
                    )

        # This assertion should FAIL initially - that's the TDD approach
        assert not missing_headers, (
            f"Fixture files missing proper headers: {missing_headers}"
        )
