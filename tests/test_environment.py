"""
Test environment variable setup and PATH configuration.
"""
import pytest


class TestEnvironment:
    """Test environment variable configuration."""

    def test_path_setup(self, cmd, test_env):
        """Test that PATH is properly configured."""
        # Test login shell gets full PATH
        result = cmd('bash -l -c "echo $PATH"', env=test_env)
        assert result['success'], f"Command failed: {result['stderr']}"
        
        path = result['stdout']
        assert '/home/unop/.local/bin' in path, f"Missing ~/.local/bin in PATH: {path}"
        assert '/home/unop/.cargo/bin' in path, f"Missing ~/.cargo/bin in PATH: {path}"
        assert '/home/unop/go/bin' in path, f"Missing ~/.go/bin in PATH: {path}"

    def test_key_tools_available(self, cmd, test_env):
        """Test that key development tools are available."""
        tools = ['ghostship', 'tmuxie', 'gum', 'fzf', 'tmux']
        
        for tool in tools:
            result = cmd(f'which {tool}', env=test_env)
            assert result['success'], f"Tool {tool} not found: {result['stderr']}"
            assert result['stdout'], f"Tool {tool} not in PATH"

    def test_ghostship_prompt(self, cmd, test_env):
        """Test that ghostship prompt is working."""
        result = cmd('bash -l -c "ghostship version"', env=test_env)
        assert result['success'], f"ghostship not working: {result['stderr']}"

    def test_tmuxie_functionality(self, cmd, test_env):
        """Test that tmuxie script is functional."""
        result = cmd('tmuxie --help', env=test_env)
        assert result['success'], f"tmuxie not working: {result['stderr']}"
        assert 'tmux session helper' in result['stdout'], "tmuxie help not showing correctly"

    def test_shell_initialization_files(self, cmd, test_env):
        """Test that shell initialization files exist and are readable."""
        files = [
            '~/.bash_profile',
            '~/.config/bash/bashrc',
            '~/.config/bash/rc.d/00-path'
        ]
        
        for file_path in files:
            result = cmd(f'test -f {file_path}', env=test_env)
            assert result['success'], f"File {file_path} does not exist"
            
            result = cmd(f'test -r {file_path}', env=test_env)
            assert result['success'], f"File {file_path} is not readable"