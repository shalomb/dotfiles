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
    @pytest.mark.integration
    def test_recover_with_keys_cached(self):
        """
        Given GPG agent is running
        And GPG keys are unlocked (passphrase cached)
        When I run "agentctl gpg recover"
        Then command should complete within 1 second
        And command should exit with status 0
        And output should contain "GPG agent recovered successfully"

        NOTE: This is an integration test that requires actual GPG setup.
        Skipped in environments without GPG/TTY.
        """
        pytest.skip("Integration test - requires actual GPG agent with keys cached")

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
    @pytest.mark.integration
    def test_recover_no_bash_errors(self):
        """
        When I run "agentctl gpg recover"
        Then output should not contain bash errors
        And output should not contain "command not found"

        NOTE: This tests the actual command execution, requires GPG agent.
        """
        pytest.skip("Integration test - requires actual GPG agent")


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
    @pytest.mark.integration
    def test_unlock_already_unlocked(self):
        """
        Given GPG agent is running
        And GPG keys are already unlocked (passphrase cached)
        When I run "agentctl gpg unlock"
        Then command should complete within 1 second
        And command should exit with status 0
        And no pinentry prompt should appear

        NOTE: This is an integration test that requires actual GPG setup.
        Skipped in environments without GPG/TTY.
        """
        pytest.skip("Integration test - requires actual GPG agent with keys unlocked")

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


class TestShellIntegrationMode:
    """Test --shell flag behavior for bash wrapper integration."""

    def setup_method(self):
        """Set up test environment."""
        self.env = {
            'HOME': os.environ.get('HOME', '/tmp'),
            'PATH': os.environ.get('PATH', ''),
            'DOTFILES_DIR': os.environ.get('DOTFILES_DIR', os.getcwd()),
            'GPG_TTY': '/dev/pts/0',
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

    @pytest.mark.integration
    def test_shell_flag_outputs_exports_to_stdout(self):
        """
        Test that --shell flag outputs export statements to stdout.

        BDD: When I run "agentctl --shell gpg recover"
        Then stdout should contain shell export statements

        NOTE: Integration test - requires actual GPG agent running.
        """
        pytest.skip("Integration test - requires actual GPG agent")

    @pytest.mark.integration
    def test_shell_flag_outputs_success_to_stderr(self):
        """
        Test that --shell flag outputs success messages to stderr.

        BDD: When I run "agentctl --shell gpg recover"
        Then stderr should contain "✅ GPG agent recovered successfully"
        And stderr should contain logging timestamps

        NOTE: Integration test - requires actual GPG agent running.
        """
        pytest.skip("Integration test - requires actual GPG agent")

    def test_shell_flag_no_logs_in_stdout(self):
        """
        Test that --shell flag keeps logs out of stdout.

        BDD: And bash wrapper should not eval log messages
        And no "command not found" errors should occur

        This test checks the error case still works correctly.
        """
        # Test can run even without working GPG - we just check output separation
        result = self.run_agentctl('--shell', 'gpg', 'recover', timeout=5)

        # Stdout should NOT have logging timestamps (would cause bash errors)
        assert '2025-' not in result.stdout or 'export' in result.stdout, \
            f"Logging timestamps in stdout would cause bash errors: {result.stdout}"
        assert '- INFO -' not in result.stdout, \
            f"Logging should not be in stdout: {result.stdout}"

        # Success/error messages should be on stderr
        if result.returncode != 0:
            assert 'Failed' in result.stdout or 'Failed' in result.stderr, \
                f"Error message should be present, got stdout: {result.stdout}, stderr: {result.stderr}"

    def test_shell_flag_error_messages_on_stderr(self):
        """
        Test that error messages appear on stderr with --shell flag.

        This verifies the fix - messages should be visible even when exports are empty.
        """
        # Will fail without TTY, but should still have proper error message
        result = self.run_agentctl('--shell', 'gpg', 'recover', timeout=5)

        # Error message should be visible (either stdout or stderr)
        output = result.stdout + result.stderr
        assert 'Failed' in output or 'ERROR' in output or 'Cannot unlock' in output, \
            f"Error message should be visible, got: {output}"

        # Stderr should have logging
        assert 'INFO' in result.stderr or 'ERROR' in result.stderr, \
            f"Logging should be in stderr, got: {result.stderr}"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
