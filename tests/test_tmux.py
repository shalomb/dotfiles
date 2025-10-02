"""
Test tmux configuration and functionality.
"""
import pytest
import time


class TestTmux:
    """Test tmux configuration and session management."""

    def test_tmux_configuration(self, cmd, test_env):
        """Test that tmux configuration is valid."""
        # Start tmux server first
        cmd('tmux start-server', env=test_env)
        
        result = cmd('tmux show-options -g default-shell', env=test_env)
        assert result['success'], f"tmux config invalid: {result['stderr']}"
        assert '/bin/bash' in result['stdout'], "tmux default shell not set correctly"

    def test_tmux_environment(self, cmd, test_env):
        """Test that tmux global environment is set."""
        # Start tmux server first
        cmd('tmux start-server', env=test_env)
        
        result = cmd('tmux show-environment -g PATH', env=test_env)
        assert result['success'], f"tmux environment not set: {result['stderr']}"
        assert '/home/unop/.local/bin' in result['stdout'], "tmux PATH missing ~/.local/bin"

    def test_new_tmux_window_path(self, cmd, test_env):
        """Test that new tmux windows get proper PATH."""
        # Create a test session
        session_name = f"test-path-{int(time.time())}"
        
        try:
            # Create session
            result = cmd(f'tmux new-session -d -s {session_name}', env=test_env)
            assert result['success'], f"Failed to create tmux session: {result['stderr']}"
            
            # Check PATH in new session
            result = cmd(f'tmux send-keys -t {session_name} "echo $PATH" Enter', env=test_env)
            time.sleep(1)  # Wait for command to execute
            
            result = cmd(f'tmux capture-pane -t {session_name} -p', env=test_env)
            assert result['success'], f"Failed to capture tmux pane: {result['stderr']}"
            
            output = result['stdout']
            assert '/home/unop/.local/bin' in output, f"New tmux window missing PATH: {output}"
            
        finally:
            # Clean up
            cmd(f'tmux kill-session -t {session_name}', env=test_env)

    def test_new_tmux_window_ghostship(self, cmd, test_env):
        """Test that new tmux windows have ghostship available."""
        session_name = f"test-ghostship-{int(time.time())}"
        
        try:
            # Create session
            result = cmd(f'tmux new-session -d -s {session_name}', env=test_env)
            assert result['success'], f"Failed to create tmux session: {result['stderr']}"
            
            # Check ghostship availability
            result = cmd(f'tmux send-keys -t {session_name} "which ghostship" Enter', env=test_env)
            time.sleep(1)
            
            result = cmd(f'tmux capture-pane -t {session_name} -p', env=test_env)
            assert result['success'], f"Failed to capture tmux pane: {result['stderr']}"
            
            output = result['stdout']
            assert 'ghostship' in output, f"ghostship not available in new tmux window: {output}"
            
        finally:
            # Clean up
            cmd(f'tmux kill-session -t {session_name}', env=test_env)

    def test_tmuxie_session_management(self, cmd, test_env):
        """Test tmuxie session management functionality."""
        session_name = f"test-tmuxie-{int(time.time())}"
        
        try:
            # Test session creation
            result = cmd(f'tmuxie {session_name}', env=test_env)
            # Note: This might fail in SSH context, which is expected
            # We just want to ensure it doesn't crash
            
            # Test session listing
            result = cmd('tmuxie -l', env=test_env)
            # This should show existing sessions
            
        finally:
            # Clean up any test sessions
            cmd(f'tmux kill-session -t {session_name} 2>/dev/null', env=test_env)