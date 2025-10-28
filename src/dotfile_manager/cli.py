"""Command-line interface for dotfile manager."""

import os
import sys
from pathlib import Path
from typing import List, Optional

import click
from rich.console import Console

from .core import DotfileManager

console = Console()


@click.group()
@click.option("--debug", is_flag=True, help="Enable debug output")
@click.pass_context
def cli(ctx: click.Context, debug: bool) -> None:
    """Modern Python replacement for dotfile_stash."""
    ctx.ensure_object(dict)
    ctx.obj["debug"] = debug
    ctx.obj["manager"] = DotfileManager(debug=debug)


@cli.command()
@click.argument("files", nargs=-1, required=True)
@click.option("--cleanup", is_flag=True, help="Clean up orphaned files in target directories")
@click.option("--dry-run", is_flag=True, help="Show what would be done without making changes")
@click.option("--interactive", is_flag=True, help="Interactive mode for orphan cleanup review")
@click.option("--backup", is_flag=True, help="Create backup before cleanup (git is source of truth)")
@click.option("--working-dir", is_flag=True, help="Use working directory files instead of git HEAD")
@click.pass_context
def export(ctx: click.Context, files: List[str], cleanup: bool,
           dry_run: bool, interactive: bool, backup: bool, working_dir: bool) -> None:
    """Export files from repository to home directory."""
    manager: DotfileManager = ctx.obj["manager"]
    
    # Validate options
    if cleanup and not interactive and not dry_run:
        console.print("[yellow]Note: --cleanup will auto-delete previously-managed files deleted from git (git is source of truth)[/yellow]")
    
    if dry_run:
        console.print("[blue]DRY RUN MODE - No changes will be made[/blue]")
    
    try:
        manager.export(
            files, 
            cleanup=cleanup,
            dry_run=dry_run, 
            interactive=interactive,
            create_backup=backup,
            working_dir=working_dir
        )
        
        if dry_run:
            console.print("[blue]Dry run completed - no changes made[/blue]")
        else:
            console.print("[green]Export completed successfully[/green]")
            
    except Exception as e:
        console.print(f"[red]Export failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.argument("files", nargs=-1, required=True)
@click.pass_context
def import_files(ctx: click.Context, files: List[str]) -> None:
    """Import files from home directory to repository."""
    manager: DotfileManager = ctx.obj["manager"]
    
    try:
        manager.import_files(files)
        console.print("[green]Import completed successfully[/green]")
    except Exception as e:
        console.print(f"[red]Import failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.argument("files", nargs=-1, required=True)
@click.pass_context
def status(ctx: click.Context, files: List[str]) -> None:
    """Check git status of managed files."""
    manager: DotfileManager = ctx.obj["manager"]
    
    try:
        manager.status(files)
    except Exception as e:
        console.print(f"[red]Status check failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.argument("files", nargs=-1, required=True)
@click.pass_context
def diff(ctx: click.Context, files: List[str]) -> None:
    """Compare files between repository and home directory."""
    manager: DotfileManager = ctx.obj["manager"]
    
    try:
        manager.diff(files)
    except Exception as e:
        console.print(f"[red]Diff failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.argument("files", nargs=-1, required=False)
@click.option("--working-dir", is_flag=True, help="Use working directory files instead of git HEAD")
@click.option("--dry-run", is_flag=True, help="Show what would be done without making changes")
@click.pass_context
def sync(ctx: click.Context, files: List[str], working_dir: bool, 
         dry_run: bool) -> None:
    """Synchronize files between repository and home directory."""
    manager: DotfileManager = ctx.obj["manager"]
    
    if dry_run:
        console.print("[blue]DRY RUN MODE - No changes will be made[/blue]")
    
    try:
        manager.sync(
            files=files,
            working_dir=working_dir,
            dry_run=dry_run
        )
    except Exception as e:
        console.print(f"[red]Sync failed: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.argument("files", nargs=-1, required=True)
@click.option("--dry-run", is_flag=True, help="Show what would be cleaned without making changes")
@click.option("--interactive", is_flag=True, help="Interactive mode for orphan cleanup review")
@click.option("--backup", is_flag=True, help="Create backup before cleanup (git is source of truth)")
@click.pass_context
def cleanup(ctx: click.Context, files: List[str], dry_run: bool, 
            interactive: bool, backup: bool) -> None:
    """Clean up orphaned files in target directories."""
    manager: DotfileManager = ctx.obj["manager"]
    
    if dry_run:
        console.print("[blue]DRY RUN MODE - No changes will be made[/blue]")
    
    try:
        for file_pattern in files:
            src_paths = manager._resolve_source_paths(file_pattern)
            
            for src_path in src_paths:
                if not src_path.exists():
                    console.print(f"[yellow]Source does not exist: {src_path}[/yellow]")
                    continue
                
                if not src_path.is_dir():
                    console.print(f"[yellow]Skipping non-directory: {src_path}[/yellow]")
                    continue
                
                # Get destination path
                rel_path = src_path.relative_to(manager.repo_root)
                dst_path = manager.home_dir / rel_path
                
                # Get managed files
                managed_files = set()
                for root, dirs, files in os.walk(src_path):
                    root_path = Path(root)
                    rel_path = root_path.relative_to(src_path)
                    dst_dir = dst_path / rel_path
                    
                    for file_name in files:
                        src_file = root_path / file_name
                        if not manager.file_ops._should_skip_file(src_file):
                            rel_file_path = dst_dir / file_name
                            managed_files.add(rel_file_path.relative_to(dst_path))
                
                # Detect orphans
                orphans = manager.file_ops.detect_orphans(dst_path, managed_files)
                
                if not orphans:
                    console.print(f"[green]No orphaned files found in {dst_path}[/green]")
                    continue
                
                # Create backup if requested
                backup_dir = None
                if backup and not dry_run:
                    backup_dir = manager.file_ops.create_backup(dst_path)
                    console.print(f"[blue]Backup created: {backup_dir}[/blue]")
                
                # Handle cleanup
                if dry_run:
                    manager.file_ops.cleanup_orphans(orphans, dry_run=True)
                elif interactive:
                    if manager.file_ops.bulk_review_orphans(orphans, dst_path):
                        manager.file_ops.cleanup_orphans(orphans, dry_run=False)
                else:
                    console.print(f"[yellow]Found {len(orphans)} orphaned files (use --interactive to review)[/yellow]")
                    for orphan in orphans:
                        console.print(f"  Orphaned: {orphan}")
        
        if dry_run:
            console.print("[blue]Cleanup dry run completed[/blue]")
        else:
            console.print("[green]Cleanup completed successfully[/green]")
            
    except Exception as e:
        console.print(f"[red]Cleanup failed: {e}[/red]")
        sys.exit(1)


def main() -> None:
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()