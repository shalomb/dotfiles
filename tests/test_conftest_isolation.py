"""The shared test_env fixture must never kill the caller's tmux server."""
import subprocess


def _tmux(env, *args):
    return subprocess.run(["tmux", *args], env=env, capture_output=True, text=True)


def test_test_env_does_not_kill_callers_tmux_server(tmp_path, monkeypatch):
    # Private "live" server on its own socket dir, never the real one.
    monkeypatch.delenv("TMUX", raising=False)
    monkeypatch.setenv("TMUX_TMPDIR", str(tmp_path))
    env = dict(__import__("os").environ)
    assert _tmux(env, "new-session", "-d", "-s", "live").returncode == 0
    try:
        # Resolve the fixture now, as a test requesting test_env would.
        request_env = _resolve_test_env()
        assert _tmux(env, "has-session", "-t", "live").returncode == 0, \
            "test_env killed the caller's tmux server"
        assert request_env.get("TMUX_TMPDIR") != str(tmp_path)
    finally:
        _tmux(env, "kill-server")


def _resolve_test_env():
    import conftest
    gen = conftest.test_env.__wrapped__()
    env = next(gen) if hasattr(gen, "__next__") else gen
    return env
