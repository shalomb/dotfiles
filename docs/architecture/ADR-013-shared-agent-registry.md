# ADR-013: Shared Agent Registry

## Status
Proposed

## Context

### Problem Statement

Several things on this machine need to find and talk to running AI coding agents (`pi`
sessions, and potentially other harnesses) and today cannot do so reliably:

1. **`/tmux` and `tmux-dispatch.sh`** drive another agent by scraping its pane. They cannot
   tell *busy* from *blocked on a human*, cannot wait for completion except by polling the
   screen, and map panes to agents only by guesswork.
2. **No pane-to-session mapping.** A pi process does not hold its session file open, and its
   own environment carries no session id (`PI_SESSION_ID` exists only in tool
   subprocesses). The only derivation is indirect: the session id is a UUIDv7 minted about
   four seconds before the process start time.
3. **Agent-to-agent protocols** (A2A and similar) assume you already know the peer's
   address; nothing here records one.
4. **Every plugin would invent its own list.** `pi-lens` keeps `instances.json`, `pi-mobile`
   keeps `machine.json`, `remote-pi` keeps a socket per session room.

### Alternatives evaluated

| Option | Verdict |
| --- | --- |
| **Broker with leader election** (`remote-pi`) | Heavy (17k lines, native keyring, optional public relay); failure modes of its own; waits only for delivery ACK, no completion state |
| **mDNS on the LAN** (`pi-a2a`) | Binds `0.0.0.0` over plain HTTP, shared secret in plaintext inside each repo, injects remote text into the agent as a prompt; wrong exposure for a single-user machine |
| **One shared registry file** (`pi-lens` style) | Write races between plugins; one corrupt writer breaks all readers |
| **SQLite database** (`~/.pi/ideas.md` proposal: `~/.local/state/agent-sessions/`) | Needs a driver decision inside pi's runtime, a synchronous write in `session_shutdown`, and a CLI to own the schema; records survive reboots and need reaping; not readable with `jq`; no endpoint or token model. Its field list is adopted below. |
| **Scrape the pane** (status quo) | No completion or blocked-on-human signal; theme-dependent |
| **Well-known directory, one file per agent** | Chosen |

### Constraints discovered

- `$XDG_RUNTIME_DIR` exists and is a `0700` tmpfs (`/run/user/1001`); ADR-012 already
  adopts the XDG runtime/state/config split.
- `$XDG_RUNTIME_DIR/agents/` is **already used by `agentctl`** for SSH/GPG credential agents,
  so the name cannot be reused for AI agents.
- `pi-lens` already records process identity as `<starttime>@<boot-id>`, which matches
  `/proc/<pid>/stat` field 22 and `boot_id` exactly (verified), and does not depend on the
  VM's wall clock (which drifts here).

## Decision

Supersedes the registry section of `~/.pi/ideas.md` (ideation notes, not an ADR).

**Publish agents in a well-known directory, one JSON file per agent, governed by a
file-format spec rather than a library.** The spec is
[`agent-registry-spec.md`](../technical-reference/agent-registry-spec.md).

### Key design decisions

#### Decision 1: Decentralised, no broker

Each agent writes only its own record; readers list the directory. There is no server to
elect, fail over, or crash. This follows the `tmux-targets` layout already in use.

#### Decision 2: `$XDG_RUNTIME_DIR/agent-registry/v1/`

**Choice**: a live-state directory on tmpfs, vendor-neutral name, versioned.

**Rationale**:
- Live state belongs in the runtime tier of ADR-012; it clears at logout/reboot, removing
  the main weakness of file registries (records that outlive a boot).
- `agent-registry` does not collide with `agentctl`'s `agents/` and does not say "pi", so
  other harnesses (`claude-code`, `gemini-cli`) can register and read.
- `v1/` lets a breaking schema change coexist with old tools.
- Fallback `/tmp/agent-registry-$UID` (`0700`) where no runtime dir exists.

#### Decision 3: A format contract, not a library

Plugins depend on a documented file format and a conformance list. A reader needs only
`jq -s . "$XDG_RUNTIME_DIR"/agent-registry/v1/*.json`. The reference module (pure
functions: write, list, liveness, prune) is one implementation, not the contract.

#### Decision 4: Liveness = pid + process-start identity

pid alone is unsafe because pids are reused. `processStart` is
`<starttime ticks>@<boot id>`. Wall-clock time is not used. Crashed agents therefore show up
as stale, and any reader may prune them.

#### Decision 5: Endpoints are loopback-only; tokens live beside, never inside, the record

A record may list `endpoints: [{protocol, url, auth}]`. Readers follow only loopback URLs.
Bearer tokens are separate `0600` files. A forged record can therefore not redirect a client
off-machine, and reading the registry does not grant the ability to call an agent.

#### Decision 6: Records are hints

The trust boundary is "same user". Readers re-resolve anything security-relevant (does the
pane still exist, does the endpoint still answer) before acting.

#### Decision 7: Pane identity is a triple

**Choice**: `tmux: {socket, serverPid, pane}`, not a bare `$TMUX_PANE`.

**Rationale**: `%17` is unique only within one tmux server and numbering restarts at `%0`
on a new server, so a stale or bare id can match the wrong pane after a tmux restart. The
socket and server pid come from `$TMUX` (`<socket>,<serverPid>,<idx>`, confirmed on this
machine). `window.pane` indexes are deliberately not stored because they shift.

#### Decision 8: Optional `state` field instead of a heartbeat

**Choice**: `state` is `working | idle | waiting-input | unknown`, with `stateChangedAt`.

**Rationale**: `/tmux` and dispatch need to tell busy from idle from "waiting for you"
before any A2A endpoint exists, and the waiting case maps onto A2A's `input-required`.
State changes refresh `updatedAt`, so no periodic heartbeat is required; liveness still
rests on pid and start identity. `state` is a report and a hung agent keeps its last value.

#### Decision 9: Short-lived and child agents are marked, not hidden by the format

**Choice**: optional `interactive` (default `true`) and `parentPid`. Print-mode runs,
subagents and background children should not register, or must set `interactive: false`.

**Rationale**: they would otherwise churn the directory. Readers that list agents for a
person hide `interactive: false` by default; the format itself stays neutral.

#### Decision 10: Harnesses without hooks get `detected` records

**Choice**: a detector may write `source: "detected"` records (id `det-<harness>-<pid>-<ticks>`)
carrying presence, `cwd` and `tmux` only, never endpoints, tokens or a transcript guess.
Readers de-duplicate on `(pid, processStart)` and prefer a `reported` record.

**Rationale**: Copilot CLI and Gemini would otherwise be invisible. Because a detected record
can never carry an endpoint, it can never direct a client anywhere.

#### Decision 11: Link to history and the backlog

**Choice**: optional `transcript` (absolute session file path). The record is already named by
session id, so it links to `/sessions` exactly and to backlog claims by id prefix: backlog
owners are `pi:<sessionId[:8]>` (`ownerFor` in `_lib/backlog.ts`, checked).

## Consequences

### Positive
- Exact pane-to-session mapping without heuristics (the `tmux` triple, safe across tmux
  restarts).
- A busy / idle / waiting-for-you signal for `/tmux` before A2A exists (`state`).
- A place for A2A endpoints, so `/tmux`/dispatch can block on a task state instead of a
  spinner, and distinguish `input-required` from `working`.
- Any plugin or script can discover agents without importing our code.
- Tmpfs placement removes most stale-record cleanup.

### Negative / costs
- Crashes while logged in still leave stale records until a reader prunes them.
- Every participating harness must write its own record; panes running one that does not
  fall back to scraping.
- A second `agent*` directory name to remember next to `agentctl`'s.
- Same-user trust only; other users cannot be served.

### Neutral
- `tmux-targets` (the remembered `/tmux` target) stays in `$XDG_STATE_HOME/pi/`; it is a
  preference that should survive logout, unlike registry records.

## Implementation plan

1. Reference module, test-first: location, directory safety, atomic write, list, liveness,
   prune, and the pane-identity, state, interactive and detected rules (the spec's 19
   conformance cases).
2. JSON Schema for the record, shipped alongside the spec.
3. pi extension: register on `session_start` (rewrite on `/new`, `/resume`, fork), remove on
   `session_shutdown`.
4. A2A server extension publishes its `endpoints` entry and token; `/tmux` and
   `tmux-dispatch.sh` resolve pane to agent through the registry.

## Open questions

- macOS/BSD process-start identity (not verified).
- Whether `session_start` / `session_shutdown` fire in pi's print mode, and what happens to
  the record when the terminal disappears (both untested).
- Exact pi extension event shapes (`agent_start`, `agent_end`, `agent_settled`, abort) behind
  the `state` mapping and step 4; not yet confirmed against the extension docs.
- Where the reference module lives: dotfiles (harness-neutral, preferred) or pi's `_lib`.

## References

- [Agent Registry spec](../technical-reference/agent-registry-spec.md)
- [ADR-012: agentctl](ADR-012-unified-agent-management-agentctl.md) (XDG tiers; `agents/` namespace)
- A2A protocol; `pi-a2a`, `pi-a2a-adaptor`, `remote-pi` (assessed in `/tmp/a2a-assess`, static read only)
- `~/.pi/ideas.md`, "Live active-session registry" (SQLite proposal; superseded by this ADR, fields adopted)

## Related ADRs

- ADR-012: Unified Agent Management - agentctl

## Decision Date

2026-10-20 (proposed)
