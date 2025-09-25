#!/usr/bin/env python3
"""Test exclusion functionality for dotfile manager."""

import fnmatch
from pathlib import Path
import tomllib


def should_skip_file(file_path: Path, exclusions: dict) -> bool:
    """Check if file should be skipped based on exclusions."""
    # Check file patterns
    patterns = exclusions.get("patterns", [])
    for pattern in patterns:
        if fnmatch.fnmatch(file_path.name, pattern):
            return True
    
    # Check exclude_files list
    exclude_files = exclusions.get("exclude_files", [])
    if file_path.name in exclude_files:
        return True
    
    # Check if file is in excluded directory
    exclude_dirs = exclusions.get("exclude_directories", [])
    for exclude_dir in exclude_dirs:
        if exclude_dir in file_path.parts:
            return True
    
    return False


def test_exclusion_patterns():
    """Test that exclusion patterns work correctly."""
    exclusions = {
        "patterns": ["*.pyc", "*.pyo", "__pycache__/", "*.swp", "*.swo", "*.tmp"],
        "exclude_directories": [".git", ".venv", "venv", "node_modules", "src", "tests"],
        "exclude_files": ["pyproject.toml", "README.md", "TODO.md", "requirements.txt"]
    }
    
    # Test files that should be excluded
    excluded_files = [
        Path("pyproject.toml"),
        Path("README.md"), 
        Path("src/dotfile_manager/core.py"),
        Path("tests/test_core.py"),
        Path(".git/config"),
        Path(".venv/bin/python"),
    ]
    
    # Test files that should be included
    included_files = [
        Path("config/bashrc"),
        Path("Makefile"),
        Path(".bashrc"),
        Path(".vimrc"),
    ]
    
    print("Testing exclusion patterns:")
    print("=" * 60)
    
    # Test excluded files
    print("Files that should be EXCLUDED:")
    for test_file in excluded_files:
        should_skip = should_skip_file(test_file, exclusions)
        status = "✓ SKIP" if should_skip else "✗ INCLUDE"
        print(f"  {status:10} | {test_file}")
        assert should_skip, f"File {test_file} should be excluded but wasn't"
    
    print("\nFiles that should be INCLUDED:")
    for test_file in included_files:
        should_skip = should_skip_file(test_file, exclusions)
        status = "✓ INCLUDE" if not should_skip else "✗ SKIP"
        print(f"  {status:10} | {test_file}")
        assert not should_skip, f"File {test_file} should be included but was excluded"
    
    print("\n✅ All exclusion pattern tests passed!")


def test_config_file_loading():
    """Test that the configuration file can be loaded."""
    config_file = Path(".dotfiles.toml")
    
    if not config_file.exists():
        print(f"\n⚠️  Configuration file {config_file} not found, skipping config test")
        return
    
    try:
        with open(config_file, "rb") as f:
            config = tomllib.load(f)
        
        exclusions = config.get("exclusions", {})
        
        print(f"\nTesting configuration file loading:")
        print("=" * 60)
        print(f"✓ Configuration file loaded: {config_file}")
        print(f"✓ Patterns: {len(exclusions.get('patterns', []))} patterns")
        print(f"✓ Exclude directories: {len(exclusions.get('exclude_directories', []))} directories")
        print(f"✓ Exclude files: {len(exclusions.get('exclude_files', []))} files")
        
        # Test a few key exclusions from the config
        test_file = Path("pyproject.toml")
        should_skip = should_skip_file(test_file, exclusions)
        assert should_skip, f"pyproject.toml should be excluded according to config"
        print(f"✓ pyproject.toml correctly excluded")
        
        print("\n✅ Configuration file tests passed!")
        
    except Exception as e:
        print(f"\n❌ Failed to load configuration file: {e}")
        raise


def main():
    """Run all exclusion tests."""
    print("🧪 Running Dotfile Manager Exclusion Tests")
    print("=" * 60)
    
    try:
        test_exclusion_patterns()
        test_config_file_loading()
        
        print("\n🎉 All exclusion tests passed successfully!")
        print("✅ Non-dotfiles are correctly excluded from sync operations")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        raise


if __name__ == "__main__":
    main()
