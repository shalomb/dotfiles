"""Test parent directory safety during export operations."""

import os
import tempfile
from pathlib import Path

import pytest


class TestParentDirectorySafety:
    """Test that parent directories are not removed during export."""
    
    def test_existing_parent_directory_preserved(self):
        """Test that existing parent directories are not removed."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create fake home and repo
            fake_home = temp_path / "home"
            fake_repo = temp_path / "repo"
            fake_home.mkdir()
            fake_repo.mkdir()
            
            # Create existing directory structure in home
            existing_dir = fake_home / "existing_app"
            existing_dir.mkdir()
            (existing_dir / "config.json").write_text("existing config")
            
            # Create file in repo that would go into existing directory
            repo_file = fake_repo / "existing_app" / "managed_file.txt"
            repo_file.parent.mkdir(parents=True)
            repo_file.write_text("managed content")
            
            # Change to repo directory
            os.chdir(fake_repo)
            
            # Import the file operations
            import sys
            sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
            from dotfile_manager.file_ops import FileOperations
            
            # Export the file
            file_ops = FileOperations()
            dst_path = fake_home / "existing_app" / "managed_file.txt"
            file_ops.export_file(repo_file, dst_path)
            
            # Check that existing directory still exists
            assert existing_dir.exists(), "Existing directory should still exist"
            
            # Check that existing file still exists
            existing_file = existing_dir / "config.json"
            assert existing_file.exists(), "Existing file should still exist"
            assert existing_file.read_text() == "existing config"
            
            # Check that managed file was added
            assert dst_path.exists(), "Managed file should exist"
            assert dst_path.read_text() == "managed content"
    
    def test_nested_existing_directories_preserved(self):
        """Test that nested existing directories are preserved."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create fake home and repo
            fake_home = temp_path / "home"
            fake_repo = temp_path / "repo"
            fake_home.mkdir()
            fake_repo.mkdir()
            
            # Create existing nested directory structure
            existing_nested = fake_home / "app" / "deep" / "nested"
            existing_nested.mkdir(parents=True)
            (existing_nested / "existing.txt").write_text("existing nested content")
            
            # Create file in repo that would go into existing nested structure
            repo_file = fake_repo / "app" / "deep" / "nested" / "managed.txt"
            repo_file.parent.mkdir(parents=True)
            repo_file.write_text("managed nested content")
            
            # Change to repo directory
            os.chdir(fake_repo)
            
            # Import the file operations
            import sys
            sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
            from dotfile_manager.file_ops import FileOperations
            
            # Export the file
            file_ops = FileOperations()
            dst_path = fake_home / "app" / "deep" / "nested" / "managed.txt"
            file_ops.export_file(repo_file, dst_path)
            
            # Check that all existing directories still exist
            assert (fake_home / "app").exists(), "app directory should exist"
            assert (fake_home / "app" / "deep").exists(), "deep directory should exist"
            assert existing_nested.exists(), "nested directory should exist"
            
            # Check that existing file still exists
            existing_file = existing_nested / "existing.txt"
            assert existing_file.exists(), "Existing file should still exist"
            assert existing_file.read_text() == "existing nested content"
            
            # Check that managed file was added
            assert dst_path.exists(), "Managed file should exist"
            assert dst_path.read_text() == "managed nested content"
    
    def test_directory_export_with_existing_parents(self):
        """Test directory export when parent directories already exist."""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create fake home and repo
            fake_home = temp_path / "home"
            fake_repo = temp_path / "repo"
            fake_home.mkdir()
            fake_repo.mkdir()
            
            # Create existing directory with unmanaged files
            existing_dir = fake_home / "existing_app"
            existing_dir.mkdir()
            (existing_dir / "unmanaged1.txt").write_text("unmanaged 1")
            (existing_dir / "unmanaged2.txt").write_text("unmanaged 2")
            
            # Create managed directory in repo
            repo_dir = fake_repo / "existing_app"
            repo_dir.mkdir()
            (repo_dir / "managed1.txt").write_text("managed 1")
            (repo_dir / "managed2.txt").write_text("managed 2")
            
            # Change to repo directory
            os.chdir(fake_repo)
            
            # Import the file operations
            import sys
            sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
            from dotfile_manager.file_ops import FileOperations
            
            # Export the directory
            file_ops = FileOperations()
            file_ops.export_directory(repo_dir, existing_dir)
            
            # Check that unmanaged files still exist
            unmanaged1 = existing_dir / "unmanaged1.txt"
            unmanaged2 = existing_dir / "unmanaged2.txt"
            assert unmanaged1.exists(), "Unmanaged file 1 should still exist"
            assert unmanaged2.exists(), "Unmanaged file 2 should still exist"
            assert unmanaged1.read_text() == "unmanaged 1"
            assert unmanaged2.read_text() == "unmanaged 2"
            
            # Check that managed files were added
            managed1 = existing_dir / "managed1.txt"
            managed2 = existing_dir / "managed2.txt"
            assert managed1.exists(), "Managed file 1 should exist"
            assert managed2.exists(), "Managed file 2 should exist"
            assert managed1.read_text() == "managed 1"
            assert managed2.read_text() == "managed 2"