"""Core dotfile management logic."""

import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import List, Set, Dict, Tuple, Optional
from datetime import datetime

from rich.console import Console
from rich.prompt import Confirm, Prompt

from .file_ops import FileOperations
from .utils import resolve_paths
from .config import DotfileConfig

logger = logging.getLogger(__name__)
console = Console()


class DotfileManager:
    """Main dotfile management class."""
    
    def __init__(self, debug: bool = False) -> None:
        """Initialize the dotfile manager."""
        self.debug = debug
        self.repo_root = Path.cwd()
        self.home_dir = Path.home()
        self.config = DotfileConfig(self.repo_root / ".dotfiles.toml")
        self.file_ops = FileOperations(debug=debug, config=self.config)
        
        # Set up logging
        if debug:
            logging.basicConfig(level=logging.DEBUG)
        else:
            logging.basicConfig(level=logging.INFO)
    
    def export(self, files: List[str], cleanup: bool = False,
               dry_run: bool = False, interactive: bool = False, 
               create_backup: bool = False, working_dir: bool = False) -> None:
        """Export files from repository to home directory."""
        logger.info(f"Exporting files: {files}")
        
        # Check for uncommitted changes if not in working directory mode
        if not working_dir:
            uncommitted_changes = self._detect_uncommitted_changes()
            if uncommitted_changes:
                self._handle_uncommitted_changes(uncommitted_changes, working_dir)
        
        for file_pattern in files:
            src_paths = self._resolve_source_paths(file_pattern)
            
            for src_path in src_paths:
                if not src_path.exists():
                    logger.warning(f"Source file does not exist: {src_path}")
                    continue
                
                # Check if file should be excluded
                if self.file_ops._should_skip_file(src_path):
                    logger.info(f"Skipping excluded file: {src_path}")
                    continue
                
                # Preserve directory structure relative to repo root
                rel_path = src_path.relative_to(self.repo_root)
                dst_path = self.home_dir / rel_path
                logger.info(f"Exporting {src_path} -> {dst_path}")
                
                if src_path.is_file():
                    self.file_ops.export_file(src_path, dst_path, force=True)
                elif src_path.is_dir():
                    if cleanup:
                        self.file_ops.export_directory_with_cleanup(
                            src_path, dst_path, force=True, cleanup=cleanup,
                            dry_run=dry_run, interactive=interactive,
                            create_backup=create_backup
                        )
                    else:
                        self.file_ops.export_directory(src_path, dst_path, force=True)
                else:
                    logger.warning(f"Unknown file type: {src_path}")
    
    def import_files(self, files: List[str]) -> None:
        """Import files from home directory to repository."""
        logger.info(f"Importing files: {files}")
        
        for file_pattern in files:
            src_paths = self._resolve_home_paths(file_pattern)
            
            for src_path in src_paths:
                if not src_path.exists():
                    logger.warning(f"Source file does not exist: {src_path}")
                    continue
                
                dst_path = self._get_repo_path(src_path)
                logger.info(f"Importing {src_path} -> {dst_path}")
                
                if src_path.is_file():
                    self.file_ops.import_file(src_path, dst_path)
                elif src_path.is_dir():
                    self.file_ops.import_directory(src_path, dst_path)
                else:
                    logger.warning(f"Unknown file type: {src_path}")
    
    def status(self, files: List[str]) -> None:
        """Check git status of managed files."""
        logger.info(f"Checking status for: {files}")
        
        for file_pattern in files:
            src_paths = self._resolve_source_paths(file_pattern)
            
            for src_path in src_paths:
                if not src_path.exists():
                    continue
                
                # Run git status
                try:
                    result = subprocess.run(
                        ["git", "status", "--porcelain", str(src_path)],
                        capture_output=True,
                        text=True,
                        cwd=self.repo_root
                    )
                    
                    if result.stdout.strip():
                        console.print(f"[yellow]{src_path}[/yellow]: {result.stdout.strip()}")
                    else:
                        console.print(f"[green]{src_path}[/green]: clean")
                        
                except subprocess.CalledProcessError as e:
                    logger.error(f"Git status failed for {src_path}: {e}")
    
    def diff(self, files: List[str]) -> None:
        """Compare files between repository and home directory."""
        logger.info(f"Running diff for: {files}")
        
        for file_pattern in files:
            src_paths = self._resolve_source_paths(file_pattern)
            
            for src_path in src_paths:
                if not src_path.exists():
                    continue
                
                dst_path = self._get_destination_path(src_path)
                
                if not dst_path.exists():
                    console.print(f"[red]{dst_path}[/red]: does not exist in home directory")
                    continue
                
                # Use vimdiff if available, otherwise use diff
                diff_cmd = "vimdiff" if self._command_exists("vimdiff") else "diff"
                
                try:
                    subprocess.run([diff_cmd, str(src_path), str(dst_path)], check=True)
                except subprocess.CalledProcessError:
                    # Diff found differences, which is expected
                    pass
                except FileNotFoundError:
                    logger.error(f"Diff command not found: {diff_cmd}")
    
    def _resolve_source_paths(self, pattern: str) -> List[Path]:
        """Resolve file patterns to actual source paths."""
        if pattern.startswith("/"):
            # Absolute path
            return [Path(pattern)]
        else:
            # Relative to repo root
            return list(self.repo_root.glob(pattern))
    
    def _resolve_home_paths(self, pattern: str) -> List[Path]:
        """Resolve file patterns to home directory paths."""
        if pattern.startswith("/"):
            # Absolute path
            return [Path(pattern)]
        elif pattern.startswith("~/"):
            # Home directory path
            return [Path(pattern).expanduser()]
        else:
            # Relative to home directory
            return list(self.home_dir.glob(pattern))
    
    def _get_destination_path(self, src_path: Path) -> Path:
        """Get destination path in home directory."""
        if src_path.is_absolute():
            # For absolute paths, assume they're already in the right place
            return src_path
        else:
            # Relative to repo root -> relative to home directory
            rel_path = src_path.relative_to(self.repo_root)
            return self.home_dir / rel_path
    
    def _get_repo_path(self, src_path: Path) -> Path:
        """Get repository path for imported file."""
        if src_path.is_absolute():
            # For absolute paths, make them relative to home directory
            try:
                rel_path = src_path.relative_to(self.home_dir)
                return self.repo_root / rel_path
            except ValueError:
                # Path is not under home directory
                return self.repo_root / src_path.name
        else:
            # Already relative
            return self.repo_root / src_path
    
    def _command_exists(self, command: str) -> bool:
        """Check if a command exists in PATH."""
        try:
            subprocess.run(["which", command], capture_output=True, check=True)
            return True
        except subprocess.CalledProcessError:
            return False
    
    def _detect_uncommitted_changes(self) -> Dict[str, List[str]]:
        """Detect uncommitted changes in the repository."""
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                cwd=self.repo_root
            )
            
            if result.returncode != 0:
                logger.warning("Failed to check git status")
                return {}
            
            changes = {
                "modified": [],
                "staged": [],
                "untracked": []
            }
            
            for line in result.stdout.strip().split('\n'):
                if not line.strip():
                    continue
                    
                status = line[:2]
                filename = line[3:]
                
                if status[0] == 'M':  # Staged modification
                    changes["staged"].append(filename)
                elif status[1] == 'M':  # Unstaged modification
                    changes["modified"].append(filename)
                elif status == '??':  # Untracked file
                    changes["untracked"].append(filename)
                elif status[0] == 'A':  # Staged addition
                    changes["staged"].append(filename)
                elif status[0] == 'D':  # Staged deletion
                    changes["staged"].append(filename)
                elif status[1] == 'D':  # Unstaged deletion
                    changes["modified"].append(filename)
            
            return changes
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git status failed: {e}")
            return {}
    
    def _handle_uncommitted_changes(self, changes: Dict[str, List[str]], working_dir: bool) -> None:
        """Handle uncommitted changes with user interaction."""
        if not any(changes.values()):
            return
        
        console.print("\n[yellow]⚠️  Uncommitted changes detected![/yellow]")
        
        # Show summary of changes
        if changes["modified"]:
            console.print(f"[red]Modified files: {', '.join(changes['modified'])}[/red]")
        if changes["staged"]:
            console.print(f"[blue]Staged files: {', '.join(changes['staged'])}[/blue]")
        if changes["untracked"]:
            console.print(f"[yellow]Untracked files: {', '.join(changes['untracked'])}[/yellow]")
        
        console.print("\n[bold]Options:[/bold]")
        console.print("1. Use git HEAD (overwrite uncommitted changes)")
        console.print("2. Use working directory (preserve uncommitted changes)")
        console.print("3. Abort sync")
        console.print("4. Commit changes first")
        
        while True:
            choice = Prompt.ask(
                "Choose an option (1-4)",
                choices=["1", "2", "3", "4"],
                default="3"
            )
            
            if choice == "1":
                if Confirm.ask("⚠️  This will overwrite uncommitted changes. Continue?"):
                    self._create_backup_for_changes(changes)
                    return  # Continue with git HEAD mode
                else:
                    continue
            elif choice == "2":
                console.print("[blue]Using working directory mode...[/blue]")
                # Set working_dir flag for the rest of the operation
                self._working_dir_mode = True
                return
            elif choice == "3":
                console.print("[yellow]Sync aborted by user[/yellow]")
                sys.exit(0)
            elif choice == "4":
                console.print("[blue]Please commit your changes first, then run sync again[/blue]")
                sys.exit(0)
    
    def _create_backup_for_changes(self, changes: Dict[str, List[str]]) -> None:
        """Create backup of uncommitted changes."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = self.repo_root / f".dotfiles_backup_{timestamp}"
        backup_dir.mkdir(exist_ok=True)
        
        all_files = changes["modified"] + changes["staged"] + changes["untracked"]
        
        for filename in all_files:
            src_path = self.repo_root / filename
            if src_path.exists():
                dst_path = backup_dir / filename
                dst_path.parent.mkdir(parents=True, exist_ok=True)
                
                try:
                    import shutil
                    shutil.copy2(src_path, dst_path)
                    logger.info(f"Backed up {src_path} -> {dst_path}")
                except Exception as e:
                    logger.error(f"Failed to backup {src_path}: {e}")
        
        console.print(f"[blue]Backup created: {backup_dir}[/blue]")
    
    def sync(self, files: Optional[List[str]] = None, working_dir: bool = False, 
             dry_run: bool = False) -> None:
        """Synchronize files between repository and home directory."""
        if files is None:
            # Get all tracked files from git
            try:
                result = subprocess.run(
                    ["git", "ls-files"],
                    capture_output=True,
                    text=True,
                    cwd=self.repo_root
                )
                
                if result.returncode == 0:
                    files = result.stdout.strip().split('\n')
                    files = [f for f in files if f.strip()]
                else:
                    console.print("[red]Failed to get git tracked files[/red]")
                    return
            except subprocess.CalledProcessError as e:
                console.print(f"[red]Git command failed: {e}[/red]")
                return
        
        if dry_run:
            console.print("[blue]DRY RUN MODE - No changes will be made[/blue]")
        
        # Check for uncommitted changes if not in working directory mode
        if not working_dir:
            uncommitted_changes = self._detect_uncommitted_changes()
            if uncommitted_changes:
                self._handle_uncommitted_changes(uncommitted_changes, working_dir)
                # Re-check working_dir flag after user interaction
                working_dir = getattr(self, '_working_dir_mode', False)
        
        # Export files
        self.export(
            files,
            force=force,
            dry_run=dry_run,
            working_dir=working_dir
        )
        
        if dry_run:
            console.print("[blue]Sync dry run completed[/blue]")
        else:
            console.print("[green]Sync completed successfully[/green]")