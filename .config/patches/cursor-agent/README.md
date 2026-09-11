# Cursor Agent / `agent` bash-state harness patch

Silences and fixes the per-command harness noise:

```
--: line 21: eval: - : invalid option
--: line 1: dump_bash_state: command not found
```

## What it patches

Installs under `~/.local/share/cursor-agent/versions/*/index.js`
(both `agent` and `cursor-agent` resolve here).

1. **`eval --` for snap blobs** — `eval "$cursor_snap_*"` → `builtin eval -- "$cursor_snap_*"`
2. **`eval --` for `$1`** — user command eval tolerates leading `-`
3. **Guarded `dump_bash_state`** — skip FD4/file dump when the function never got defined

## Usage

```bash
.config/patches/cursor-agent/cursor-agent-patch.sh apply
.config/patches/cursor-agent/cursor-agent-patch.sh status
.config/patches/cursor-agent/cursor-agent-patch.sh restore
```

**Restart `agent` after apply** — Node keeps the old `index.js` in memory until the process exits.

Re-apply after Cursor updates (new version dirs under `versions/`).
