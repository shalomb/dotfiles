"""Command-line interface for dotfile manager."""

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
@click.option("--force", is_flag=True, help="Force overwrite existing files")
@click.pass_context
def export(ctx: click.Context, files: List[str], force: bool) -> None:
    """Export files from repository to home directory."""
    manager: DotfileManager = ctx.obj["manager"]
    
    try:
        manager.export(files, force=force)
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


def main() -> None:
    """Main entry point."""
    cli()


if __name__ == "__main__":
    main()