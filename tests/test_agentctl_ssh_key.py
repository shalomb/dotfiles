"""Unit rules behind tests/features/agentctl-ssh-key.feature.

Same FakeGpgAgent as the BDD steps, one level down: AgentManager methods
instead of the CLI.  Test names mirror the feature's Rules.
"""

import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from agent_management.agentctl import AgentManager  # noqa: E402
from support.fake_gpg_agent import FakeGpgAgent  # noqa: E402

MY_TTY = "/dev/pts/9"
OTHER_TTY = "/dev/pts/3"


@pytest.fixture
def agent(tmp_path, monkeypatch):
    for var in ("TMUX", "SSH_CLIENT", "SSH_TTY", "CURSOR_AGENT"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("XDG_RUNTIME_DIR", str(tmp_path / "run"))
    monkeypatch.setenv("XDG_STATE_HOME", str(tmp_path / "state"))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / "config"))
    socket = tmp_path / "S.gpg-agent.ssh"
    socket.touch()
    monkeypatch.setenv("SSH_AUTH_SOCK", str(socket))
    monkeypatch.setenv("GPG_TTY", MY_TTY)
    fake = FakeGpgAgent(ssh_socket=socket, startup_tty=OTHER_TTY, attended={MY_TTY})
    monkeypatch.setattr(subprocess, "run", fake.run)
    return fake


@pytest.fixture
def manager(agent):
    return AgentManager()


# --- Rule: the passphrase is only ever asked for on my terminal -------------

def test_pointing_agent_at_my_terminal_is_confirmed(manager, agent):
    assert manager.point_agent_at_terminal() is True
    assert agent.startup_tty == MY_TTY


def test_agent_ignoring_terminal_changes_is_detected(manager, agent):
    agent.ignores_tty_changes = True
    assert manager.point_agent_at_terminal() is False


@pytest.mark.parametrize("value", ["", "not a tty"])
def test_no_terminal_means_nothing_to_point_at(manager, agent, monkeypatch, value):
    monkeypatch.setenv("GPG_TTY", value)
    assert manager.point_agent_at_terminal() is False
    assert agent.startup_tty == OTHER_TTY


def test_recover_unlocks_on_my_terminal_not_the_stale_one(manager, agent):
    manager.recover_ssh_agent()
    assert agent.prompts == [MY_TTY]


def test_recover_refuses_an_agent_pinned_to_another_terminal(manager, agent, caplog):
    agent.ignores_tty_changes = True
    assert manager.recover_ssh_agent() is False
    assert agent.prompts == []
    assert "keep-tty" in caplog.text


def test_unlock_points_agent_at_my_terminal_first(manager, agent):
    assert manager.unlock_ssh_agent() is True
    assert agent.prompts == [MY_TTY]


# --- Rule: checking the agent never asks for a passphrase -------------------

@pytest.mark.parametrize("cached, state", [(False, "locked"), (True, "unlocked")])
def test_key_state_is_read_without_prompting(manager, agent, cached, state):
    agent.ssh_key_cached = cached
    assert manager.ssh_key_state() == state
    assert agent.prompts == []


def test_key_state_is_unknown_when_the_agent_does_not_answer(manager, agent, monkeypatch):
    monkeypatch.setattr(subprocess, "run", lambda *a, **kw: (_ for _ in ()).throw(FileNotFoundError()))
    assert manager.ssh_key_state() is None


def test_signing_health_check_never_prompts(manager, agent):
    assert manager.ssh_signing_works() is False
    assert agent.prompts == []


def test_recover_without_a_terminal_does_not_blame_the_agent(manager, agent, monkeypatch, caplog):
    monkeypatch.delenv("GPG_TTY")
    agent.ssh_key_cached = True
    assert manager.recover_ssh_agent() is True
    assert "keep-tty" not in caplog.text


# --- Rule: ensuring the key is usable keeps ssh from falling back to a password

def test_ensure_leaves_an_unlocked_key_alone(manager, agent):
    agent.ssh_key_cached = True
    assert manager.ensure_ssh_key() is True
    assert agent.prompts == []


def test_ensure_unlocks_a_locked_key_on_my_terminal(manager, agent):
    assert manager.ensure_ssh_key() is True
    assert agent.prompts == [MY_TTY]
    assert agent.ssh_key_cached


def test_ensure_without_a_terminal_fails_fast(manager, agent, monkeypatch, caplog):
    monkeypatch.delenv("GPG_TTY")
    assert manager.ensure_ssh_key() is False
    assert agent.prompts == []
    assert "SSH key is locked" in caplog.text


def test_ensure_fails_when_nobody_enters_the_passphrase(manager, agent):
    agent.attended.clear()
    assert manager.ensure_ssh_key() is False


# --- Rule: I can see when the passphrase will be needed again ---------------

HOUR = 3600


@pytest.fixture
def clock(monkeypatch):
    from types import SimpleNamespace
    from agent_management import agentctl
    now = SimpleNamespace(value=1_800_000_000.0)
    monkeypatch.setattr(agentctl, "time", SimpleNamespace(
        time=lambda: now.value, sleep=lambda _s: None))
    return now


def test_unlock_through_agentctl_starts_the_expiry_countdown(manager, agent, clock):
    manager.ensure_ssh_key()
    clock.value += 20 * HOUR
    assert manager.ssh_passphrase_expires_in() == 4 * HOUR


def test_expiry_follows_the_agents_configured_lifetime(manager, agent, clock):
    agent.max_cache_ttl_ssh = 8 * HOUR
    manager.ensure_ssh_key()
    assert manager.ssh_passphrase_expires_in() == 8 * HOUR


def test_expiry_is_unknown_without_an_agentctl_unlock(manager, agent, clock):
    agent.ssh_key_cached = True
    assert manager.ssh_passphrase_expires_in() is None


def test_expiry_is_now_once_the_key_is_locked_again(manager, agent, clock):
    manager.ensure_ssh_key()
    agent.forget_passphrase()
    assert manager.ssh_passphrase_expires_in() == 0


def test_stale_record_is_not_trusted_for_a_key_unlocked_elsewhere(manager, agent, clock):
    manager.ensure_ssh_key()
    clock.value += 30 * HOUR  # agent forgot, then someone else unlocked it
    assert manager.ssh_passphrase_expires_in() is None
