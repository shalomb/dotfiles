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
    """Get a clean test environment with a private tmux socket.

    Never touches the caller's tmux server: TMUX is dropped and TMUX_TMPDIR
    points at a throwaway dir, so tmux commands run with this env talk to an
    isolated (initially empty) server.
    """
    env = os.environ.copy()
    env.pop('TMUX', None)
    with tempfile.TemporaryDirectory(prefix='tmux-test-') as tmpdir:
        env['TMUX_TMPDIR'] = tmpdir
        yield env
        subprocess.run(['tmux', 'kill-server'], env=env, capture_output=True)


def run_command(cmd: str, env=None, cwd=None, timeout: float = 10):
    """Run a shell command string (pipes, $VARS, ~ allowed) and return the result.

    The shell is invoked explicitly as `bash -c` rather than via shell=True.
    Callers pass test-authored command strings, never untrusted input.
    """
    try:
        result = subprocess.run(
            ['bash', '-c', cmd],
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

# Suites that drive agentctl/gpg/ssh. Each is sandboxed automatically, before
# its xunit setup_method runs (those read os.environ['HOME'] to build env dicts).
AGENT_ISOLATED_SUITES = frozenset({
    'test_agentctl_gpg_recovery',
    'test_agent_management',
    'test_agent_test_isolation',
})

_REAL_HOME = os.environ.get('HOME', '')


@pytest.fixture(scope='session')
def real_home():
    """The developer's real HOME, captured before any sandboxing."""
    return _REAL_HOME


@pytest.fixture(autouse=True)
def _isolate_agent_suites(request):
    """Autouse so it is set up ahead of per-class xunit setup_method hooks."""
    if request.module.__name__.rsplit('.', 1)[-1] in AGENT_ISOLATED_SUITES:
        request.getfixturevalue('isolated_agent_env')


@pytest.fixture
def isolated_agent_env(monkeypatch):
    """Sandbox every path the agent/gpg/ssh tooling resolves from the environment.

    Suites that drive agentctl must never reach the developer's live gpg-agent:
    `killagent` or a failed-unlock restart wipes the cached passphrases and
    re-locks signing keys. HOME, GNUPGHOME and the XDG dirs move into a
    short-lived temp dir (short, so gpg's unix socket path stays under the
    108-byte limit) and the ssh/gpg agent hand-off variables are dropped.
    """
    real_home = _REAL_HOME
    # uv resolves its cache from HOME; keep the real one so `uv run` stays offline-fast.
    monkeypatch.setenv('UV_CACHE_DIR', os.environ.get('UV_CACHE_DIR') or str(Path(real_home) / '.cache' / 'uv'))
    with tempfile.TemporaryDirectory(prefix='agt-') as tmp:
        root = Path(tmp)
        layout = {
            'HOME': root / 'home',
            'GNUPGHOME': root / 'gnupg',
            'XDG_RUNTIME_DIR': root / 'run',
            'XDG_STATE_HOME': root / 'state',
            'XDG_CONFIG_HOME': root / 'config',
            'XDG_CACHE_HOME': root / 'cache',
        }
        for var, path in layout.items():
            path.mkdir(parents=True, mode=0o700)
            monkeypatch.setenv(var, str(path))
        for var in ('SSH_AUTH_SOCK', 'SSH_AGENT_PID', 'GPG_AGENT_INFO', 'GPG_TTY'):
            monkeypatch.delenv(var, raising=False)
        yield {'real_home': real_home, 'root': str(root)}
