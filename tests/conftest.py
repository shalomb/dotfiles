"""
Pytest configuration and fixtures for dotfiles acceptance tests.
"""
import pytest
import subprocess
import tempfile
import os
import shutil
from pathlib import Path


@pytest.fixture
def temp_home():
    """Create a temporary home directory for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def dotfiles_repo():
    """Get the path to the dotfiles repository."""
    return Path(__file__).parent.parent


@pytest.fixture
def test_env():
    """Get a clean test environment."""
    env = os.environ.copy()
    # Remove any existing tmux sessions
    try:
        subprocess.run(['tmux', 'kill-server'], capture_output=True)
    except:
        pass
    return env


def run_command(cmd, env=None, cwd=None, timeout=10):
    """Run a command and return the result."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            env=env,
            cwd=cwd,
            timeout=timeout
        )
        return {
            'returncode': result.returncode,
            'stdout': result.stdout.strip(),
            'stderr': result.stderr.strip(),
            'success': result.returncode == 0
        }
    except subprocess.TimeoutExpired:
        return {
            'returncode': -1,
            'stdout': '',
            'stderr': 'Command timed out',
            'success': False
        }


@pytest.fixture
def cmd():
    """Fixture to run commands."""
    return run_command