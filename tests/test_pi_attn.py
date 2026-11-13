"""Tests for pi-attn-status and pi-attn-jump."""
import os
import subprocess
from pathlib import Path

HERE = Path(__file__).parent.parent
STATUS_BIN = HERE / ".local/bin/pi-attn-status"
JUMP_BIN = HERE / ".local/bin/pi-attn-jump"


def test_pi_attn_status_executable():
    assert os.access(STATUS_BIN, os.X_OK)


def test_pi_attn_jump_executable():
    assert os.access(JUMP_BIN, os.X_OK)


def test_pi_attn_status_silent_without_panes():
    res = subprocess.run([str(STATUS_BIN)], capture_output=True, text=True)
    assert res.returncode == 0
