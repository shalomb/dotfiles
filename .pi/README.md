# pi layout: shared config, partitioned credentials

**Rule.** Share everything between the work and personal profiles except the
company/work API subscriptions and personal ones. That means credentials, the
models they unlock, and a few settings that follow from them. Extensions,
slash commands, prompts, agents, skills, roles and keybindings are shared.

## How it works

pi reads its config from `$PI_CODING_AGENT_DIR`. Each profile is one such
directory under `~/.pi/profiles/<name>/` (`work`, `personal`). `~/.pi/agent/`
is the shared base. A profile symlinks to the base for everything shared and
holds real files only for what must differ.

```
~/.pi/agent/                 shared base (tracked in this repo under .pi/agent)
~/.pi/profiles/work/         PI_CODING_AGENT_DIR for work
~/.pi/profiles/personal/     PI_CODING_AGENT_DIR for personal use
```

## Partitioned (real files in each profile, never symlinked)

| File | Why it differs |
| :-- | :-- |
| `auth.json` | API keys and OAuth for that subscription |
| `mcp-auth.json` | OAuth tokens for MCP servers |
| `mcp.json` | Work has Atlassian, GitHub (work org) and the governance server |
| `git/` | Per-profile git identity and credential state |
| `models-store.json` | Models offered depend on the subscription (work: Bedrock, Copilot) |
| `settings.json` model keys | `defaultProvider`, `defaultModel`, `enabledModels`, `modelThinkingLevels` |
| `usage-extension-cache.json` | Usage counted per subscription |
| `sessions/` | Optional. Keep apart if work history must not mix with personal |

## Shared (symlink to `~/.pi/agent/<name>`)

`agents`, `extensions`, `prompts` (slash commands), `scripts`, `skills`,
`roles`, `modes.json`, `keybindings.json`, `skill-tiers.json`, `AGENTS.md`,
`npm`, `pi-*` state, `missions`, `trust.json`.

Skills and roles resolve to the checkouts under
`/media/psf/Home/projects/shalomb/` (`agent-skills`, `pi-moe`).

## Adding something new

1. Does it hold a secret, or depend on which subscription is active? It goes in
   the partitioned table. Otherwise symlink it from the base.
2. Make the same link in **both** profiles. A profile missing a link silently
   loses that capability: `lean-worker` was invisible to the work profile
   until `agents` was linked, and `/drive` names it as the preferred Builder.
3. Check which profile you are in: `echo $PI_CODING_AGENT_DIR`.

## Known gaps (as of 2026-11-15, not yet fixed)

- **`settings.json` is shared.** It carries the model defaults, so one profile
  changing them changes both. Split the model keys per profile, or merge them
  from a per-profile overlay.
- **`models-store.json` is shared** (a symlink to the base), but the available
  models follow the subscription.
- **`work/cache` links to `personal/cache`**, via `agent/cache`. The work
  profile therefore shares a personal cache. Give it its own directory.
- **`agent/auth.json` and `agent/mcp.json` are real files in the base.** They
  work as a default but are a third copy next to the two profile ones.
- **Leftovers:** `profiles/personal/agents.local-20261115091511` (migration
  backup), `profiles/work/tests-disabled/`.
- **Tracked vs live:** this repo's `.pi/agent` holds the tracked copy. Some
  base files are hardlinked and some directories are plain copies. Confirm how
  they sync before editing in only one place.
