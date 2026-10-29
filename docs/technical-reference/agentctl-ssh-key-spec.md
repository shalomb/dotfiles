# agentctl SSH key availability

Executable acceptance criteria live in
`tests/features/agentctl-ssh-key.feature`. Unit rules that implement those
scenarios live in `tests/test_agentctl_ssh_key.py`. Both drive
`FakeGpgAgent` (`tests/support/fake_gpg_agent.py`).

## Commands

| Command | Behaviour |
|---------|-----------|
| `agentctl ssh status` | Reports `SSH key: locked\|unlocked` and passphrase expiry without prompting |
| `agentctl ssh recover` | Points gpg-agent at this terminal, then unlocks if needed |
| `agentctl ssh ensure` | No-op when unlocked; unlocks on this terminal when locked; fails fast without a tty |

## Rules

1. **Prompt only on my terminal.** ssh sign requests carry no tty; pinentry
   uses the agent's startup tty from `updatestartuptty`. Recover/ensure must
   point the agent *before* unlocking.
2. **Detect a pinned agent.** `keep-tty` / `keep-display` make the agent
   ignore tty updates. After `updatestartuptty`, confirm
   `getinfo std_startup_env` contains this `GPG_TTY`; otherwise refuse and
   tell the user to remove those options and restart the agent.
3. **Status never prompts.** Use `keyinfo --ssh-list` (cache flag), never a
   sign probe, to decide locked vs unlocked.
4. **Expiry is only known for agentctl unlocks.** The agent does not expose
   when a passphrase was cached. agentctl records `ssh-unlocked-at` under
   `$XDG_STATE_HOME/agents/` and compares against `max-cache-ttl-ssh`.

## Configuration

Do **not** set `keep-tty` or `keep-display` in `~/.gnupg/gpg-agent.conf`.
They do not keep the agent alive; systemd does. They freeze pinentry on the
agent's initial (often empty) tty, so ssh falls back to a password prompt.

## Keep-alive

`agentctl-integration.sh` wraps `ssh`, `scp`, and `sftp` so that, when
`GPG_TTY` is a real terminal, they run `agentctl ssh ensure` first. If ensure
fails (locked key and cancelled pinentry, or a pinned agent), the connection
is aborted instead of falling back to a password prompt.

Manual / prompt use:

```bash
agentctl ssh ensure
```
