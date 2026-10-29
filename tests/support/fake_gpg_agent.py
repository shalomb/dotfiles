"""A stand-in for gpg-agent at the subprocess boundary agentctl talks through.

Models the behaviour observed on gpg-agent 2.4 with enable-ssh-support:

- ssh sign requests carry no tty, so pinentry prompts on the agent's
  *startup* tty (set by `updatestartuptty`), never the caller's;
- with keep-tty the agent answers OK to `updatestartuptty` but ignores it;
- `keyinfo --ssh-list` reveals whether a key's passphrase is cached
  without prompting (field 7 is "1" when cached).

Both the BDD steps and the unit tests drive agentctl against this one model,
so they describe the same agent.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Set
from unittest.mock import MagicMock

KEYGRIP = "E92628708E7C4F9C7ADF2A8A681D179653933252"
FPR = "SHA256:96MzusPptbQK3ziiZE4y+GYcYFwkeyub1m/iAAcIl1g"
PUBKEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFakeKeyForTests egn8687@vm"


def _proc(rc: int, out: str = "", err: str = ""):
    return MagicMock(returncode=rc, stdout=out.encode(), stderr=err.encode())


@dataclass
class FakeGpgAgent:
    ssh_socket: Path
    ssh_key_cached: bool = False
    startup_tty: Optional[str] = None
    ignores_tty_changes: bool = False
    max_cache_ttl_ssh: int = 86400
    # Terminals where someone will type the passphrase when asked.
    attended: Set[str] = field(default_factory=set)
    # Every terminal a passphrase prompt appeared on, in order.
    prompts: List[str] = field(default_factory=list)
    unexpected: List[list] = field(default_factory=list)

    def run(self, cmd, *args, env=None, **kwargs):
        prog, rest = cmd[0], list(cmd[1:])
        handler = {
            "gpgconf": self._gpgconf,
            "gpg-connect-agent": self._connect_agent,
            "ssh-add": self._ssh_add,
            "ssh-keygen": self._ssh_keygen,
            "gpg": lambda _rest, _env: _proc(0, "signed"),
            "pgrep": lambda _rest, _env: _proc(0, "4242\n"),
            "kill": lambda _rest, _env: _proc(0),
            "kill": lambda _rest, _env: _proc(0),
        }.get(prog)
        if handler is None:
            self.unexpected.append(list(cmd))
            return _proc(1, err=f"fake: unexpected command {cmd!r}")
        return handler(rest, env)

    # --- programs -----------------------------------------------------------

    def _gpgconf(self, rest, _env):
        if rest[:2] == ["--list-dirs", "agent-ssh-socket"]:
            return _proc(0, f"{self.ssh_socket}\n")
        if rest[:2] == ["--list-dirs", "agent-socket"]:
            return _proc(0, f"{self.ssh_socket.parent / 'S.gpg-agent'}\n")
        if rest[:2] == ["--list-options", "gpg-agent"]:
            ttl = self.max_cache_ttl_ssh
            return _proc(0, "\n".join([
                "default-cache-ttl-ssh:24:1:expire SSH keys after N seconds:3:3:N:1800::86400",
                f"max-cache-ttl-ssh:24:2:set maximum SSH key lifetime to N seconds:3:3:N:7200::{ttl}",
            ]) + "\n")
        return _proc(0)

    def _connect_agent(self, rest, env):
        caller_tty = (env if env is not None else os.environ).get("GPG_TTY")
        out = []
        for command in rest:
            word = command.split()[0].lower() if command.split() else ""
            if word == "/bye":
                break
            if command.lower().startswith("option ttyname="):
                caller_tty = command.split("=", 1)[1]
                out.append("OK")
            elif word == "updatestartuptty":
                if not self.ignores_tty_changes and caller_tty and caller_tty != "not a tty":
                    self.startup_tty = caller_tty
                out.append("OK")
            elif command.lower().startswith("getinfo std_startup_env"):
                if self.startup_tty:
                    out.append(f"D GPG_TTY={self.startup_tty} ")
                out.append("OK")
            elif word == "keyinfo":
                cached = "1" if self.ssh_key_cached else "-"
                out.append(f"S KEYINFO {KEYGRIP} D - - {cached} P {FPR} - S")
                out.append("OK")
            elif command.lower().startswith("getinfo pid"):
                out.extend(["D 4242", "OK"])
            else:
                out.append("OK")
        return _proc(0, "\n".join(out) + "\n")

    def _ssh_add(self, rest, _env):
        if rest[:1] == ["-L"]:
            return _proc(0, PUBKEY + "\n")
        if rest[:1] == ["-l"]:
            return _proc(0, f"256 {FPR} egn8687@vm (ED25519)\n")
        return _proc(0)

    def _ssh_keygen(self, rest, _env):
        if rest[:2] != ["-Y", "sign"]:
            return _proc(0)
        return _proc(0) if self._sign_with_ssh_key() else _proc(
            255, err="agent refused operation")

    def _sign_with_ssh_key(self) -> bool:
        if self.ssh_key_cached:
            return True
        if not self.startup_tty:
            return False  # pinentry has no terminal: cancelled at once
        self.prompts.append(self.startup_tty)
        if self.startup_tty in self.attended:
            self.ssh_key_cached = True
            return True
        return False

    # --- what tests observe -------------------------------------------------

    def forget_passphrase(self):
        self.ssh_key_cached = False
