"""Tests for core dotfile management functionality."""

import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from dotfile_manager.core import DotfileManager


class TestDotfileManager:
    """Test cases for DotfileManager."""
    
    def test_initialization(self):
        """Test DotfileManager initialization."""
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch('pathlib.Path.cwd', return_value=Path(temp_dir)):
                manager = DotfileManager()
                assert manager.repo_root == Path(temp_dir)
                assert manager.home_dir == Path.home()
    
    def test_resolve_source_paths(self):
        """Test source path resolution."""
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch('pathlib.Path.cwd', return_value=Path(temp_dir)):
                manager = DotfileManager()
                
                # Test absolute path
                abs_paths = manager._resolve_source_paths("/absolute/path")
                assert abs_paths == [Path("/absolute/path")]
                
                # Test relative path
                rel_paths = manager._resolve_source_paths("*.py")
                assert isinstance(rel_paths, list)
    
    def test_get_destination_path(self):
        """Test destination path calculation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch('pathlib.Path.cwd', return_value=Path(temp_dir)):
                manager = DotfileManager()
                
                # Test relative path
                src_path = Path(temp_dir) / "test_file"
                dst_path = manager._get_destination_path(src_path)
                expected = Path.home() / "test_file"
                assert dst_path == expected