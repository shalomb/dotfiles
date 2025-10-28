"""File operations for dotfile management."""

import json
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class FileOperations:
    """Handles file operations for dotfile management."""
    
    def __init__(self, debug: bool = False, config=None) -> None:
        """Initialize file operations."""
        self.debug = debug
        self.config = config
        self.registry_file = Path.cwd() / ".dotfiles-managed-files.json"
    
    def export_file(self, src_path: Path, dst_path: Path, force: bool = False) -> None:
        """Export a single file, preserving symlinks."""
        # Create parent directory if it doesn't exist
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Check if destination already exists
        if dst_path.exists():
            if not force:
                logger.warning(f"Destination exists and force=False: {dst_path}")
                return
            
            # Remove existing file/link
            if dst_path.is_file() or dst_path.is_symlink():
                dst_path.unlink()
            elif dst_path.is_dir():
                logger.error(f"Cannot replace directory with file: {dst_path}")
                return
        
        # Handle symlinks: preserve them instead of following to target
        if src_path.is_symlink():
            try:
                dst_path.symlink_to(src_path.readlink())
                logger.info(f"Created symlink: {src_path} -> {dst_path}")
            except OSError as e:
                logger.error(f"Failed to create symlink: {e}")
                # Fallback to copy if symlink fails
                shutil.copy2(src_path, dst_path)
                logger.info(f"Copied file instead: {src_path} -> {dst_path}")
        else:
            # Create hard link for regular files
            try:
                dst_path.hardlink_to(src_path)
                logger.info(f"Created hard link: {src_path} -> {dst_path}")
            except OSError as e:
                logger.error(f"Failed to create hard link: {e}")
                # Fallback to copy if hard link fails (different filesystem)
                shutil.copy2(src_path, dst_path)
                logger.info(f"Copied file instead: {src_path} -> {dst_path}")
    
    def export_directory(self, src_path: Path, dst_path: Path, force: bool = False) -> None:
        """Export a directory tree."""
        # Create destination directory if it doesn't exist
        dst_path.mkdir(parents=True, exist_ok=True)
        
        # Walk through source directory
        for root, dirs, files in os.walk(src_path):
            root_path = Path(root)
            rel_path = root_path.relative_to(src_path)
            dst_dir = dst_path / rel_path
            
            # Create subdirectory
            dst_dir.mkdir(parents=True, exist_ok=True)
            
            # Process files
            for file_name in files:
                src_file = root_path / file_name
                dst_file = dst_dir / file_name
                
                # Skip certain files
                if self._should_skip_file(src_file):
                    continue
                
                self.export_file(src_file, dst_file, force=force)
    
    def import_file(self, src_path: Path, dst_path: Path) -> None:
        """Import a file from home directory to repository."""
        # Create parent directory if it doesn't exist
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy file to repository
        shutil.copy2(src_path, dst_path)
        logger.info(f"Imported file: {src_path} -> {dst_path}")
    
    def import_directory(self, src_path: Path, dst_path: Path) -> None:
        """Import a directory tree."""
        # Create destination directory if it doesn't exist
        dst_path.mkdir(parents=True, exist_ok=True)
        
        # Walk through source directory
        for root, dirs, files in os.walk(src_path):
            root_path = Path(root)
            rel_path = root_path.relative_to(src_path)
            dst_dir = dst_path / rel_path
            
            # Create subdirectory
            dst_dir.mkdir(parents=True, exist_ok=True)
            
            # Process files
            for file_name in files:
                src_file = root_path / file_name
                dst_file = dst_dir / file_name
                
                # Skip certain files
                if self._should_skip_file(src_file):
                    continue
                
                self.import_file(src_file, dst_file)
    
    def _should_skip_file(self, file_path: Path) -> bool:
        """Check if file should be skipped."""
        # Use configuration if available
        if self.config:
            return self.config.should_exclude_path(file_path)
        
        # Fallback to basic patterns
        # Skip swap files
        if file_path.suffix in ['.swp', '.swo', '.swx']:
            return True
        
        # Skip backup files
        if file_path.name.endswith('~'):
            return True
        
        # Skip hidden files that start with .
        if file_path.name.startswith('.') and file_path.name not in ['.bashrc', '.vimrc']:
            # Allow common dotfiles but skip others
            pass
        
        return False
    
    def detect_orphans(self, target_dir: Path, repo_files: Set[Path]) -> List[Path]:
        """Detect orphaned files in target directory."""
        orphans = []
        
        if not target_dir.exists():
            return orphans
        
        # Get all files in target directory
        for item in target_dir.rglob("*"):
            if item.is_file():
                # Get relative path from target directory
                try:
                    rel_path = item.relative_to(target_dir)
                    
                    # Check if this file is managed by the repo
                    if rel_path not in repo_files:
                        # Also check if it's in our managed files registry
                        if not self._is_in_registry(item):
                            orphans.append(item)
                except ValueError:
                    # Path is not under target directory (shouldn't happen)
                    continue
        
        return sorted(orphans)
    
    def _load_registry(self) -> Set[Path]:
        """Load the managed files registry and return set of managed files."""
        if not self.registry_file.exists():
            return set()

        try:
            with open(self.registry_file, 'r') as f:
                registry = json.load(f)

            # Convert to Path objects
            return {Path(p) for p in registry.get('managed_files', [])}
        except (json.JSONDecodeError, KeyError):
            return set()

    def _is_in_registry(self, file_path: Path) -> bool:
        """Check if file is in the managed files registry."""
        managed_paths = self._load_registry()
        return file_path in managed_paths
    
    def _update_registry(self, managed_files: Set[Path]) -> None:
        """Update the managed files registry."""
        registry_data = {
            'last_updated': datetime.now().isoformat(),
            'managed_files': [str(f) for f in sorted(managed_files)]
        }
        
        with open(self.registry_file, 'w') as f:
            json.dump(registry_data, f, indent=2)
        
        logger.info(f"Updated managed files registry: {self.registry_file}")
    
    def create_backup(self, target_dir: Path) -> Path:
        """Create a backup of the target directory."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = target_dir.parent / f"{target_dir.name}.backup_{timestamp}"
        
        if target_dir.exists():
            shutil.copytree(target_dir, backup_dir, symlinks=True)
            logger.info(f"Created backup: {backup_dir}")
        
        return backup_dir
    
    def bulk_review_orphans(self, orphans: List[Path], target_dir: Path) -> bool:
        """Present bulk review of orphaned files for user approval."""
        if not orphans:
            print("✅ No orphaned files found.")
            return True
        
        print(f"\n🔍 ORPHANED FILES REVIEW")
        print(f"{'='*60}")
        print(f"Target directory: {target_dir}")
        print(f"Found {len(orphans)} orphaned files:")
        print()
        
        # Group files by directory for better organization
        files_by_dir = {}
        for orphan in orphans:
            parent_dir = orphan.parent
            if parent_dir not in files_by_dir:
                files_by_dir[parent_dir] = []
            files_by_dir[parent_dir].append(orphan)
        
        # Display files organized by directory
        for parent_dir in sorted(files_by_dir.keys()):
            print(f"📁 {parent_dir.relative_to(target_dir)}")
            for file_path in sorted(files_by_dir[parent_dir]):
                rel_path = file_path.relative_to(target_dir)
                file_size = file_path.stat().st_size if file_path.exists() else 0
                print(f"   📄 {rel_path} ({file_size} bytes)")
            print()
        
        # Show summary
        total_size = sum(f.stat().st_size for f in orphans if f.exists())
        print(f"📊 SUMMARY:")
        print(f"   • Total files: {len(orphans)}")
        print(f"   • Total size: {total_size:,} bytes ({total_size/1024:.1f} KB)")
        print()
        
        # Safety confirmation with explicit typing
        print("⚠️  SAFETY CONFIRMATION REQUIRED")
        print("This will permanently delete the orphaned files listed above.")
        print("Type 'DELETE ORPHANS' (exactly) to confirm deletion:")
        
        confirmation = input("> ").strip()
        
        if confirmation == "DELETE ORPHANS":
            print("✅ Confirmation received. Proceeding with cleanup...")
            return True
        else:
            print("❌ Confirmation not received. Skipping cleanup.")
            return False
    
    def cleanup_orphans(self, orphans: List[Path], dry_run: bool = False) -> None:
        """Clean up orphaned files."""
        if not orphans:
            return
        
        if dry_run:
            print(f"\n🔍 DRY RUN - Would delete {len(orphans)} orphaned files:")
            for orphan in orphans:
                print(f"   Would delete: {orphan}")
            return
        
        # Actually delete the files
        deleted_count = 0
        for orphan in orphans:
            try:
                if orphan.exists():
                    orphan.unlink()
                    deleted_count += 1
                    logger.info(f"Deleted orphaned file: {orphan}")
            except OSError as e:
                logger.error(f"Failed to delete {orphan}: {e}")
        
        print(f"✅ Cleaned up {deleted_count} orphaned files.")
    
    def export_directory_with_cleanup(self, src_path: Path, dst_path: Path,
                                    force: bool = False, cleanup: bool = False,
                                    dry_run: bool = False, interactive: bool = False,
                                    create_backup: bool = False) -> None:
        """Export directory with optional orphan cleanup."""
        # Load OLD registry BEFORE any updates (for orphan detection)
        old_managed_files = self._load_registry() if cleanup else set()

        # First, do normal export
        self.export_directory(src_path, dst_path, force=force)

        if not cleanup:
            return

        # Get list of files that SHOULD be managed (current git files)
        current_managed_files = set()
        for root, dirs, files in os.walk(src_path):
            root_path = Path(root)
            rel_path = root_path.relative_to(src_path)
            dst_dir = dst_path / rel_path

            for file_name in files:
                src_file = root_path / file_name
                if not self._should_skip_file(src_file):
                    rel_file_path = dst_dir / file_name
                    current_managed_files.add(rel_file_path.relative_to(dst_path))

        # Detect orphans: files that WERE managed but are NO LONGER in git
        orphans = []
        for old_file_rel_path in old_managed_files:
            old_file_abs_path = dst_path / old_file_rel_path
            if old_file_rel_path not in current_managed_files and old_file_abs_path.exists():
                orphans.append(old_file_abs_path)

        # Update registry with current managed files for next run
        self._update_registry(current_managed_files)
        
        if not orphans:
            print("✅ No orphaned files found.")
            return

        # Create backup if requested
        backup_dir = None
        if create_backup and not dry_run:
            backup_dir = self.create_backup(dst_path)
            print(f"📦 Backup created: {backup_dir}")

        # Handle cleanup based on mode
        if dry_run:
            self.cleanup_orphans(orphans, dry_run=True)
        elif interactive:
            if self.bulk_review_orphans(orphans, dst_path):
                self.cleanup_orphans(orphans, dry_run=False)
        else:
            # Non-interactive mode - auto-delete orphaned tracked files (git is source of truth)
            logger.info(f"Auto-cleaning {len(orphans)} orphaned tracked files")
            self.cleanup_orphans(orphans, dry_run=False)