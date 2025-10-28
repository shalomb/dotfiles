#!/usr/bin/env python3
"""
Jira Config Merger

Merges multiple Jira configuration files in hierarchical order.
The most specific (current directory) config takes precedence over parent configs.

Usage:
    python3 merge_jira_configs.py <base_config> <project_configs...>

The script will merge configs in order, with later configs overriding earlier ones.
"""

import sys
import yaml
import os
from pathlib import Path
from typing import Dict, Any, List


def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep merge two dictionaries, with override taking precedence.
    
    Args:
        base: Base dictionary to merge into
        override: Dictionary to merge on top of base
        
    Returns:
        Merged dictionary
    """
    result = base.copy()
    
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    
    return result


def load_yaml_safe(filepath: str) -> Dict[str, Any]:
    """
    Safely load a YAML file, returning empty dict if file doesn't exist or is invalid.
    
    Args:
        filepath: Path to YAML file
        
    Returns:
        Dictionary from YAML file, or empty dict if file doesn't exist/invalid
    """
    if not os.path.exists(filepath):
        return {}
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    except (yaml.YAMLError, IOError) as e:
        print(f"Warning: Could not load {filepath}: {e}", file=sys.stderr)
        return {}


def merge_jira_configs(config_files: List[str]) -> Dict[str, Any]:
    """
    Merge multiple Jira configuration files in order.
    
    Args:
        config_files: List of config file paths in order (base first, most specific last)
        
    Returns:
        Merged configuration dictionary
    """
    merged_config = {}
    
    for config_file in config_files:
        if config_file:  # Skip empty strings
            config = load_yaml_safe(config_file)
            merged_config = deep_merge(merged_config, config)
    
    return merged_config


def main():
    """Main entry point for the script."""
    if len(sys.argv) < 2:
        print("Usage: python3 merge_jira_configs.py <base_config> [project_configs...]", file=sys.stderr)
        sys.exit(1)
    
    # Get all config files from command line
    config_files = sys.argv[1:]
    
    # Filter out empty strings and non-existent files
    valid_configs = []
    for config_file in config_files:
        if config_file and os.path.exists(config_file):
            valid_configs.append(config_file)
    
    if not valid_configs:
        print("Error: No valid configuration files found", file=sys.stderr)
        sys.exit(1)
    
    # Merge configurations
    merged_config = merge_jira_configs(valid_configs)
    
    # Output merged configuration as YAML
    try:
        yaml.dump(merged_config, sys.stdout, default_flow_style=False, sort_keys=False)
    except yaml.YAMLError as e:
        print(f"Error: Could not serialize merged config: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()