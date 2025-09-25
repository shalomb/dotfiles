"""Behavioral tests for dotfile management functionality."""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import List

import pytest


class TestDotfileBehavior:
    """Test actual behavior of dotfile management system."""
    
    @pytest.fixture
    def test_env(self):
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
            
            yield {
                "temp_dir": temp_path,
                "fake_home": fake_home,
                "fake_repo": fake_repo,
            }


class TestFileExportBehavior:
    """Test file export behavior."""
    
    def test_single_file_export(self, test_env):
        """Test exporting a single file creates hard link."""
        fake_repo = test_env["fake_repo"]
        fake_home = test_env["fake_home"]
        
        # Change to repo directory
        os.chdir(fake_repo)
        
        # Export single file
        result = subprocess.run([
            "uv", "run", "python", "-m", "dotfile_manager", "export", "test_file.txt"
        ], capture_output=True, text=True, cwd=fake_repo)
        
        assert result.returncode == 0, f"Export failed: {result.stderr}"
        
        # Check that file exists in home directory
        home_file = fake_home / "test_file.txt"
        assert home_file.exists(), "File should exist in home directory"
        
        # Check that it's a hard link (same inode)
        repo_file = fake_repo / "test_file.txt"
        assert home_file.stat().st_ino == repo_file.stat().st_ino, "Should be hard linked"
        
        # Check content is the same
        assert home_file.read_text() == "Hello from repo"
    
    def test_directory_export_preserves_unmanaged_files(self, test_env):
        """Test that directory export doesn't remove unmanaged files."""
        fake_repo = test_env["fake_repo"]
        fake_home = test_env["fake_home"]
        
        # Change to repo directory
        os.chdir(fake_repo)
        
        # Export directory
        result = subprocess.run([
            "uv", "run", "python", "-m", "dotfile_manager", "export", "test_dir"
        ], capture_output=True, text=True, cwd=fake_repo)
        
        assert result.returncode == 0, f"Export failed: {result.stderr}"
        
        # Check that managed file exists
        managed_file = fake_home / "test_dir" / "nested_file.txt"
        assert managed_file.exists(), "Managed file should exist"
        assert managed_file.read_text() == "Nested content"
        
        # Check that unmanaged file still exists (this is the key test!)
        unmanaged_file = fake_home / "test_dir" / "unmanaged_file.txt"
        assert unmanaged_file.exists(), "Unmanaged file should still exist"
        assert unmanaged_file.read_text() == "Unmanaged content"
    
    def test_force_mode_overwrites_managed_files(self, test_env):
        """Test that force mode overwrites existing managed files."""
        fake_repo = test_env["fake_repo"]
        fake_home = test_env["fake_home"]
        
        # Create a file in home that conflicts with repo
        conflicting_file = fake_home / "test_file.txt"
        conflicting_file.write_text("Conflicting content")
        
        # Change to repo directory
        os.chdir(fake_repo)
        
        # Export with force
        result = subprocess.run([
            "uv", "run", "python", "-m", "dotfile_manager", "export", "--force", "test_file.txt"
        ], capture_output=True, text=True, cwd=fake_repo)
        
        assert result.returncode == 0, f"Export failed: {result.stderr}"
        
        # Check that content is from repo, not the conflicting content
        home_file = fake_home / "test_file.txt"
        assert home_file.read_text() == "Hello from repo"
    
    def test_export_creates_parent_directories(self, test_env):
        """Test that export creates necessary parent directories."""
        fake_repo = test_env["fake_repo"]
        fake_home = test_env["fake_home"]
        
        # Create nested file in repo
        nested_dir = fake_repo / "deep" / "nested" / "path"
        nested_dir.mkdir(parents=True)
        (nested_dir / "file.txt").write_text("Deep nested content")
        
        # Change to repo directory
        os.chdir(fake_repo)
        
        # Export nested file
        result = subprocess.run([
            "uv", "run", "python", "-m", "dotfile_manager", "export", "deep/nested/path/file.txt"
        ], capture_output=True, text=True, cwd=fake_repo)
        
        assert result.returncode == 0, f"Export failed: {result.stderr}"
        
        # Check that parent directories were created
        home_nested_dir = fake_home / "deep" / "nested" / "path"
        assert home_nested_dir.exists(), "Parent directories should be created"
        
        # Check that file exists
        home_file = home_nested_dir / "file.txt"
        assert home_file.exists(), "File should exist in nested location"
        assert home_file.read_text() == "Deep nested content"


class TestFileImportBehavior:
    """Test file import behavior."""
    
    def test_single_file_import(self, test_env):
        """Test importing a single file from home to repo."""
        fake_repo = test_env["fake_repo"]
        fake_home = test_env["fake_home"]
        
        # Create a file in home directory
        home_file = fake_home / "new_file.txt"
        home_file.write_text("New content from home")
        
        # Change to repo directory
        os.chdir(fake_repo)
        
        # Import file
        result = subprocess.run([
            "uv", "run", "python", "-m", "dotfile_manager", "import", "new_file.txt"
        ], capture_output=True, text=True, cwd=fake_repo)
        
        assert result.returncode == 0, f"Import failed: {result.stderr}"
        
        # Check that file exists in repo
        repo_file = fake_repo / "new_file.txt"
        assert repo_file.exists(), "File should exist in repo"
        assert repo_file.read_text() == "New content from home"


class TestStatusBehavior:
    """Test status checking behavior."""
    
    def test_status_clean_file(self, test_env):
        """Test status of a clean file."""
        fake_repo = test_env["fake_repo"]
        
        # Change to repo directory
        os.chdir(fake_repo)
        
        # Check status
        result = subprocess.run([
            "uv", "run", "python", "-m", "dotfile_manager", "status", "test_file.txt"
        ], capture_output=True, text=True, cwd=fake_repo)
        
        assert result.returncode == 0, f"Status failed: {result.stderr}"
        # Status should show clean or some git output


class TestMakefileIntegration:
    """Test Makefile integration."""
    
    def test_make_install_single_file(self, test_env):
        """Test make install TARGET=single_file."""
        fake_repo = test_env["fake_repo"]
        fake_home = test_env["fake_home"]
        
        # Change to repo directory
        os.chdir(fake_repo)
        
        # Run make install with TARGET
        result = subprocess.run([
            "make", "install", "TARGET=test_file.txt"
        ], capture_output=True, text=True, cwd=fake_repo)
        
        assert result.returncode == 0, f"Make install failed: {result.stderr}"
        
        # Check that file exists in home directory
        home_file = fake_home / "test_file.txt"
        assert home_file.exists(), "File should exist in home directory"
        assert home_file.read_text() == "Hello from repo"
    
    def test_make_install_directory(self, test_env):
        """Test make install TARGET=directory."""
        fake_repo = test_env["fake_repo"]
        fake_home = test_env["fake_home"]
        
        # Change to repo directory
        os.chdir(fake_repo)
        
        # Run make install with TARGET directory
        result = subprocess.run([
            "make", "install", "TARGET=test_dir"
        ], capture_output=True, text=True, cwd=fake_repo)
        
        assert result.returncode == 0, f"Make install failed: {result.stderr}"
        
        # Check that directory contents are exported
        nested_file = fake_home / "test_dir" / "nested_file.txt"
        assert nested_file.exists(), "Nested file should exist"
        assert nested_file.read_text() == "Nested content"
        
        # Check that unmanaged files are preserved
        unmanaged_file = fake_home / "test_dir" / "unmanaged_file.txt"
        assert unmanaged_file.exists(), "Unmanaged file should still exist"