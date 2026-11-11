# pi session registry and `pi-find`

Reference. Not to be confused with the agent-process registry in ADR-013.

## What it is
An out-of-repo SQLite (WAL) database that records what each pi session knows
about itself, so any session can be found later, including dead ones.

- Code: `.pi/agent/extensions/_lib/registry.ts` (db), `registry-find.ts` (CLI logic)
- Extension: `session-registry` registers on `session_start`, heartbeats on
  `turn_end`, closes on `session_shutdown`
- CLI: `.local/bin/pi-find` (bun)
- Tests: `bun test .pi/agent/extensions/_lib/registry`

## Recorded per session
id, file, pid, process cwd, tmux session/window/pane, git repo/branch/worktree
(name and path), profile, model, started, last activity, status, prompt digest.

## Status values
`running` (live pid), `ended`, `lost` (pid dead, no clean close),
`died-mid-turn` (log ends on a tool call or user message), `errored`.

History is backfilled from the session jsonl files on every `pi-find` run
(incremental, by mtime/size). Bogus timestamps (invalid, pre-2000, future) are
clamped to the file mtime.

## `pi-find`
```
pi-find [filters] [options] [keyword...]
  --id --pid --tmux-session --tmux-window --tmux-pane
  --branch --worktree --worktree-path --cwd --repo --status --since 7d|12h|2w|ISO
  --keyword <text>   each word must appear (any order); bare words work too
  --json  --limit <n> (default 20)  --all  --no-scan  --db  --root  -h
```
Examples:
```
pi-find --status lost --since 7d
pi-find --cwd ~/proj github runners epic
pi-find --tmux-pane %12 --json
```
Each row prints `/resume <uuid>`.
