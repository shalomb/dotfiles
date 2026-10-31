# ADR-002: Out-of-Repo Single Backlog Store and Trajectory Ledger (`todo`)

- **Status:** Accepted
- **Date:** 2026-10-31
- **Decider(s):** unop, Main Copilot (Design Session)
- **Consulted:** `todo-navigator` skill, Springfield `ADR-008` (`td` SQLite evaluation)
- **Informed:** Batch Planner, Builder, and Critic Subagents
- **Supersedes:** N/A

## Context

Multi-agent coding systems require a shared store for task intent, dependency waves, active claims, Work Batch manifests, and execution learning signals (`Observations` and `Trajectory Signals`). In `~/shalomb/springfield/`, using repo-committed `PLAN.md`/`TODO.md` files alongside a repo-local `.todos/issues.db` (`td`) caused two problems:
1. Git worktrees contended on or polluted target repositories with `.todos/` and `TODO-*.md` files.
2. Keeping human intent in `todo` (`~/.cache/agent-skills/todos/<repo_slug>/`) while storing machine state in `td` created dual-store synchronization drift.

## Decision Drivers

1. **[DRV-01 — Zero Target-Repo Pollution]:** Planning state, batch cards, and learning ledgers must never dirty `git status` or require `.gitignore` changes in shared repositories.
2. **[DRV-02 — Single Source of Truth Across Worktrees]:** The Main Copilot and all `Transient Worktrees` must read and claim from one canonical store without branch merge conflicts.
3. **[DRV-03 — Human & Agent Inspectability]:** Humans must be able to view and edit task/batch cards in a `vi` popup (`todo edit`) while scripts query structured trajectory records deterministically.
4. **[DRV-04 — Atomic Multi-Agent Claim Locking]:** Concurrent subagents must claim tasks and batches without race conditions.

## Domain Quality Framework Alignment

- **Domain Archetype:** Distributed Systems & Data + Software Architecture
- **Primary Framework:** CAP / PACELC & ISO/IEC 25010 Maintainability
- **Guiding Quality Pillars:**
  1. *Idempotency & Atomic Locking:* File-locked claims in a single host-local cache directory prevent duplicate work across parallel worktrees.
  2. *Data Lineage & Auditability:* An append-only `trajectories.jsonl` ledger preserves every batch outcome and `Observation` alongside markdown task cards.

## Decision

Standardize on the out-of-repo **`todo` CLI cache directory** (`${XDG_CACHE_HOME:-~/.cache}/agent-skills/todos/<repo_slug>/`) as the single store for all planning and learning artefacts:
- `TODO.md` and `tasks/<id>.md` for backlog intent and acceptance criteria.
- `batches/<batch-id>.md` for cohesive `Work Batch` manifests.
- Append-only `trajectories.jsonl` for `Trajectory Signals` and `Observations`.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | Repo-local planning files pollute git branches, and splitting state across `todo` and `td` causes sync drift. |
| **Constraint(s)** | Shared repositories forbid untracked planning DBs (`DRV-01`); parallel worktrees need one shared view (`DRV-02`). |
| **Requirement(s)** | Human-editable task/batch cards plus machine-queryable trajectory logs with atomic locking (`DRV-03`, `DRV-04`). |
| **Decision** | Extend the out-of-repo `todo` cache store with `batches/<id>.md` cards and an append-only `trajectories.jsonl`. |
| **Alternatives Rejected** | Option B: Repo-local `td` SQLite DB (`.todos/issues.db`); Option C: Dual store (`todo` for intent, `td` for runs). |
| **Rationale** | Reuses `todo`'s zero-pollution cache, WSJF DAG waves, file-locked claims, and `vi` popup editing in one place. |
| **Tradeoff Accepted** | JSONL and markdown queries use `jq` / CLI scans rather than full relational SQL joins. |
| **Decision Authority** | `unop` — review after Tracer Spike `TB-4` (2026-11-30). |

## Architectural Reification & Enforcement

- **Storage Layout Contract:** All state resolves under `${XDG_CACHE_HOME:-~/.cache}/agent-skills/todos/<repo_slug>/` keyed by the repository root commit / canonical slug.
- **Locking Enforcement:** Task and batch transitions execute exclusively through `todo` CLI subcommands (`claim`, `done`, `release`, `replan`, `batch`) under `flock`.
- **CI / Hook Guard:** Pre-commit hooks (`acp-commit-guard.ts` / `report-clutter-guard.ts`) reject commits that stage `TODO*.md` or `.todos/` inside code repositories.

## Consequences

### Positive Outcomes (+ Gains)
+ Zero git branch contention or repository clutter across any number of `Transient Worktrees`.
+ Eliminates dual-store synchronization bugs between human backlog items and subagent execution state.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- `todo` CLI must be extended to manage `batches/<id>.md` and read `trajectories.jsonl` during `todo replan`.
- Scoped to single-host execution (shared filesystem cache); distributed multi-host workers would require a networked store.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | Option A: Single Out-of-Repo `todo` Store (Chosen) | Option B: Repo-Local `td` SQLite (`.todos/`) | Option C: Dual Store (`todo` + `td`) |
|---|---|---|---|
| **DRV-01: Zero Repo Pollution** | Pass (lives in `~/.cache`) | Fail (places `.todos/` in repo root) | Fail (`.todos/` still in repo) |
| **DRV-02: Single Source of Truth** | Pass (1 directory per repo slug) | Pass (1 SQLite DB) | Fail (2 stores to sync) |
| **DRV-03: Human `vi` + CLI Inspectability** | High (Markdown + JSONL + `todo edit`) | Low (binary SQLite; CLI-only) | Medium (split UX) |
| **DRV-04: Atomic Claim Locking** | Pass (`flock` on cache store) | Pass (SQLite WAL locking) | Medium (cross-store race window) |
| **Reversibility / Lock-in** | High (plain Markdown + JSONL files) | Medium (custom Go internal schema) | Low (complex sync adapter) |

### Option A: Single Out-of-Repo `todo` Store with `batches/` and `trajectories.jsonl` (Chosen)
- **Why Chosen:** Preserves zero repo pollution and human-friendly Markdown cards while adding structured JSONL storage for RL telemetry and `Observations`.
- **Key Caveat:** Requires `todo replan` and `todo batch` extensions.

### Option B: Repo-Local `td` SQLite Database
- **Description:** Store all epics, tasks, and decision logs in `.todos/issues.db` inside the repository root.
- **Strongest Argument:** Rich SQL query syntax and built-in `td log --decision` tables.
- **Why Rejected:** Violates `DRV-01` (pollutes shared repos) and `DRV-03` (loses direct Markdown card editing in `todo edit`).

### Option C: Dual Store (`todo` for Human Intent, `td` for Subagent Execution)
- **Description:** Keep `todo` for the Main Copilot and mirror ready tasks into `td` for worker execution.
- **Strongest Argument:** Uses each tool as-is without extending `todo`.
- **Why Rejected:** Violates `DRV-02` — two independent state stores inevitably diverge on crash or mid-batch salvage.

## Revisit Criteria

- Revisit if trajectory volume exceeds $10^5$ JSONL rows per repository (where `jq` / linear scan latency exceeds 100 ms) or if workers move to remote machines without a shared filesystem.
