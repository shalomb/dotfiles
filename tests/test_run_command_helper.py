"""run_command: callers pass shell syntax; the shell must be explicit, not shell=True."""
from unittest.mock import patch

import conftest


def test_supports_pipes_variables_and_tilde(tmp_path):
    # Characterisation of what the ~40 callers rely on.
    out = conftest.run_command('echo "$FOO" | tr a-z A-Z; test -d ~ && echo home', env={'FOO': 'bar', 'HOME': str(tmp_path), 'PATH': '/usr/bin:/bin'})
    assert out['success'] and out['stdout'].splitlines() == ['BAR', 'home']


def test_reports_failure_and_timeout():
    assert conftest.run_command('exit 3')['returncode'] == 3
    slow = conftest.run_command('sleep 5', timeout=0.2)
    assert slow['success'] is False and 'timed out' in slow['stderr']


def test_does_not_use_shell_true():
    with patch.object(conftest.subprocess, 'run') as run:
        run.return_value.returncode = 0
        run.return_value.stdout = run.return_value.stderr = ''
        conftest.run_command('echo hi')
    args, kwargs = run.call_args
    assert not kwargs.get('shell'), 'pass an explicit argv, e.g. ["bash", "-c", cmd]'
    assert args[0][:2] == ['bash', '-c'] and args[0][2] == 'echo hi'
