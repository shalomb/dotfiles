# Agent Registry - Technical Specification

Status: **Draft v1** (see [ADR-013](../architecture/ADR-013-shared-agent-registry.md) for the decision and rationale)

## Overview

A well-known directory in which every running AI coding agent on this machine publishes a
small JSON record about itself, so that other tools - `/tmux`, dispatch scripts, A2A
clients, other harnesses - can find agents without a broker, a network, or shared code.

The contract is **a file format and a few rules**, not a library. Any language that can
read JSON can be a reader; any process running as the user can be a writer.

Not to be confused with `$XDG_RUNTIME_DIR/agents/`, which belongs to `agentctl`
([ADR-012](../architecture/ADR-012-unified-agent-management-agentctl.md)) and holds
SSH/GPG *credential* agents.

## Terminology

| Term | Meaning |
| --- | --- |
| Agent | A running AI coding agent process (e.g. one `pi`), identified by a session id |
| Record | The JSON file one agent publishes about itself |
| Writer | Anything that creates, updates or removes **its own** record |
| Detector | A process that writes `detected` records for agents that cannot register themselves |
| Reader | Anything that lists or looks up records |
| Endpoint | A way to talk to the agent: `{protocol, url}` |

## Location

```
<registry>/v1/<sessionId>.json        the record
<registry>/v1/<sessionId>.token       optional bearer token for the agent's endpoint
```

`<registry>` resolves, in order:

1. `$AGENT_REGISTRY_DIR`, if set and absolute (tests, containers)
2. `$XDG_RUNTIME_DIR/agent-registry`
3. `/tmp/agent-registry-$UID` (fallback when no runtime dir exists)

Rules for the directory:

- Created with mode `0700`. A reader or writer that finds it owned by another user, or
  with group/other permission bits, **must refuse to use it**.
- The `v1/` segment is the schema major version. A breaking change creates `v2/` and
  leaves `v1/` alone, so old and new tools coexist.
- `$XDG_RUNTIME_DIR` is a tmpfs cleared at logout/reboot, so records never outlive a boot.
  The `/tmp` fallback does not give that guarantee; liveness checks (below) cover it.

## Record

One JSON object. File name is `<sessionId>.json`; `sessionId` in the body must match it.

```json
{
  "schema": 1,
  "sessionId": "01a157b4-2c7b-7529-a493-74fa2b9f120d",
  "name": "unop",
  "harness": "pi",
  "source": "reported",
  "interactive": true,
  "pid": 2836773,
  "processStart": "11992040@90411d08-df0d-4c7f-9183-9d15e00534c1",
  "cwd": "/home/unop",
  "tmux": { "socket": "/tmp/tmux-1001/default", "serverPid": 64523, "pane": "%17" },
  "transcript": "/home/unop/.pi/agent/sessions/--home-unop--/2026-10-20T05-06-28-092Z_01a157b4-2c7b-7529-a493-74fa2b9f120d.jsonl",
  "state": "idle",
  "stateChangedAt": "2026-10-20T05:07:10.400Z",
  "startedAt": "2026-10-20T05:06:32.092Z",
  "updatedAt": "2026-10-20T05:07:10.400Z",
  "endpoints": [
    { "protocol": "a2a", "url": "http://127.0.0.1:39349", "auth": "bearer" }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `schema` | yes | Integer, `1` |
| `sessionId` | yes | Matches `[A-Za-z0-9_-]{1,128}`; same as the file name |
| `harness` | yes | Free string: `pi`, `claude-code`, `gemini-cli`, ... |
| `pid` | yes | OS process id of the agent |
| `processStart` | yes | `<starttime ticks>@<boot id>`; see Liveness |
| `cwd` | yes | Absolute working directory |
| `name` | no | Human label |
| `source` | no | `reported` (default: the agent wrote it) or `detected` (a detector wrote it); see Detected records |
| `interactive` | no | Boolean, default `true`. `false` for print-mode runs, subagents and background children; see Short-lived agents |
| `parentPid` | no | Pid of the process that spawned this agent, for children |
| `tmux` | no | `{socket, serverPid, pane}`; all three present or the field is ignored; see Pane identity |
| `transcript` | no | Absolute path of the agent's session transcript, to link records to history tools |
| `state` | no | `working`, `idle`, `waiting-input` or `unknown`; see State |
| `stateChangedAt`, `startedAt`, `updatedAt` | no | ISO 8601 UTC |
| `endpoints` | no | List of `{protocol, url, auth?}`; empty or absent means "listed but not callable" |

Readers **must ignore unknown fields** and writers **must preserve** unknown fields they
did not write when rewriting a record. New optional fields are additive within `v1`.

### Pane identity

`$TMUX_PANE` (`%17`) is unique only inside one tmux server; numbering restarts at `%0` on a
new server, so a bare pane id can match the wrong pane after a tmux restart. The identity is
the triple:

- `socket` and `serverPid` are the first two comma-separated parts of `$TMUX`
  (`/tmp/tmux-1001/default,64523,0`)
- `pane` is `$TMUX_PANE`

`window.pane` indexes are **not** recorded: they shift when windows close or panes move.
Readers resolve the triple live (`tmux -S <socket> display -p -t <pane> ...`) and treat the
record as not matching if the server's current pid differs from `serverPid`.

### State

`state` is the agent's last *reported* activity:

| Value | Meaning | A2A equivalent |
| --- | --- | --- |
| `working` | A run is in progress | `working` |
| `idle` | Waiting for a prompt | no active task |
| `waiting-input` | A run is blocked on a human (a question or permission dialog) | `input-required` |
| `unknown` | Not reported, or a value the reader does not recognise | - |

Absent `state` means `unknown`; readers map any unrecognised value to `unknown`. A writer
sets `stateChangedAt` and `updatedAt` on every change, so no periodic heartbeat is needed.
`state` is a hint: an agent that hangs keeps its last reported state. Liveness is decided by
pid and start identity, never by `updatedAt`.

Intended mapping for pi (not yet verified against its event shapes): `agent_start` to
`working`, `agent_end`/`agent_settled` to `idle`, an open `ask_user_question` to
`waiting-input`.

### Endpoints

- `url` must be a loopback address (`127.0.0.0/8`, `::1`) on the same machine. Readers
  **must not follow** any other host.
- `auth: "bearer"` means the token is in `<sessionId>.token` (mode `0600`). The token is
  **never** placed in the record.
- `protocol` is open-ended. Defined so far: `a2a` (JSON-RPC over HTTP, agent card at
  `<url>/.well-known/agent-card.json`).
- `detected` records never carry endpoints.

### Short-lived agents

Print-mode runs (`pi -p`), subagents and background children would otherwise make the
directory churn.

- A writer for such a process **should not register**. If it does, it sets
  `interactive: false` and, for a child, `parentPid`.
- Readers that list agents for a human **should hide** `interactive: false` records by
  default and offer a way to show them.

### Detected records

Some harnesses (Copilot CLI, Gemini) have no hook that runs a registering extension. A
detector may write a record on their behalf, found by walking the process tree up to a tmux
`pane_pid`:

- `source` is `"detected"`; `sessionId` is `det-<harness>-<pid>-<starttime ticks>` (no
  separators outside `[A-Za-z0-9_-]`).
- It carries only presence data: `harness`, `pid`, `processStart`, `cwd`, `tmux`. **No**
  `endpoints`, no token, no `transcript` guess.
- A detector removes its record when the process is gone and **never** touches a
  `reported` record or any `.token`.
- Readers de-duplicate by `(pid, processStart)` and prefer the `reported` record.

## Writer rules

1. Write only your own `<sessionId>.*` files (a detector writes only its own `det-*`
   records).
2. Write atomically: temp file in the same directory, `fsync` optional, then `rename`.
3. Files are mode `0600`.
4. Publish on session start. **Rewrite the record** whenever the session id changes in the
   same process (`/new`, `/resume`, fork): remove the old record, write the new one.
5. Update `state`, `updatedAt` and `endpoints` when they change; never rewrite
   `pid`/`processStart`.
6. Remove both files on orderly shutdown. Crashes are handled by readers (below).
7. Keep records under 8 KiB.

## Reader rules

1. Ignore names that do not match `<sessionId>.json`; ignore `*.tmp`.
2. Refuse files larger than 64 KiB; refuse non-regular files (symlinks, sockets).
3. A record that fails to parse, or whose `sessionId` differs from its file name, is skipped.
4. Apply the liveness check; a dead record is **stale**.
5. De-duplicate by `(pid, processStart)`, preferring `source: "reported"`.
6. Readers **may** delete stale records, since the owner is gone. They must not delete
   live records or any `.token` whose record is live.
7. Treat records as **hints**. Re-resolve anything security-relevant (the pane still
   exists, the endpoint still answers) before acting on it.

## Liveness

A record is live only if both hold:

1. Process `pid` exists.
2. Its start identity equals `processStart`.

`processStart` is `<starttime>@<bootId>` (the format `pi-lens` already records in its
`instances.json`):

- Linux: `starttime` is field 22 of `/proc/<pid>/stat` (clock ticks since boot), `bootId`
  is `/proc/sys/kernel/random/boot_id`. Parse after the **last** `)` in the line, because
  the command name can contain spaces and parentheses.
- Other platforms: use the closest stable equivalent and a distinct prefix; readers that
  cannot compute it must treat a matching `pid` alone as *unverified*, not live. (macOS
  has not been verified for this spec.)

The start identity is why pid alone is not enough: pids are reused. Wall-clock times are
not used, as clocks on VMs drift (observed ~10 minutes on this machine).

## Security considerations

- **Trust boundary:** any process running as the same user can write a record. The `0700`
  directory excludes other users, nothing more. Records are hints, not credentials.
- **Tokens** are separate `0600` files. Possession of the token, not appearance in the
  registry, authorises calls to an endpoint.
- **Loopback only** for endpoints, so a forged record cannot redirect a client to a remote
  host.
- **Detected records** are lower trust: they never carry endpoints, so they can never
  direct a client anywhere.
- **Resource limits** (record size, file count scanned) bound a hostile or buggy writer.

## Conformance tests

A conforming implementation passes at least these cases (the reference module ships them):

| # | Case | Expectation |
| --- | --- | --- |
| 1 | Location precedence | `AGENT_REGISTRY_DIR` > `XDG_RUNTIME_DIR` > `/tmp` fallback; relative paths ignored |
| 2 | Directory safety | Created `0700`; wrong owner or loose mode is refused |
| 3 | Round trip | write then read returns an equal record, unknown fields preserved |
| 4 | Atomicity | no `.tmp` left behind; a concurrent reader never sees partial JSON |
| 5 | Name/body mismatch | record skipped |
| 6 | Oversize / non-regular file | skipped |
| 7 | Live process | listed as live |
| 8 | Dead pid | stale |
| 9 | Reused pid (same pid, different `processStart`) | stale |
| 10 | Session change | old record removed, new one written |
| 11 | Non-loopback endpoint | not offered to callers |
| 12 | Token never in record | enforced at write time |
| 13 | Prune | removes stale records and their tokens only |
| 14 | Pane identity | `tmux` with a missing part is ignored; same `pane` on a different `serverPid` does not match |
| 15 | State values | absent or unrecognised `state` reads as `unknown` |
| 16 | Non-interactive filter | `interactive: false` hidden by default, shown on request |
| 17 | Detected limits | a `detected` record's endpoints are ignored; its id must match `det-<harness>-<pid>-<ticks>` |
| 18 | De-duplication | `reported` and `detected` for the same `(pid, processStart)` list once, as `reported` |
| 19 | Detector scope | a detector's prune never removes a `reported` record or a `.token` |

## Open questions

- macOS/BSD `processStart` equivalent (unverified).
- Whether `session_start` and `session_shutdown` fire in pi's print mode, and what happens
  to the record when the terminal disappears (both untested).
- The exact pi event shapes behind the `state` mapping above.
- Multi-user machines: one registry per user is assumed; cross-user discovery is out of scope.
- Windows is out of scope.
