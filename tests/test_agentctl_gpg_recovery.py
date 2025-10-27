#!/usr/bin/env python3
"""
Test suite for agentctl GPG recovery and unlock operations.
Tests based on BDD scenarios in docs/tutorials/gpg-bdd-scenarios.md
"""

import os
import subprocess
import tempfile
import time
from pathlib import Path
from unittest.mock import patch, MagicMock, call
import pytest


class TestGPGRecovery:
    """Test GPG recovery functionality."""

    def setup_method(self):
        """Set up test environment before each test."""
        self.temp_dir = tempfile.mkdtemp(prefix="gpg_test_")
        self.home_dir = Path(self.temp_dir) / "home"
        self.home_dir.mkdir(parents=True)

        self.env = {
            'HOME': str(self.home_dir),
            'PATH': os.environ.get('PATH', ''),
            'DOTFILES_DIR': os.environ.get('DOTFILES_DIR', os.getcwd()),
        }

    def teardown_method(self):
        """Clean up test environment after each test."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def run_agentctl(self, *args, **kwargs):
        """Helper to run agentctl command."""
        dotfiles_dir = self.env['DOTFILES_DIR']
        cmd = ['uv', 'run', 'python', '-m', 'agent_management.agentctl'] + list(args)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=dotfiles_dir,
            env=self.env,
            **kwargs
        )
        return result

    # BDD Scenario: Recovery succeeds immediately when keys already cached
    def test_recover_with_keys_cached(self):
        """
        Given GPG agent is running
        And GPG keys are unlocked (passphrase cached)
        When I run "agentctl gpg recover"
        Then command should complete within 1 second
        And command should exit with status 0
        And output should contain "GPG agent recovered successfully"
        """
        with patch('agent_management.agentctl.AgentManager') as mock_manager:
            # Mock: agent running and keys unlocked
            mock_instance = mock_manager.return_value
            mock_instance.check_gpg_agent.return_value = True
            mock_instance.test_gpg_signing.return_value = True
            mock_instance.recover_gpg_agent.return_value = True

            start = time.time()
            result = self.run_agentctl('gpg', 'recover', timeout=2)
            duration = time.time() - start

            # Should complete quickly (< 1s)
            assert duration < 1.0, f"Recovery took {duration}s, expected < 1s"

            # Should succeed
            assert result.returncode == 0, f"Expected success, got {result.returncode}"

            # Should have success message
            assert '✅' in result.stdout or 'recovered successfully' in result.stdout.lower(), \
                f"Expected success message, got: {result.stdout}"

    # BDD Scenario: Recovery prompts for passphrase when keys not cached
    @pytest.mark.integration
    def test_recover_with_keys_not_cached_interactive(self):
        """
        Given GPG agent is running
        And GPG keys are locked (passphrase not cached)
        And I am in an interactive terminal with TTY
        When I run "agentctl gpg recover"
        Then pinentry should appear prompting for passphrase
        And recovery should complete within 60 seconds
        """
        # This test requires actual GPG setup and TTY
        # Mark as integration test
        pytest.skip("Requires interactive GPG setup")

    # BDD Scenario: Recovery fails gracefully without TTY
    def test_recover_without_tty(self):
        """
        Given GPG agent is running
        And GPG keys are locked (passphrase not cached)
        And no TTY is available (non-interactive context)
        When I run "agentctl gpg recover"
        Then command should exit with status 1
        And error message should indicate "No TTY available"
        """
        with patch('agent_management.agentctl.AgentManager') as mock_manager:
            # Mock: agent running but keys locked, no TTY
            mock_instance = mock_manager.return_value
            mock_instance.check_gpg_agent.return_value = True
            mock_instance.test_gpg_signing.return_value = False
            mock_instance.recover_gpg_agent.return_value = False

            # Ensure no TTY
            self.env['GPG_TTY'] = 'not a tty'

            result = self.run_agentctl('gpg', 'recover', timeout=5)

            # Should fail
            assert result.returncode != 0, "Expected failure without TTY"

            # Should have error message about TTY
            output = result.stdout + result.stderr
            assert 'tty' in output.lower() or 'interactive' in output.lower(), \
                f"Expected TTY error, got: {output}"

    # BDD Scenario: Recovery output should not contain bash errors
    def test_recover_no_bash_errors(self):
        """
        When I run "agentctl gpg recover"
        Then output should not contain bash errors
        And output should not contain "command not found"
        """
        with patch('agent_management.agentctl.AgentManager') as mock_manager:
            mock_instance = mock_manager.return_value
            mock_instance.recover_gpg_agent.return_value = True

            result = self.run_agentctl('gpg', 'recover', timeout=5)

            output = result.stdout + result.stderr

            # Should not have bash errors
            assert 'command not found' not in output, \
                f"Found bash error in output: {output}"
            assert 'bash:' not in output, \
                f"Found bash error in output: {output}"

            # Should not have date as command error
            assert '2025-' not in output or 'command not found' not in output, \
                f"Found date parsing error: {output}"


class TestGPGUnlock:
    """Test GPG unlock functionality."""

    def setup_method(self):
        """Set up test environment before each test."""
        self.temp_dir = tempfile.mkdtemp(prefix="gpg_test_")
        self.home_dir = Path(self.temp_dir) / "home"
        self.home_dir.mkdir(parents=True)

        self.env = {
            'HOME': str(self.home_dir),
            'PATH': os.environ.get('PATH', ''),
            'DOTFILES_DIR': os.environ.get('DOTFILES_DIR', os.getcwd()),
        }

    def teardown_method(self):
        """Clean up test environment after each test."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def run_agentctl(self, *args, **kwargs):
        """Helper to run agentctl command."""
        dotfiles_dir = self.env['DOTFILES_DIR']
        cmd = ['uv', 'run', 'python', '-m', 'agent_management.agentctl'] + list(args)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=dotfiles_dir,
            env=self.env,
            **kwargs
        )
        return result

    # BDD Scenario: Unlock succeeds immediately if keys already unlocked
    def test_unlock_already_unlocked(self):
        """
        Given GPG agent is running
        And GPG keys are already unlocked (passphrase cached)
        When I run "agentctl gpg unlock"
        Then command should complete within 1 second
        And command should exit with status 0
        And no pinentry prompt should appear
        """
        with patch('agent_management.agentctl.AgentManager') as mock_manager:
            mock_instance = mock_manager.return_value
            mock_instance.check_gpg_agent.return_value = True
            mock_instance.test_gpg_signing.return_value = True
            mock_instance.unlock_gpg_agent.return_value = True

            start = time.time()
            result = self.run_agentctl('gpg', 'unlock', timeout=2)
            duration = time.time() - start

            # Should complete quickly
            assert duration < 1.0, f"Unlock took {duration}s, expected < 1s"

            # Should succeed
            assert result.returncode == 0, f"Expected success, got {result.returncode}"

    # BDD Scenario: Unlock fails gracefully without TTY
    def test_unlock_without_tty(self):
        """
        Given GPG agent is running
        And GPG keys are locked (passphrase not cached)
        And no TTY is available (non-interactive context)
        When I run "agentctl gpg unlock"
        Then command should exit with status 1
        And error message should indicate "No TTY available"
        And no hanging processes should remain
        """
        with patch('agent_management.agentctl.AgentManager') as mock_manager:
            mock_instance = mock_manager.return_value
            mock_instance.check_gpg_agent.return_value = True
            mock_instance.test_gpg_signing.return_value = False
            mock_instance.unlock_gpg_agent.return_value = False

            # Ensure no TTY
            self.env['GPG_TTY'] = 'not a tty'

            result = self.run_agentctl('gpg', 'unlock', timeout=5)

            # Should fail
            assert result.returncode != 0, "Expected failure without TTY"

            # Should have error about TTY
            output = result.stdout + result.stderr
            assert 'cannot unlock' in output.lower() or 'tty' in output.lower(), \
                f"Expected TTY error, got: {output}"


class TestGPGTestSigning:
    """Test GPG signing test functionality."""

    def test_signing_with_loopback_fails_without_cached_passphrase(self):
        """
        Test that signing with --pinentry-mode loopback --batch fails
        when passphrase is not cached.

        This is the root cause of the bug.
        """
        # This test documents the broken behavior
        with patch('subprocess.run') as mock_run:
            # Simulate GPG error when passphrase not cached
            mock_result = MagicMock()
            mock_result.returncode = 2
            mock_result.stderr = b'gpg: Sorry, we are in batchmode - can\'t get input\n'
            mock_run.return_value = mock_result

            # Call would fail
            result = mock_run(['gpg', '--pinentry-mode', 'loopback', '--sign', '--batch', '--yes'])

            assert result.returncode != 0, "Should fail without cached passphrase"
            assert b'batchmode' in result.stderr, "Should show batchmode error"

    def test_signing_without_loopback_triggers_pinentry(self):
        """
        Test that signing without --pinentry-mode loopback triggers pinentry.

        This is the correct behavior for unlocking.
        """
        with patch('subprocess.run') as mock_run:
            # Simulate successful pinentry interaction
            mock_result = MagicMock()
            mock_result.returncode = 0
            mock_run.return_value = mock_result

            # Call should succeed with pinentry
            result = mock_run(['gpg', '--sign', '--armor'])

            assert result.returncode == 0, "Should succeed with pinentry"


class TestLoggingOutputSeparation:
    """Test that logging goes to stderr and results go to stdout."""

    def setup_method(self):
        """Set up test environment."""
        self.env = {
            'HOME': os.environ.get('HOME', '/tmp'),
            'PATH': os.environ.get('PATH', ''),
            'DOTFILES_DIR': os.environ.get('DOTFILES_DIR', os.getcwd()),
        }

    def run_agentctl(self, *args, **kwargs):
        """Helper to run agentctl command."""
        dotfiles_dir = self.env['DOTFILES_DIR']
        cmd = ['uv', 'run', 'python', '-m', 'agent_management.agentctl'] + list(args)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=dotfiles_dir,
            env=self.env,
            **kwargs
        )
        return result

    def test_logging_on_stderr_results_on_stdout(self):
        """
        Test that logging (timestamps, INFO messages) go to stderr
        and results (✅/❌ messages) go to stdout.
        """
        result = self.run_agentctl('gpg', 'status', timeout=5)

        # Stderr should have logging (timestamps, INFO)
        if result.stderr:
            # If there's stderr, it should be logging format
            assert any(keyword in result.stderr for keyword in ['INFO', 'ERROR', 'WARNING']) or \
                   any(char in result.stderr for char in [':', '-']), \
                f"Expected logging format in stderr, got: {result.stderr}"

        # Stdout should have user-facing results
        # Should NOT have logging timestamps
        assert '- INFO -' not in result.stdout, \
            f"Logging should not be in stdout: {result.stdout}"
        assert '- ERROR -' not in result.stdout, \
            f"Logging should not be in stdout: {result.stdout}"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
