#!/usr/bin/env python3
"""agentctl must verify the SSH agent can actually SIGN, not merely list keys.

`ssh-add -l` succeeds with a locked gpg-agent key; signing is refused later,
so ssh silently falls back to a password prompt.
"""

import subprocess
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from agent_management.agentctl import AgentManager  # noqa: E402


@pytest.fixture
def manager(tmp_path, monkeypatch):
    monkeypatch.setenv("XDG_RUNTIME_DIR", str(tmp_path / "run"))
    monkeypatch.setenv("XDG_STATE_HOME", str(tmp_path / "state"))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / "config"))
    monkeypatch.setenv("SSH_AUTH_SOCK", str(tmp_path / "sock"))
    return AgentManager()


def _proc(rc, out=b""):
    return MagicMock(returncode=rc, stdout=out, stderr=b"")


def _fake_run(sign_rc):
    def run(cmd, *a, **kw):
        if cmd[0] == "ssh-add":  # listing always works, even when locked
            return _proc(0, b"256 SHA256:abc egn8687@vm (ED25519)\n")
        if cmd[0] == "ssh-keygen":
            return _proc(sign_rc)
        return _proc(0)
    return run


def test_signing_refused_is_reported_unhealthy(manager):
    with patch.object(subprocess, "run", side_effect=_fake_run(sign_rc=255)):
        assert manager.ssh_signing_works() is False


def test_signing_ok_is_reported_healthy(manager):
    with patch.object(subprocess, "run", side_effect=_fake_run(sign_rc=0)):
        assert manager.ssh_signing_works() is True
