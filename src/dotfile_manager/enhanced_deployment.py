#!/usr/bin/env python3
"""
Enhanced dotfile deployment with XDG compliance and symlink support.

This module provides deployment strategies that maintain XDG Base Directory
compliance while handling symlink chains properly.
"""

import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Union, List
import logging

logger = logging.getLogger(__name__)


class DeploymentStrategy:
    """Base class for deployment strategies."""
    
    def deploy(self, source: Path, target: Path, force: bool = False) -> bool:
        """Deploy a file from source to target."""
        raise NotImplementedError


class SymlinkStrategy(DeploymentStrategy):
    """Deploy using symlinks for XDG compliance."""
    
    def deploy(self, source: Path, target: Path, force: bool = False) -> bool:
        """Create a symlink from target to source."""
        try:
            # Remove existing file/link if force is enabled
            if force and target.exists():
                if target.is_symlink():
                    target.unlink()
                    logger.info(f"Removed existing symlink: {target}")
                elif target.is_file():
                    target.unlink()
                    logger.info(f"Removed existing file: {target}")
                elif target.is_dir():
                    shutil.rmtree(target)
                    logger.info(f"Removed existing directory: {target}")
            
            # Create parent directories if needed
            target.parent.mkdir(parents=True, exist_ok=True)
            
            # Create symlink
            target.symlink_to(source)
            logger.info(f"Created symlink: {target} -> {source}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create symlink {target} -> {source}: {e}")
            return False


class HardlinkStrategy(DeploymentStrategy):
    """Deploy using hard links (current behavior)."""
    
    def deploy(self, source: Path, target: Path, force: bool = False) -> bool:
        """Create a hard link from target to source."""
        try:
            # Remove existing file/link if force is enabled
            if force and target.exists():
                target.unlink()
                logger.info(f"Removed existing file: {target}")
            
            # Create parent directories if needed
            target.parent.mkdir(parents=True, exist_ok=True)
            
            # Create hard link
            os.link(source, target)
            logger.info(f"Created hard link: {target} -> {source}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create hard link {target} -> {source}: {e}")
            return False


class XDGCompliantStrategy(DeploymentStrategy):
    """
    XDG-compliant deployment strategy.
    
    This strategy:
    1. Creates symlinks for XDG compliance
    2. Handles symlink chains properly
    3. Maintains backward compatibility
    """
    
    def __init__(self, prefer_symlinks: bool = True):
        self.prefer_symlinks = prefer_symlinks
    
    def deploy(self, source: Path, target: Path, force: bool = False) -> bool:
        """Deploy with XDG compliance."""
        try:
            # Determine if we should use symlinks or hard links
            if self.prefer_symlinks:
                strategy = SymlinkStrategy()
            else:
                strategy = HardlinkStrategy()
            
            return strategy.deploy(source, target, force)
            
        except Exception as e:
            logger.error(f"XDG deployment failed for {target}: {e}")
            return False


class SmartBashDeployment:
    """
    Smart deployment for bash configuration files.
    
    This handles the special case of bash files where we want:
    1. XDG-compliant paths in the repository
    2. Symlinks in the home directory
    3. Proper handling of bash startup file chains
    """
    
    def __init__(self, dotfiles_root: Path, home_dir: Path):
        self.dotfiles_root = dotfiles_root
        self.home_dir = home_dir
        self.strategy = XDGCompliantStrategy(prefer_symlinks=True)
    
    def deploy_bash_config(self, config_file: str) -> bool:
        """
        Deploy bash configuration file with XDG compliance.
        
        Args:
            config_file: Name of config file (e.g., 'bashrc', 'profile')
        
        Returns:
            True if deployment successful
        """
        # Source file in XDG-compliant location
        source = self.dotfiles_root / ".config" / "bash" / config_file
        
        # Target in home directory
        target = self.home_dir / f".{config_file}"
        
        if not source.exists():
            logger.error(f"Source file not found: {source}")
            return False
        
        logger.info(f"Deploying bash config: {config_file}")
        logger.info(f"  Source: {source}")
        logger.info(f"  Target: {target}")
        
        return self.strategy.deploy(source, target, force=True)
    
    def deploy_all_bash_configs(self) -> bool:
        """Deploy all bash configuration files."""
        configs = ['bashrc', 'profile', 'bash_logout']
        success = True
        
        for config in configs:
            if not self.deploy_bash_config(config):
                success = False
        
        return success
    
    def verify_deployment(self) -> dict:
        """Verify the deployment status."""
        status = {}
        
        for config in ['bashrc', 'profile', 'bash_logout']:
            target = self.home_dir / f".{config}"
            source = self.dotfiles_root / ".config" / "bash" / config
            
            if target.exists():
                if target.is_symlink():
                    status[config] = {
                        'type': 'symlink',
                        'target': str(target),
                        'source': str(target.readlink()),
                        'xdg_compliant': str(target.readlink()).startswith(str(source))
                    }
                elif target.is_file():
                    status[config] = {
                        'type': 'file',
                        'target': str(target),
                        'source': 'unknown'
                    }
            else:
                status[config] = {
                    'type': 'missing',
                    'target': str(target)
                }
        
        return status


def main():
    """Test the enhanced deployment system."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Enhanced dotfile deployment')
    parser.add_argument('--dotfiles-root', default='~/.config/dotfiles',
                       help='Root directory of dotfiles repository')
    parser.add_argument('--home-dir', default='~',
                       help='Home directory')
    parser.add_argument('--action', choices=['deploy', 'verify'], default='verify',
                       help='Action to perform')
    parser.add_argument('--config', choices=['bashrc', 'profile', 'bash_logout', 'all'],
                       default='all', help='Configuration file to deploy')
    
    args = parser.parse_args()
    
    # Expand paths
    dotfiles_root = Path(args.dotfiles_root).expanduser()
    home_dir = Path(args.home_dir).expanduser()
    
    # Create deployment manager
    deployer = SmartBashDeployment(dotfiles_root, home_dir)
    
    if args.action == 'deploy':
        if args.config == 'all':
            success = deployer.deploy_all_bash_configs()
        else:
            success = deployer.deploy_bash_config(args.config)
        
        if success:
            print("✅ Deployment successful")
        else:
            print("❌ Deployment failed")
            return 1
    
    elif args.action == 'verify':
        status = deployer.verify_deployment()
        
        print("📋 Deployment Status:")
        for config, info in status.items():
            print(f"  {config}:")
            print(f"    Type: {info['type']}")
            print(f"    Target: {info['target']}")
            if 'source' in info:
                print(f"    Source: {info['source']}")
            if 'xdg_compliant' in info:
                print(f"    XDG Compliant: {info['xdg_compliant']}")
            print()
    
    return 0


if __name__ == '__main__':
    exit(main())