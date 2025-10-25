"""Tests for orphan cleanup functionality."""

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from dotfile_manager.file_ops import FileOperations
from dotfile_manager.config import DotfileConfig


class TestOrphanCleanup:
    """Test orphan cleanup functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.repo_dir = self.temp_dir / "repo"
        self.home_dir = self.temp_dir / "home"
        
        # Create test directories
        self.repo_dir.mkdir()
        self.home_dir.mkdir()
        
        # Create config with no exclusions for test
        config_file = self.temp_dir / ".dotfiles.toml"
        config_file.write_text("""
[exclusions]
patterns = []
exclude_directories = []
exclude_files = []
""")
        self.config = DotfileConfig(config_file)
        self.file_ops = FileOperations(debug=True, config=self.config)
        
        # Change to repo directory for testing
        self.original_cwd = Path.cwd()
        os.chdir(self.repo_dir)
    
    def teardown_method(self):
        """Clean up test environment."""
        os.chdir(self.original_cwd)
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_detect_orphans_basic(self):
        """Test basic orphan detection."""
        # Create source directory structure
        src_dir = self.repo_dir / "config"
        src_dir.mkdir()
        (src_dir / "file1.txt").write_text("content1")
        (src_dir / "file2.txt").write_text("content2")
        
        # Create destination directory with extra files
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        (dst_dir / "file1.txt").write_text("content1")
        (dst_dir / "file2.txt").write_text("content2")
        (dst_dir / "orphan1.txt").write_text("orphan content")
        (dst_dir / "orphan2.txt").write_text("orphan content")
        
        # Define managed files
        managed_files = {
            Path("file1.txt"),
            Path("file2.txt")
        }
        
        # Detect orphans
        orphans = self.file_ops.detect_orphans(dst_dir, managed_files)
        
        # Should find 2 orphaned files
        assert len(orphans) == 2
        assert dst_dir / "orphan1.txt" in orphans
        assert dst_dir / "orphan2.txt" in orphans
        assert dst_dir / "file1.txt" not in orphans
        assert dst_dir / "file2.txt" not in orphans
    
    def test_detect_orphans_nested(self):
        """Test orphan detection in nested directories."""
        # Create nested source structure
        src_dir = self.repo_dir / "config"
        src_dir.mkdir()
        (src_dir / "subdir").mkdir()
        (src_dir / "subdir" / "file.txt").write_text("content")
        
        # Create nested destination with orphans
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        (dst_dir / "subdir").mkdir()
        (dst_dir / "subdir" / "file.txt").write_text("content")
        (dst_dir / "subdir" / "orphan.txt").write_text("orphan")
        (dst_dir / "orphan.txt").write_text("orphan")
        
        # Define managed files
        managed_files = {
            Path("subdir") / "file.txt"
        }
        
        # Detect orphans
        orphans = self.file_ops.detect_orphans(dst_dir, managed_files)
        
        # Should find 2 orphaned files
        assert len(orphans) == 2
        assert dst_dir / "orphan.txt" in orphans
        assert dst_dir / "subdir" / "orphan.txt" in orphans
    
    def test_registry_functionality(self):
        """Test managed files registry."""
        # Create some files
        file1 = Path("/tmp/file1.txt")
        file2 = Path("/tmp/file2.txt")
        
        # Initially not in registry
        assert not self.file_ops._is_in_registry(file1)
        
        # Update registry
        managed_files = {file1, file2}
        self.file_ops._update_registry(managed_files)
        
        # Now should be in registry
        assert self.file_ops._is_in_registry(file1)
        assert self.file_ops._is_in_registry(file2)
        
        # Check registry file exists and has correct content
        assert self.file_ops.registry_file.exists()
        with open(self.file_ops.registry_file, 'r') as f:
            registry_data = json.load(f)
        
        assert "managed_files" in registry_data
        assert str(file1) in registry_data["managed_files"]
        assert str(file2) in registry_data["managed_files"]
    
    def test_cleanup_orphans_dry_run(self):
        """Test orphan cleanup in dry run mode."""
        # Create test files
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        orphan1 = dst_dir / "orphan1.txt"
        orphan2 = dst_dir / "orphan2.txt"
        orphan1.write_text("content1")
        orphan2.write_text("content2")
        
        orphans = [orphan1, orphan2]
        
        # Dry run should not delete files
        self.file_ops.cleanup_orphans(orphans, dry_run=True)
        
        # Files should still exist
        assert orphan1.exists()
        assert orphan2.exists()
    
    def test_cleanup_orphans_real(self):
        """Test actual orphan cleanup."""
        # Create test files
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        orphan1 = dst_dir / "orphan1.txt"
        orphan2 = dst_dir / "orphan2.txt"
        orphan1.write_text("content1")
        orphan2.write_text("content2")
        
        orphans = [orphan1, orphan2]
        
        # Real cleanup should delete files
        self.file_ops.cleanup_orphans(orphans, dry_run=False)
        
        # Files should be deleted
        assert not orphan1.exists()
        assert not orphan2.exists()
    
    @patch('builtins.input', return_value='DELETE ORPHANS')
    def test_bulk_review_orphans_confirmation(self, mock_input):
        """Test bulk review with confirmation."""
        # Create test files
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        orphan1 = dst_dir / "orphan1.txt"
        orphan2 = dst_dir / "orphan2.txt"
        orphan1.write_text("content1")
        orphan2.write_text("content2")
        
        orphans = [orphan1, orphan2]
        
        # Should return True with correct confirmation
        result = self.file_ops.bulk_review_orphans(orphans, dst_dir)
        assert result is True
    
    @patch('builtins.input', return_value='wrong confirmation')
    def test_bulk_review_orphans_no_confirmation(self, mock_input):
        """Test bulk review without confirmation."""
        # Create test files
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        orphan1 = dst_dir / "orphan1.txt"
        orphan2 = dst_dir / "orphan2.txt"
        orphan1.write_text("content1")
        orphan2.write_text("content2")
        
        orphans = [orphan1, orphan2]
        
        # Should return False with wrong confirmation
        result = self.file_ops.bulk_review_orphans(orphans, dst_dir)
        assert result is False
    
    def test_create_backup(self):
        """Test backup creation."""
        # Create test directory with files
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        (dst_dir / "file1.txt").write_text("content1")
        (dst_dir / "file2.txt").write_text("content2")
        
        # Create backup
        backup_dir = self.file_ops.create_backup(dst_dir)
        
        # Backup should exist and contain files
        assert backup_dir.exists()
        assert (backup_dir / "file1.txt").exists()
        assert (backup_dir / "file2.txt").exists()
        
        # Backup should have timestamp in name
        assert "backup_" in backup_dir.name
    
    def test_export_directory_with_cleanup(self):
        """Test export with cleanup functionality."""
        # Create source directory
        src_dir = self.repo_dir / "config"
        src_dir.mkdir()
        (src_dir / "file1.txt").write_text("content1")
        (src_dir / "file2.txt").write_text("content2")

        # Create destination with orphans
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        (dst_dir / "file1.txt").write_text("content1")
        (dst_dir / "file2.txt").write_text("content2")
        (dst_dir / "orphan.txt").write_text("orphan")

        # Export with cleanup (dry run)
        self.file_ops.export_directory_with_cleanup(
            src_dir, dst_dir, cleanup=True, dry_run=True
        )

        # Orphan should still exist (dry run)
        assert (dst_dir / "orphan.txt").exists()

        # Export with cleanup (real)
        self.file_ops.export_directory_with_cleanup(
            src_dir, dst_dir, cleanup=True, dry_run=False, interactive=False
        )

        # Orphan should be deleted (non-interactive mode auto-deletes when git is source of truth)
        # Note: This orphan was never in the registry, so it's an untracked file that appeared
        # The current behavior is to NOT delete untracked files, only previously-managed files
        assert (dst_dir / "orphan.txt").exists()

    def test_orphan_cleanup_previously_managed_file(self):
        """Test that files previously managed but deleted from git are cleaned up.

        This tests the real-world scenario:
        1. Deploy files from git (file1, file2, file3) - registry tracks them
        2. Delete file3 from git
        3. Run refresh - file3 should be auto-deleted (git is source of truth)
        """
        # Setup source with 3 files initially (use non-excluded extension)
        src_dir = self.repo_dir / "config"
        src_dir.mkdir()
        (src_dir / ".bashrc").write_text("content1")
        (src_dir / ".vimrc").write_text("content2")
        (src_dir / ".profile").write_text("content3")

        # Setup destination with all 3 files (simulating initial deployment)
        dst_dir = self.home_dir / "config"
        dst_dir.mkdir()
        (dst_dir / ".bashrc").write_text("content1")
        (dst_dir / ".vimrc").write_text("content2")
        (dst_dir / ".profile").write_text("content3")

        # Simulate initial registry: all 3 files were managed
        initial_managed_files = {
            Path(".bashrc"),
            Path(".vimrc"),
            Path(".profile")
        }
        self.file_ops._update_registry(initial_managed_files)

        # Verify initial state
        assert (dst_dir / ".bashrc").exists()
        assert (dst_dir / ".vimrc").exists()
        assert (dst_dir / ".profile").exists()
        assert self.file_ops.registry_file.exists()

        # Simulate git deletion: remove .profile from source
        (src_dir / ".profile").unlink()

        # Run cleanup: .profile should be deleted
        self.file_ops.export_directory_with_cleanup(
            src_dir, dst_dir, force=True, cleanup=True, dry_run=False, interactive=False
        )

        # .bashrc and .vimrc should still exist
        assert (dst_dir / ".bashrc").exists()
        assert (dst_dir / ".vimrc").exists()

        # .profile should be DELETED (it was managed before, but deleted from git)
        assert not (dst_dir / ".profile").exists(), \
            "Previously managed file deleted from git should be auto-cleaned up"


if __name__ == "__main__":
    pytest.main([__file__])