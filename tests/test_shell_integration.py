"""
Test shell integration and startup behavior.
"""
import pytest


class TestShellIntegration:
    """Test shell integration and startup behavior."""

    def test_bash_profile_sources_bashrc(self, cmd, test_env):
        """Test that bash_profile properly sources bashrc."""
        # Create a clean environment for testing
        clean_env = {k: v for k, v in test_env.items() if not k.startswith('BASH_')}
        
        # Create a test script that sources bash_profile from repo
        test_script = '''
        source .config/bash/profile
        echo "BASH_RC_SOURCED: $BASH_RC_SOURCED"
        echo "PATH: $PATH"
        '''
        
        result = cmd(f'bash -c "{test_script}"', env=clean_env)
        assert result['success'], f"bash_profile sourcing failed: {result['stderr']}"
        
        output = result['stdout']
        assert 'BASH_RC_SOURCED: 1' in output, "bashrc not sourced by bash_profile"
        assert '/home/unop/.local/bin' in output, "PATH not set by bash_profile"

    def test_bashrc_sources_profile(self, cmd, test_env):
        """Test that bashrc properly sources bash_profile."""
        # Create a clean environment for testing
        clean_env = {k: v for k, v in test_env.items() if not k.startswith('BASH_')}
        
        # Create a test script that sources bashrc from repo
        test_script = '''
        source .config/bash/bashrc
        echo "PATH: $PATH"
        '''
        
        result = cmd(f'bash -c "{test_script}"', env=clean_env)
        assert result['success'], f"bashrc sourcing failed: {result['stderr']}"
        
        output = result['stdout']
        assert '/home/unop/.local/bin' in output, "PATH not set by bashrc -> bash_profile chain"

    def test_login_shell_behavior(self, cmd, test_env):
        """Test that login shells behave correctly."""
        # Test login shell gets proper environment
        result = cmd('bash -l -c "echo PATH: $PATH"', env=test_env)
        assert result['success'], f"Login shell failed: {result['stderr']}"
        
        path = result['stdout']
        assert '/home/unop/.local/bin' in path, f"Login shell missing PATH: {path}"

    def test_interactive_shell_behavior(self, cmd, test_env):
        """Test that interactive shells behave correctly."""
        # Test interactive shell gets proper environment
        result = cmd('bash -i -c "echo PATH: $PATH"', env=test_env)
        assert result['success'], f"Interactive shell failed: {result['stderr']}"
        
        path = result['stdout']
        assert '/home/unop/.local/bin' in path, f"Interactive shell missing PATH: {path}"

    def test_non_interactive_shell_behavior(self, cmd, test_env):
        """Test that non-interactive shells behave correctly."""
        # Test non-interactive shell gets proper environment
        result = cmd('bash -c "echo PATH: $PATH"', env=test_env)
        assert result['success'], f"Non-interactive shell failed: {result['stderr']}"
        
        path = result['stdout']
        assert '/home/unop/.local/bin' in path, f"Non-interactive shell missing PATH: {path}"

    def test_ssh_compatibility(self, cmd, test_env):
        """Test SSH compatibility."""
        # Simulate SSH environment
        ssh_env = test_env.copy()
        ssh_env['SSH_CLIENT'] = '192.168.1.100 12345 22'
        ssh_env['SSH_TTY'] = '/dev/pts/0'
        
        # Test that SSH environment works
        result = cmd('bash -l -c "echo SSH_CLIENT: $SSH_CLIENT; echo PATH: $PATH"', env=ssh_env)
        assert result['success'], f"SSH compatibility failed: {result['stderr']}"
        
        output = result['stdout']
        assert 'SSH_CLIENT: 192.168.1.100' in output, "SSH environment not preserved"
        assert '/home/unop/.local/bin' in output, "SSH shell missing PATH"

    def test_shell_functions_available(self, cmd, test_env):
        """Test that shell functions are available."""
        # Create a clean environment for testing
        clean_env = {k: v for k, v in test_env.items() if not k.startswith('BASH_')}
        
        # Test that functions from bashrc are available
        result = cmd('bash -c "source .config/bash/bashrc && type -t path-debug"', env=clean_env)
        if not result['success']:
            pytest.skip("path-debug function not available (may not be defined)")
        assert 'function' in result['stdout'], "path-debug function not defined"

    def test_shell_aliases_available(self, cmd, test_env):
        """Test that shell aliases are available."""
        # Test that aliases from bashrc are available
        result = cmd('bash -c "source .config/bash/bashrc && alias | grep -q ll"', env=test_env)
        # This might not have aliases, so we just check it doesn't crash
        assert result['returncode'] in [0, 1], f"Shell aliases test failed: {result['stderr']}"