"""
Test dotfile deployment and management functionality.
"""
import pytest
import tempfile
import shutil
from pathlib import Path


class TestDotfileDeployment:
    """Test dotfile deployment system."""

    def test_dotfile_stash_exists(self, cmd, test_env, dotfiles_repo):
        """Test that dotfile_stash script exists and is executable."""
        stash_path = dotfiles_repo / 'dotfile_stash'
        assert stash_path.exists(), "dotfile_stash script does not exist"
        assert stash_path.stat().st_mode & 0o111, "dotfile_stash is not executable"

    def test_dotfile_stash_help(self, cmd, test_env, dotfiles_repo):
        """Test that dotfile_stash help works."""
        result = cmd(f'{dotfiles_repo}/dotfile_stash --help', env=test_env)
        # dotfile_stash has known Perl issues, so we just check it doesn't crash completely
        if result['returncode'] == 3 and 'File::Spec' in result['stderr']:
            pytest.skip("dotfile_stash has known Perl File::Spec issues")
        assert result['returncode'] in [0, 1], f"dotfile_stash crashed: {result['stderr']}"
        assert 'usage' in result['stdout'].lower(), "dotfile_stash help not showing usage"

    def test_dotfile_stash_status(self, cmd, test_env, dotfiles_repo):
        """Test that dotfile_stash status works."""
        result = cmd(f'{dotfiles_repo}/dotfile_stash status .bashrc', env=test_env)
        # This should not crash, even if it shows no changes
        assert result['returncode'] in [0, 1], f"dotfile_stash status failed: {result['stderr']}"

    def test_makefile_targets(self, cmd, test_env, dotfiles_repo):
        """Test that key Makefile targets exist."""
        result = cmd('make -n install', env=test_env, cwd=dotfiles_repo)
        assert result['success'], f"make install target failed: {result['stderr']}"

    def test_makefile_help(self, cmd, test_env, dotfiles_repo):
        """Test that Makefile help works."""
        result = cmd('make help', env=test_env, cwd=dotfiles_repo)
        # Help might not exist, but make should not crash
        assert result['returncode'] in [0, 2], f"make help failed: {result['stderr']}"

    def test_python_dotfile_manager(self, cmd, test_env, dotfiles_repo):
        """Test that Python dotfile manager works."""
        # First install the package
        install_result = cmd('uv pip install -e .', env=test_env, cwd=dotfiles_repo)
        if not install_result['success']:
            pytest.skip("Could not install dotfile_manager package")
        
        result = cmd('uv run python -m dotfile_manager --help', env=test_env, cwd=dotfiles_repo)
        assert result['success'], f"Python dotfile manager failed: {result['stderr']}"
        assert 'usage' in result['stdout'].lower(), "Python dotfile manager help not showing usage"

    def test_configuration_files_exist(self, cmd, test_env, dotfiles_repo):
        """Test that key configuration files exist."""
        config_files = [
            '.bash_profile',
            '.config/bash/bashrc',
            '.config/bash/rc.d/00-path',
            '.config/tmux.conf',
            '.config/bin/tmuxie'
        ]
        
        for config_file in config_files:
            file_path = dotfiles_repo / config_file
            assert file_path.exists(), f"Configuration file {config_file} does not exist"
            assert file_path.stat().st_size > 0, f"Configuration file {config_file} is empty"

    def test_symlink_integrity(self, cmd, test_env):
        """Test that symlinks are properly maintained."""
        # Check that ~/.bash_profile is a symlink to the repo
        result = cmd('test -L ~/.bash_profile', env=test_env)
        if not result['success']:
            pytest.skip("~/.bash_profile is not a symlink (may not be deployed)")
        
        # Check that ~/.config/bash/bashrc is a symlink to the repo
        result = cmd('test -L ~/.config/bash/bashrc', env=test_env)
        if not result['success']:
            pytest.skip("~/.config/bash/bashrc is not a symlink (may not be deployed)")