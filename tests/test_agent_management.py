#!/usr/bin/env python3
"""
Test suite for unified agent management system.
Tests the keychain-inspired architecture for SSH/GPG agent management.
"""

import os
import tempfile
import subprocess
import time
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest


class TestAgentManagement:
    """Test suite for the unified agent management system."""
    
    def setup_method(self):
        """Set up test environment before each test."""
        # Create temporary directories for testing
        self.temp_dir = tempfile.mkdtemp(prefix="agent_test_")
        self.runtime_dir = Path(self.temp_dir) / "runtime"
        self.state_dir = Path(self.temp_dir) / "state"
        self.config_dir = Path(self.temp_dir) / "config"
        
        # Create test directories
        self.runtime_dir.mkdir(parents=True)
        self.state_dir.mkdir(parents=True)
        self.config_dir.mkdir(parents=True)
        
        # Set up environment variables
        self.env = {
            'HOME': os.environ.get('HOME', '/tmp'),
            'XDG_RUNTIME_DIR': str(self.runtime_dir),
            'XDG_STATE_HOME': str(self.state_dir),
            'XDG_CONFIG_HOME': str(self.config_dir),
            'PATH': os.environ.get('PATH', ''),
        }
    
    def teardown_method(self):
        """Clean up test environment after each test."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_agent_command_exists(self):
        """Test that the agent command exists and is executable."""
        # This test will fail until we implement the agent command
        result = subprocess.run(['which', 'agent'], 
                              capture_output=True, text=True, env=self.env)
        assert result.returncode == 0, "agent command should exist"
        assert 'agent' in result.stdout, "agent command should be found"
    
    def test_agent_init_creates_directories(self):
        """Test that agent init creates necessary XDG directories."""
        # Run agent init
        result = subprocess.run(['agent', 'init'], 
                              capture_output=True, text=True, env=self.env)
        assert result.returncode == 0, "agent init should succeed"
        
        # Check that directories are created
        agents_runtime = self.runtime_dir / "agents"
        agents_state = self.state_dir / "agents"
        agents_config = self.config_dir / "agents"
        
        assert agents_runtime.exists(), "Runtime agents directory should exist"
        assert agents_state.exists(), "State agents directory should exist"
        assert agents_config.exists(), "Config agents directory should exist"
    
    def test_agent_status_shows_agent_health(self):
        """Test that agent status shows current agent health."""
        # Initialize agents first
        subprocess.run(['agent', 'init'], env=self.env, check=True)
        
        # Check status
        result = subprocess.run(['agent', 'status'], 
                              capture_output=True, text=True, env=self.env)
        assert result.returncode == 0, "agent status should succeed"
        
        # Should show SSH and GPG agent status
        output = result.stdout.lower()
        assert 'ssh' in output or 'gpg' in output, "Should show agent status"
    
    def test_agent_context_detection(self):
        """Test that agent context detection works correctly."""
        # Test different contexts
        contexts = ['interactive', 'tmux', 'ssh', 'cursor-agent']
        
        for context in contexts:
            with patch.dict(os.environ, {'AGENT_CONTEXT': context}):
                result = subprocess.run(['agent', 'context'], 
                                      capture_output=True, text=True, env=self.env)
                assert result.returncode == 0, f"agent context should work for {context}"
                assert context in result.stdout, f"Should detect {context} context"
    
    def test_agent_share_creates_state_files(self):
        """Test that agent share creates proper state files."""
        # Initialize and share agent state
        subprocess.run(['agent', 'init'], env=self.env, check=True)
        result = subprocess.run(['agent', 'share'], 
                              capture_output=True, text=True, env=self.env)
        assert result.returncode == 0, "agent share should succeed"
        
        # Check that state files are created
        agents_runtime = self.runtime_dir / "agents"
        agents_state = self.state_dir / "agents"
        
        # Should have some state files
        runtime_files = list(agents_runtime.glob("*"))
        state_files = list(agents_state.glob("*"))
        
        assert len(runtime_files) > 0, "Should create runtime state files"
        assert len(state_files) > 0, "Should create persistent state files"
    
    def test_agent_recovery_handles_dead_agents(self):
        """Test that agent recovery handles dead agents gracefully."""
        # Initialize agents
        subprocess.run(['agent', 'init'], env=self.env, check=True)
        
        # Simulate dead agents by removing state files
        agents_runtime = self.runtime_dir / "agents"
        for file in agents_runtime.glob("*.pid"):
            file.unlink()
        
        # Run recovery
        result = subprocess.run(['agent', 'recover'], 
                              capture_output=True, text=True, env=self.env)
        assert result.returncode == 0, "agent recover should succeed"
        
        # Should recreate necessary files
        pid_files = list(agents_runtime.glob("*.pid"))
        assert len(pid_files) > 0, "Should recreate PID files after recovery"
    
    def test_agent_cleanup_removes_dead_agents(self):
        """Test that agent cleanup removes dead agents."""
        # Initialize agents
        subprocess.run(['agent', 'init'], env=self.env, check=True)
        
        # Create fake dead agent files
        agents_runtime = self.runtime_dir / "agents"
        dead_pid = agents_runtime / "ssh-agent.pid"
        dead_pid.write_text("99999")  # Non-existent PID
        
        # Run cleanup
        result = subprocess.run(['agent', 'cleanup'], 
                              capture_output=True, text=True, env=self.env)
        assert result.returncode == 0, "agent cleanup should succeed"
        
        # Dead agent files should be removed
        assert not dead_pid.exists(), "Dead agent files should be cleaned up"
    
    def test_agent_restart_refreshes_agents(self):
        """Test that agent restart refreshes agent state."""
        # Initialize agents
        subprocess.run(['agent', 'init'], env=self.env, check=True)
        
        # Get initial state
        initial_result = subprocess.run(['agent', 'status'], 
                                      capture_output=True, text=True, env=self.env)
        
        # Restart agents
        result = subprocess.run(['agent', 'restart'], 
                              capture_output=True, text=True, env=self.env)
        assert result.returncode == 0, "agent restart should succeed"
        
        # Get new state
        new_result = subprocess.run(['agent', 'status'], 
                                  capture_output=True, text=True, env=self.env)
        
        # State should be refreshed (different timestamps, etc.)
        assert initial_result.stdout != new_result.stdout, "Agent state should be refreshed"
    
    def test_xdg_compliance(self):
        """Test that the system follows XDG Base Directory Specification."""
        # Initialize agents
        subprocess.run(['agent', 'init'], env=self.env, check=True)
        
        # Check that files are in correct XDG directories
        agents_runtime = self.runtime_dir / "agents"
        agents_state = self.state_dir / "agents"
        agents_config = self.config_dir / "agents"
        
        # Runtime files should be in XDG_RUNTIME_DIR
        runtime_files = list(agents_runtime.glob("*"))
        assert len(runtime_files) > 0, "Should use XDG_RUNTIME_DIR for runtime files"
        
        # State files should be in XDG_STATE_HOME
        state_files = list(agents_state.glob("*"))
        assert len(state_files) > 0, "Should use XDG_STATE_HOME for state files"
        
        # Config files should be in XDG_CONFIG_HOME
        config_files = list(agents_config.glob("*"))
        assert len(config_files) > 0, "Should use XDG_CONFIG_HOME for config files"
    
    def test_context_aware_behavior(self):
        """Test that agent behavior adapts to different contexts."""
        contexts = {
            'interactive': {'expected_behavior': 'full_startup'},
            'tmux': {'expected_behavior': 'reuse_existing'},
            'ssh': {'expected_behavior': 'reuse_existing'},
            'cursor-agent': {'expected_behavior': 'reuse_existing'}
        }
        
        for context, config in contexts.items():
            with patch.dict(os.environ, {'AGENT_CONTEXT': context}):
                # Initialize agents in this context
                result = subprocess.run(['agent', 'init'], 
                                      capture_output=True, text=True, env=self.env)
                assert result.returncode == 0, f"Should work in {context} context"
                
                # Check that behavior is appropriate for context
                status_result = subprocess.run(['agent', 'status'], 
                                             capture_output=True, text=True, env=self.env)
                assert status_result.returncode == 0, f"Status should work in {context} context"
    
    def test_race_condition_handling(self):
        """Test that the system handles race conditions properly."""
        # This test simulates multiple shells trying to initialize agents simultaneously
        import threading
        import queue
        
        results = queue.Queue()
        
        def init_agents():
            """Initialize agents in a separate thread."""
            result = subprocess.run(['agent', 'init'], 
                                  capture_output=True, text=True, env=self.env)
            results.put(result.returncode)
        
        # Start multiple threads
        threads = []
        for _ in range(3):
            thread = threading.Thread(target=init_agents)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All should succeed (no race conditions)
        while not results.empty():
            returncode = results.get()
            assert returncode == 0, "All concurrent initializations should succeed"
    
    def test_error_handling(self):
        """Test that the system handles errors gracefully."""
        # Test with invalid environment
        bad_env = self.env.copy()
        bad_env['XDG_RUNTIME_DIR'] = '/nonexistent/directory'
        
        result = subprocess.run(['agent', 'init'], 
                              capture_output=True, text=True, env=bad_env)
        # Should handle missing directory gracefully
        assert result.returncode != 0, "Should fail gracefully with bad environment"
        assert 'error' in result.stderr.lower() or 'failed' in result.stderr.lower(), "Should provide error message"
    
    def test_logging_functionality(self):
        """Test that the system provides proper logging."""
        # Initialize agents
        subprocess.run(['agent', 'init'], env=self.env, check=True)
        
        # Check that log files are created
        agents_state = self.state_dir / "agents" / "logs"
        log_files = list(agents_state.glob("*.log"))
        
        assert len(log_files) > 0, "Should create log files"
        
        # Check that logs contain useful information
        for log_file in log_files:
            content = log_file.read_text()
            assert len(content) > 0, f"Log file {log_file.name} should not be empty"
            assert any(keyword in content.lower() for keyword in ['agent', 'init', 'start']), \
                f"Log file {log_file.name} should contain relevant information"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])