"""Guard: suites that drive agentctl must never touch the user's live agent.

Running them with the real HOME ran `gpg-connect-agent killagent` against the
developer's gpg-agent, wiping cached passphrases and re-locking signing keys.
"""
import os
from pathlib import Path

import conftest


def test_destructive_suites_are_registered():
    for suite in ("test_agentctl_gpg_recovery", "test_agent_management"):
        assert suite in conftest.AGENT_ISOLATED_SUITES


class TestSetupMethodSeesSandbox:
    """Registered here so it exercises the real ordering: xunit setup_method
    must already see the sandbox, as the destructive suites read HOME there."""

    def setup_method(self):
        self.home_seen_by_setup = os.environ.get("HOME")
        self.gnupg_seen_by_setup = os.environ.get("GNUPGHOME")

    def test_setup_method_runs_inside_sandbox(self, real_home):
        home = self.home_seen_by_setup or ""
        gnupg = self.gnupg_seen_by_setup or ""
        assert home != real_home
        assert "agt-" in home
        assert "agt-" in gnupg


def test_isolated_env_points_every_agent_path_at_a_sandbox(isolated_agent_env):
    real_home = Path(isolated_agent_env["real_home"])
    for var in ("HOME", "GNUPGHOME", "XDG_RUNTIME_DIR", "XDG_STATE_HOME", "XDG_CONFIG_HOME"):
        path = Path(os.environ[var])
        assert real_home not in path.parents and path != real_home, f"{var}={path}"
    assert "SSH_AUTH_SOCK" not in os.environ
