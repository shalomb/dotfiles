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


def run_status(tmp_path, lines):
    """Run pi-attn-status against a fake tmux that lists the given pane lines."""
    fake = tmp_path / "tmux"
    fake.write_text("#!/usr/bin/env bash\nprintf '%s\\n' " + " ".join(f"'{l}'" for l in lines) + "\n")
    fake.chmod(0o755)
    env = {**os.environ, "PATH": f"{tmp_path}:{os.environ['PATH']}"}
    return subprocess.run([str(STATUS_BIN)], capture_output=True, text=True, env=env).stdout


def test_badge_colour_follows_reason(tmp_path):
    assert "#ff6633" in run_status(tmp_path, ["s|1|0|stopped: push needs approval"])
    assert "#3399cc" in run_status(tmp_path, ["s|1|0|rest stop: wave 2 done"])
    assert "#339933" in run_status(tmp_path, ["s|1|0|arrived: done-check green"])


def test_other_reasons_count_as_needing_you(tmp_path):
    assert "#ff6633" in run_status(tmp_path, ["s|1|0|changes ready"])


def test_most_urgent_pane_sets_colour_and_location(tmp_path):
    out = run_status(tmp_path, ["a|1|0|arrived: done", "b|2|1|stopped: gpg locked", "c|3|0|rest stop: wave 1"])
    assert "#ff6633" in out
    assert "[3]" in out
    assert "b:2.1" in out


def test_no_attention_is_silent(tmp_path):
    assert run_status(tmp_path, ["s|1|0|", "t|2|0|"]) == ""


def run_jump(tmp_path, lines):
    """Run pi-attn-jump with a fake tmux (logs calls) and a fake fzf (saves its input, picks the first line)."""
    log, shown = tmp_path / "tmux.log", tmp_path / "fzf.in"
    listing = " ".join(f"'{l}'" for l in lines)
    (tmp_path / "tmux").write_text(
        f"#!/usr/bin/env bash\necho \"$*\" >> {log}\n"
        f"[ \"$1\" = list-panes ] && printf '%s\\n' {listing}\nexit 0\n")
    (tmp_path / "fzf").write_text(f"#!/usr/bin/env bash\ntee {shown} | head -1\n")
    for f in ("tmux", "fzf"):
        (tmp_path / f).chmod(0o755)
    env = {**os.environ, "PATH": f"{tmp_path}:{os.environ['PATH']}"}
    subprocess.run([str(JUMP_BIN)], capture_output=True, text=True, env=env)
    return (log.read_text() if log.exists() else ""), (shown.read_text() if shown.exists() else "")


def test_jump_lists_most_urgent_first_with_reason(tmp_path):
    _, shown = run_jump(tmp_path, ["a|1|0|arrived: done", "b|2|1|stopped: gpg locked", "c|3|0|rest stop: wave 1"])
    rows = [r for r in shown.splitlines() if r.strip()]
    assert [r.split()[0] for r in rows] == ["b:2.1", "c:3.0", "a:1.0"]
    assert "stopped: gpg locked" in rows[0]


def test_jump_goes_to_the_picked_pane(tmp_path):
    log, _ = run_jump(tmp_path, ["a|1|0|arrived: done", "b|2|1|stopped: gpg locked"])
    assert "switch-client -t b" in log
    assert "select-pane -t b:2.1" in log


def test_jump_with_one_pane_skips_the_picker(tmp_path):
    log, shown = run_jump(tmp_path, ["a|1|0|arrived: done"])
    assert shown == ""
    assert "select-pane -t a:1.0" in log
