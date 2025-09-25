"""Configuration management for dotfile manager."""

import logging
from pathlib import Path
from typing import List, Optional

import toml

logger = logging.getLogger(__name__)


class DotfileConfig:
    """Configuration for dotfile manager."""
    
    def __init__(self, config_path: Optional[Path] = None) -> None:
        """Initialize configuration."""
        self.config_path = config_path or Path(".dotfiles.toml")
        self.exclusion_patterns: List[str] = []
        self.exclude_directories: List[str] = []
        self.exclude_files: List[str] = []
        
        self._load_config()
    
    def _load_config(self) -> None:
        """Load configuration from TOML file."""
        if not self.config_path.exists():
            logger.warning(f"Configuration file not found: {self.config_path}")
            self._set_defaults()
            return
        
        try:
            config_data = toml.load(self.config_path)
            exclusions = config_data.get("exclusions", {})
            
            self.exclusion_patterns = exclusions.get("patterns", [])
            self.exclude_directories = exclusions.get("exclude_directories", [])
            self.exclude_files = exclusions.get("exclude_files", [])
            
            logger.info(f"Loaded configuration from {self.config_path}")
            logger.debug(f"Exclusion patterns: {self.exclusion_patterns}")
            logger.debug(f"Exclude directories: {self.exclude_directories}")
            logger.debug(f"Exclude files: {self.exclude_files}")
            
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            self._set_defaults()
    
    def _set_defaults(self) -> None:
        """Set default exclusion patterns."""
        self.exclusion_patterns = [
            "*.pyc", "*.pyo", "*.pyd", "__pycache__/", "*.egg-info/",
            ".pytest_cache/", ".mypy_cache/", ".ruff_cache/",
            "build/", "dist/", "*.egg/", "*.whl",
            ".vscode/", ".idea/", "*.swp", "*.swo", "*.swx", "*.tmp", "*.bak", "*~",
            ".DS_Store", "Thumbs.db", ".directory",
            ".git/", ".gitignore",
            ".venv/", "venv/", ".env/", "env/",
            "node_modules/", "npm-debug.log*", "yarn-debug.log*", "yarn-error.log*",
            "*.log", "logs/", "tmp/", "temp/", "*.tmp", "*.temp",
        ]
        
        self.exclude_directories = [
            ".git", ".venv", "venv", "node_modules", "build", "dist",
            "tests", "test", "src", "lib", ".pytest_cache", ".mypy_cache", ".ruff_cache",
        ]
        
        self.exclude_files = [
            "pyproject.toml", "requirements.txt", "package.json",
            "README.md", "TODO.md", "CHANGELOG.md", "LICENSE", ".gitignore",
        ]
        
        logger.info("Using default exclusion patterns")
    
    def should_exclude_path(self, path: Path) -> bool:
        """Check if a path should be excluded."""
        path_str = str(path)
        
        # Check exact file matches
        if path.name in self.exclude_files:
            return True
        
        # Check exact directory matches
        if path.name in self.exclude_directories:
            return True
        
        # Check patterns
        for pattern in self.exclusion_patterns:
            if self._matches_pattern(path_str, pattern):
                return True
        
        return False
    
    def _matches_pattern(self, path_str: str, pattern: str) -> bool:
        """Check if path matches a pattern."""
        import fnmatch
        
        # Handle directory patterns ending with /
        if pattern.endswith('/'):
            pattern = pattern[:-1]
            # Check if any part of the path matches
            path_parts = Path(path_str).parts
            for part in path_parts:
                if fnmatch.fnmatch(part, pattern):
                    return True
        else:
            # Check filename and full path
            if fnmatch.fnmatch(path_str, pattern) or fnmatch.fnmatch(Path(path_str).name, pattern):
                return True
        
        return False