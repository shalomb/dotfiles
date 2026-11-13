"""Behavioral tests for dotfile management functionality."""

import os
import shutil
import tempfile
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from dotfile_manager.file_ops import FileOperations


@pytest.fixture
def fake_dotfiles_env():
    """Set up a test environment with fake home and repo directories."""
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Create fake home directory
        fake_home = temp_path / "home"
        fake_home.mkdir()
        
        # Create fake repo directory
        fake_repo = temp_path / "repo"
        fake_repo.mkdir()
        
        # Create some test files in repo
        (fake_repo / "test_file.txt").write_text("Hello from repo")
        (fake_repo / "test_dir").mkdir()
        (fake_repo / "test_dir" / "nested_file.txt").write_text("Nested content")
        
        # Create some existing files in fake home
        (fake_home / "existing_file.txt").write_text("Existing content")
        (fake_home / "test_dir").mkdir()
        (fake_home / "test_dir" / "unmanaged_file.txt").write_text("Unmanaged content")
        
        file_ops = FileOperations()
        
        yield {
            "temp_dir": temp_path,
            "fake_home": fake_home,
            "fake_repo": fake_repo,
            "file_ops": file_ops,
        }


class TestFileExportBehavior:
    """Test file export behavior."""
    
    def test_single_file_export(self, fake_dotfiles_env):
        """Test exporting a single file creates hard link."""
        fake_repo = fake_dotfiles_env["fake_repo"]
        fake_home = fake_dotfiles_env["fake_home"]
        file_ops = fake_dotfiles_env["file_ops"]
        
        repo_file = fake_repo / "test_file.txt"
        home_file = fake_home / "test_file.txt"
        
        file_ops.export_file(repo_file, home_file)
        
        # Check that file exists in home directory
        assert home_file.exists(), "File should exist in home directory"
        
        # Check that it's a hard link (same inode)
        assert home_file.stat().st_ino == repo_file.stat().st_ino, "Should be hard linked"
        
        # Check content is the same
        assert home_file.read_text() == "Hello from repo"
    
    def test_directory_export_preserves_unmanaged_files(self, fake_dotfiles_env):
        """Test that directory export doesn't remove unmanaged files."""
        fake_repo = fake_dotfiles_env["fake_repo"]
        fake_home = fake_dotfiles_env["fake_home"]
        file_ops = fake_dotfiles_env["file_ops"]
        
        repo_dir = fake_repo / "test_dir"
        home_dir = fake_home / "test_dir"
        
        file_ops.export_directory(repo_dir, home_dir)
        
        # Check that managed file exists
        managed_file = home_dir / "nested_file.txt"
        assert managed_file.exists(), "Managed file should exist"
        assert managed_file.read_text() == "Nested content"
        
        # Check that unmanaged file still exists (this is the key test!)
        unmanaged_file = home_dir / "unmanaged_file.txt"
        assert unmanaged_file.exists(), "Unmanaged file should still exist"
        assert unmanaged_file.read_text() == "Unmanaged content"
    
    def test_force_mode_overwrites_managed_files(self, fake_dotfiles_env):
        """Test that force mode overwrites existing managed files."""
        fake_repo = fake_dotfiles_env["fake_repo"]
        fake_home = fake_dotfiles_env["fake_home"]
        file_ops = fake_dotfiles_env["file_ops"]
        
        repo_file = fake_repo / "test_file.txt"
        home_file = fake_home / "test_file.txt"
        
        # Create a file in home that conflicts with repo
        home_file.write_text("Conflicting content")
        
        # Export with force
        file_ops.export_file(repo_file, home_file, force=True)
        
        # Check that content is from repo, not the conflicting content
        assert home_file.read_text() == "Hello from repo"
    
    def test_export_creates_parent_directories(self, fake_dotfiles_env):
        """Test that export creates necessary parent directories."""
        fake_repo = fake_dotfiles_env["fake_repo"]
        fake_home = fake_dotfiles_env["fake_home"]
        file_ops = fake_dotfiles_env["file_ops"]
        
        # Create nested file in repo
        nested_dir = fake_repo / "deep" / "nested" / "path"
        nested_dir.mkdir(parents=True)
        repo_file = nested_dir / "file.txt"
        repo_file.write_text("Deep nested content")
        
        home_file = fake_home / "deep" / "nested" / "path" / "file.txt"
        file_ops.export_file(repo_file, home_file)
        
        # Check that parent directories were created
        home_nested_dir = fake_home / "deep" / "nested" / "path"
        assert home_nested_dir.exists(), "Parent directories should be created"
        
        # Check that file exists
        assert home_file.exists(), "File should exist in nested location"
        assert home_file.read_text() == "Deep nested content"


class TestFileImportBehavior:
    """Test file import behavior."""
    
    def test_single_file_import(self, fake_dotfiles_env):
        """Test importing a single file from home to repo."""
        fake_repo = fake_dotfiles_env["fake_repo"]
        fake_home = fake_dotfiles_env["fake_home"]
        file_ops = fake_dotfiles_env["file_ops"]
        
        # Create a file in home directory
        home_file = fake_home / "new_file.txt"
        home_file.write_text("New content from home")
        
        repo_file = fake_repo / "new_file.txt"
        file_ops.import_file(home_file, repo_file)
        
        # Check that file exists in repo
        assert repo_file.exists(), "File should exist in repo"
        assert repo_file.read_text() == "New content from home"


class TestStatusBehavior:
    """Test status checking behavior."""
    
    def test_status_clean_file(self, fake_dotfiles_env):
        """Test status of a clean file."""
        fake_repo = fake_dotfiles_env["fake_repo"]
        file_ops = fake_dotfiles_env["file_ops"]
        
        repo_file = fake_repo / "test_file.txt"
        assert repo_file.exists()
