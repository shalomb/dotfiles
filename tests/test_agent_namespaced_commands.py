#!/usr/bin/env python3
"""
Test suite for namespaced agent commands
Tests both global and service-specific commands
"""

import os
import sys
import subprocess
import tempfile
import shutil
from pathlib import Path
import pytest

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from agent_management.agent import AgentManager


class TestNamespacedCommands:
    """Test namespaced agent commands."""
    
    def setup_method(self):
        """Set up test environment."""
        # Create temporary directories
        self.temp_dir = Path(tempfile.mkdtemp())
        self.runtime_dir = self.temp_dir / 'runtime'
        self.state_dir = self.temp_dir / 'state'
        self.config_dir = self.temp_dir / 'config'
        
        # Set environment variables
        os.environ['XDG_RUNTIME_DIR'] = str(self.runtime_dir)
        os.environ['XDG_STATE_HOME'] = str(self.state_dir)
        os.environ['XDG_CONFIG_HOME'] = str(self.config_dir)
        
        # Create directories
        self.runtime_dir.mkdir(parents=True)
        self.state_dir.mkdir(parents=True)
        self.config_dir.mkdir(parents=True)
        
        # Initialize manager
        self.manager = AgentManager()
    
    def teardown_method(self):
        """Clean up test environment."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_global_status_command(self):
        """Test global status command."""
        status = self.manager.status()
        
        assert 'context' in status
        assert 'ssh' in status
        assert 'gpg' in status
        assert 'available' in status['ssh']
        assert 'keys' in status['ssh']
        assert 'available' in status['gpg']
        assert 'keys' in status['gpg']
    
    def test_global_init_command(self):
        """Test global init command."""
        # This should not fail even if agents can't be started
        result = self.manager.init()
        assert isinstance(result, bool)
    
    def test_ssh_status_command(self):
        """Test SSH status command."""
        status = self.manager.status()
        ssh_status = status['ssh']
        
        assert 'available' in ssh_status
        assert 'keys' in ssh_status
        assert 'socket' in ssh_status
        assert 'pid' in ssh_status
    
    def test_ssh_init_command(self):
        """Test SSH init command."""
        result = self.manager.init_ssh_agent()
        assert isinstance(result, bool)
    
    def test_ssh_recover_command(self):
        """Test SSH recover command."""
        result = self.manager.recover_ssh_agent()
        assert isinstance(result, bool)
    
    def test_ssh_restart_command(self):
        """Test SSH restart command."""
        result = self.manager.restart_ssh_agent()
        assert isinstance(result, bool)
    
    def test_ssh_keys_command(self):
        """Test SSH keys listing."""
        keys = self.manager.list_ssh_keys()
        assert isinstance(keys, list)
    
    def test_gpg_status_command(self):
        """Test GPG status command."""
        status = self.manager.status()
        gpg_status = status['gpg']
        
        assert 'available' in gpg_status
        assert 'keys' in gpg_status
        assert 'socket' in gpg_status
        assert 'pid' in gpg_status
    
    def test_gpg_init_command(self):
        """Test GPG init command."""
        result = self.manager.init_gpg_agent()
        assert isinstance(result, bool)
    
    def test_gpg_recover_command(self):
        """Test GPG recover command."""
        result = self.manager.recover_gpg_agent()
        assert isinstance(result, bool)
    
    def test_gpg_restart_command(self):
        """Test GPG restart command."""
        result = self.manager.restart_gpg_agent()
        assert isinstance(result, bool)
    
    def test_gpg_keys_command(self):
        """Test GPG keys listing."""
        keys = self.manager.list_gpg_keys()
        assert isinstance(keys, list)
    
    def test_gpg_unlock_command(self):
        """Test GPG unlock command."""
        result = self.manager.unlock_gpg_agent()
        assert isinstance(result, bool)
    
    def test_cleanup_commands(self):
        """Test cleanup commands."""
        ssh_result = self.manager.cleanup_ssh_agent()
        gpg_result = self.manager.cleanup_gpg_agent()
        
        assert isinstance(ssh_result, bool)
        assert isinstance(gpg_result, bool)


class TestCommandLineInterface:
    """Test command line interface for namespaced commands."""
    
    def setup_method(self):
        """Set up test environment."""
        # Create temporary directories
        self.temp_dir = Path(tempfile.mkdtemp())
        self.runtime_dir = self.temp_dir / 'runtime'
        self.state_dir = self.temp_dir / 'state'
        self.config_dir = self.temp_dir / 'config'
        
        # Set environment variables
        os.environ['XDG_RUNTIME_DIR'] = str(self.runtime_dir)
        os.environ['XDG_STATE_HOME'] = str(self.state_dir)
        os.environ['XDG_CONFIG_HOME'] = str(self.config_dir)
        
        # Create directories
        self.runtime_dir.mkdir(parents=True)
        self.state_dir.mkdir(parents=True)
        self.config_dir.mkdir(parents=True)
    
    def teardown_method(self):
        """Clean up test environment."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_help_commands(self):
        """Test help commands."""
        # Test global help
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', '--help'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        assert 'Unified agent management system' in result.stdout
        
        # Test SSH help
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', 'ssh', '--help'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        assert 'SSH agent management' in result.stdout
        
        # Test GPG help
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', 'gpg', '--help'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        assert 'GPG agent management' in result.stdout
    
    def test_global_commands(self):
        """Test global commands."""
        # Test status
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', 'status'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        assert 'Context:' in result.stdout
        assert 'SSH:' in result.stdout
        assert 'GPG:' in result.stdout
        
        # Test context
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', 'context'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        assert 'Context:' in result.stdout
        assert 'Interactive:' in result.stdout
    
    def test_ssh_commands(self):
        """Test SSH-specific commands."""
        # Test SSH status
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', 'ssh', 'status'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        assert 'SSH Agent:' in result.stdout
        
        # Test SSH keys
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', 'ssh', 'keys'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        # Should not fail even if no keys
    
    def test_gpg_commands(self):
        """Test GPG-specific commands."""
        # Test GPG status
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', 'gpg', 'status'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        assert 'GPG Agent:' in result.stdout
        
        # Test GPG keys
        result = subprocess.run([
            sys.executable, '-m', 'agent_management.agent', 'gpg', 'keys'
        ], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
        
        assert result.returncode == 0
        # Should not fail even if no keys


if __name__ == '__main__':
    pytest.main([__file__, '-v'])