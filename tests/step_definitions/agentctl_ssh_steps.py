"""Steps for tests/features/agentctl-ssh-key.feature.

Each `When` runs the real agentctl CLI in-process against FakeGpgAgent;
each `Then` checks only what a person would observe: where a passphrase
prompt appeared, the exit status, and what agentctl printed.
"""

import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import SimpleNamespace
from typing import List

import pytest
from pytest_bdd import given, parsers, then, when

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from agent_management import agentctl  # noqa: E402
from support.fake_gpg_agent import FakeGpgAgent  # noqa: E402

MY_TTY = "/dev/pts/9"
OTHER_TTY = "/dev/pts/3"
HOUR = 3600


@dataclass
class World:
    agent: FakeGpgAgent
    clock: SimpleNamespace
    monkeypatch: pytest.MonkeyPatch
    capsys: pytest.CaptureFixture
    caplog: pytest.LogCaptureFixture
    exit_code: int = 0
    output: str = ""
    runs: List[list] = field(default_factory=list)

    def from_my_terminal(self):
        self.monkeypatch.setenv("GPG_TTY", MY_TTY)
        self.agent.attended.add(MY_TTY)

    def without_a_terminal(self):
        self.monkeypatch.delenv("GPG_TTY", raising=False)

    def agentctl(self, *argv):
        self.capsys.readouterr()
        self.caplog.clear()
        self.monkeypatch.setattr(sys, "argv", ["agentctl", *argv])
        self.exit_code = agentctl.main() or 0
        captured = self.capsys.readouterr()
        self.output = captured.out + captured.err + self.caplog.text
        self.runs.append(list(argv))


@pytest.fixture
def world(tmp_path, monkeypatch, capsys, caplog):
    for var in ("TMUX", "SSH_CLIENT", "SSH_TTY", "CURSOR_AGENT", "GPG_TTY"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("XDG_RUNTIME_DIR", str(tmp_path / "run"))
    monkeypatch.setenv("XDG_STATE_HOME", str(tmp_path / "state"))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / "config"))
    socket = tmp_path / "S.gpg-agent.ssh"
    socket.touch()
    monkeypatch.setenv("SSH_AUTH_SOCK", str(socket))

    agent = FakeGpgAgent(ssh_socket=socket)
    monkeypatch.setattr(subprocess, "run", agent.run)
    clock = SimpleNamespace(now=1_800_000_000.0)
    monkeypatch.setattr(agentctl, "time", SimpleNamespace(
        time=lambda: clock.now, sleep=lambda _s: None))
    caplog.set_level("INFO")
    yield World(agent, clock, monkeypatch, capsys, caplog)
    assert agent.unexpected == [], f"agentctl ran unmodelled commands: {agent.unexpected}"


# --- Given ------------------------------------------------------------------

@given("my SSH key is held by gpg-agent")
def key_in_gpg_agent(world):
    assert world.agent.ssh_socket.exists()


@given(parsers.parse("the agent forgets SSH passphrases {hours:d} hours after they are entered"))
def cache_lifetime(world, hours):
    world.agent.max_cache_ttl_ssh = hours * HOUR


@given("the SSH key is locked")
def key_locked(world):
    world.agent.ssh_key_cached = False


@given("the SSH key is unlocked")
def key_unlocked(world):
    world.agent.ssh_key_cached = True


@given("the agent was last pointed at another terminal")
def agent_on_other_terminal(world):
    world.agent.startup_tty = OTHER_TTY


@given("the agent is configured to ignore terminal changes")
def agent_pinned(world):
    world.agent.ignores_tty_changes = True
    world.agent.startup_tty = None  # started by systemd, so pinned to no tty


@given(parsers.parse("I unlocked the SSH key through agentctl {hours:d} hours ago"))
def unlocked_hours_ago(world, hours):
    world.agent.ssh_key_cached = False
    world.from_my_terminal()
    now = world.clock.now
    world.clock.now = now - hours * HOUR
    world.agentctl("ssh", "ensure")
    assert world.exit_code == 0 and world.agent.ssh_key_cached
    world.clock.now = now
    world.agent.prompts.clear()


@given("agentctl has no record of when it was unlocked")
def no_unlock_record(world):
    pass  # a fresh XDG_STATE_HOME holds no record


# --- When -------------------------------------------------------------------

@when("I recover the SSH agent from my terminal")
def recover_from_my_terminal(world):
    world.from_my_terminal()
    world.agentctl("ssh", "recover")


@when("I check the SSH agent status")
def check_status(world):
    world.from_my_terminal()
    world.agentctl("ssh", "status")


@when("I ensure the SSH key is usable from my terminal")
def ensure_from_my_terminal(world):
    world.from_my_terminal()
    world.agentctl("ssh", "ensure")


@when("I ensure the SSH key is usable without a terminal")
def ensure_without_terminal(world):
    world.without_a_terminal()
    world.agentctl("ssh", "ensure")


# --- Then -------------------------------------------------------------------

@then("I am asked for the SSH passphrase on my terminal")
def asked_on_my_terminal(world):
    assert MY_TTY in world.agent.prompts, f"prompts went to {world.agent.prompts}"


@then("I am not asked for it on any other terminal")
def not_asked_elsewhere(world):
    assert set(world.agent.prompts) <= {MY_TTY}, f"prompts went to {world.agent.prompts}"


@then("I am not asked for the SSH passphrase")
def not_asked(world):
    assert world.agent.prompts == []


@then("the SSH key is unlocked")
def key_is_unlocked(world):
    assert world.agent.ssh_key_cached


@then("it succeeds")
def succeeds(world):
    assert world.exit_code == 0, world.output


@then("it fails")
def fails(world):
    assert world.exit_code != 0, world.output


@then("I am told the agent ignores terminal changes and how to fix it")
def told_agent_pinned(world):
    assert "ignores terminal changes" in world.output
    assert "keep-tty" in world.output


@then("I am told the SSH key is locked and needs a terminal to unlock")
def told_needs_terminal(world):
    assert "SSH key is locked" in world.output
    assert "terminal" in world.output


@then("the SSH key is reported as locked")
def reported_locked(world):
    assert "SSH key: locked" in world.output


@then("the SSH key is reported as unlocked")
def reported_unlocked(world):
    assert "SSH key: unlocked" in world.output


@then(parsers.parse("I am told the SSH passphrase will be needed again within {hours:d} hours"))
def told_expiry(world, hours):
    assert f"Passphrase needed again within: {hours}h" in world.output, world.output


@then("I am told the SSH passphrase expiry is unknown")
def told_expiry_unknown(world):
    assert "Passphrase needed again within: unknown" in world.output, world.output
