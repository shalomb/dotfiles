"""Executable spec: tests/features/agentctl-ssh-key.feature."""

from pytest_bdd import scenarios

from step_definitions.agentctl_ssh_steps import *  # noqa: F401,F403

scenarios("features/agentctl-ssh-key.feature")
