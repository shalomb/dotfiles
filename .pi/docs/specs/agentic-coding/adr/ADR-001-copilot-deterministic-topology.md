# ADR-001: Interactive Main Copilot with Deterministic Subagent Lifecycle Supervision

- **Status:** Accepted
- **Date:** 2026-10-31
- **Decider(s):** unop, Main Copilot (Design Session)
- **Consulted:** Springfield Protocol (`ADR-008`, `pipeline-redesign.md`), Lexler Augmented Coding Patterns (`Orchestrator`, `Offload Deterministic`)
- **Informed:** Implementation & Quality Subagents
- **Supersedes:** N/A

## Context

In earlier multi-agent workflows (`agent-mux` and `~/shalomb/springfield/`), two opposing failure modes surfaced:
1. When an LLM orchestrated workers directly by polling `tmux` panes, parsing terminal prompts, and tracking PIDs, its context window rapidly filled with operational noise and race conditions caused dropped handoffs.
2. Conversely, when a standalone Go daemon (`springfield`) owned the entire loop above headless personas (`Marge -> Lisa -> Ralph -> Bart -> Lovejoy`), the human lost an interactive partner ("the real copilot") to shape intent, question assumptions, and steer design during execution.

## Decision Drivers

1. **[DRV-01 — Continuous Human-Copilot Alignment]:** The human must have a persistent, responsive copilot session to capture intent and steer design throughout long coding sessions.
2. **[DRV-02 — Zero LLM Supervision Tax]:** Process spawning, worktree creation, stall detection, and completion handshakes must consume zero LLM tokens and never fail due to prompt-parsing ambiguity.
3. **[DRV-03 — Cognitive Load & Intention (ISO 25010)]:** The Main Copilot's attention must remain focused on domain intent, architectural boundaries, and exceptions rather than process mechanics.
4. **[DRV-04 — Crash & Process Durability]:** Subagent execution state must survive transient tool stalls and report terminal status deterministically.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code Architecture + Distributed Systems
- **Primary Framework:** ISO/IEC 25010 Quality Model & AWS Well-Architected Framework
- **Guiding Quality Pillars:**
  1. *Cognitive Load & Intention (ISO 25010):* Separates generative design steering (LLM) from deterministic process supervision (runner).
  2. *Operational Excellence & Cost Optimization (WAF):* Eliminates LLM polling loops and redundant supervisor turns, capping default LLM execution at 1 Builder pass per batch.

## Decision

Adopt a split **Interactive Copilot + Deterministic Wave Runner** topology:
- The **Main Copilot** (`pi` interactive session) owns human intent capture, design steering, and exception decisions.
- A **Deterministic Wave Runner** (invoked via `pi`'s `bg_run` / subprocess supervisor) owns `Transient Worktree` provisioning, Builder/Critic process lifecycle, sentinel completion handshakes, and deterministic gate checks, waking the Main Copilot only via terminal completion notifications.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | LLM process supervisors rot context and race on panes; headless daemons cut the human out of design steering. |
| **Constraint(s)** | Finite Main Copilot context window and strict token/latency ceiling (`DRV-02`, `DRV-03`). |
| **Requirement(s)** | Interactive human-copilot steering with crash-safe, zero-polling subagent execution (`DRV-01`, `DRV-04`). |
| **Decision** | Pair an interactive `pi` Main Copilot with a deterministic subprocess wave runner using terminal notifications. |
| **Alternatives Rejected** | Option B: Standalone headless Go daemon above all agents; Option C: Prompt-driven LLM polling `tmux` panes. |
| **Rationale** | Keeps generative intelligence on intent and design while deterministic code manages process state transitions. |
| **Tradeoff Accepted** | Requires a strict structured handoff contract (batch manifests and receipts) between Copilot and runner. |
| **Decision Authority** | `unop` — review after Tracer Spike `TB-1` / `TB-3` (2026-11-30). |

## Architectural Reification & Enforcement

- **No-Polling Guardrail:** Subagent runs launch via `bg_run` (`notifyOnCompletion: true, triggerOnCompletion: true`) or the deterministic runner CLI; `tmux` pane-polling loops are prohibited.
- **Deterministic Batch Default:** Routine wave batching (`todo batch`) and gate verification run as deterministic CLI commands with 0 supervisor LLM passes.
- **Fitness Check:** Tracer Spike `TB-1` verifies that orchestration overhead consumes $< 10\%$ of total wave tokens.

## Consequences

### Positive Outcomes (+ Gains)
+ Preserves an interactive, low-noise Main Copilot session with the human across multi-hour features.
+ Eliminates `tmux` prompt-parsing races, duplicate dispatches, and polling token burn.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- The Main Copilot cannot inspect mid-flight subagent reasoning unless a subagent halts and emits a blocked receipt.
- Requires maintaining a deterministic runner script/binary alongside `pi` skills.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | Option A: Copilot + Deterministic Runner (Chosen) | Option B: Standalone Headless Go Daemon | Option C: LLM Polling `tmux` Panes |
|---|---|---|---|
| **DRV-01: Human-Copilot Alignment** | High (live interactive `pi` session) | Low (human edits files outside loop) | Medium (Copilot busy polling) |
| **DRV-02: Zero LLM Supervision Tax** | High (0 polling tokens) | High (0 polling tokens) | Fail (continuous polling turns) |
| **DRV-03: Cognitive Load & Focus** | High (intent-only window) | N/A (no persistent copilot) | Low (window polluted by logs) |
| **DRV-04: Crash & Process Durability** | High (OS process + sentinel) | High (Go state machine) | Low (pane state undetectable) |
| **Reversibility / Lock-in** | Two-way door (standard CLI boundary) | Medium (couples all personas to Go binary) | Two-way door (prompt-only) |

### Option A: Interactive Copilot + Deterministic Wave Runner (Chosen)
- **Why Chosen:** Satisfies all four drivers by combining `pi`'s interactive session and `<background-task-notification>` wakeup with deterministic subprocess management.
- **Key Caveat:** Requires explicit on-disk batch and receipt schemas.

### Option B: Standalone Headless Go Daemon Above All Agents
- **Description:** A compiled Go daemon (`springfield`) schedules Marge, Lisa, Ralph, Bart, and Lovejoy autonomously.
- **Strongest Argument:** Fully autonomous state machine with zero human intervention required during a run.
- **Why Rejected:** Violates `DRV-01` — removes the interactive copilot relationship needed to refine intent and make course-correction decisions mid-flight.

### Option C: Prompt-Driven Main Agent Polling `tmux` Panes
- **Description:** The Main Copilot dispatches subagents into `tmux` panes and polls pane output in a loop.
- **Strongest Argument:** Zero custom runner code required.
- **Why Rejected:** Violates `DRV-02`, `DRV-03`, and `DRV-04` — proven in `agent-mux` retrospectives to cause race conditions and severe context rot.

## Revisit Criteria

- Revisit if subagents require real-time mid-execution conversational co-debugging with the Main Copilot rather than batch-boundary handoffs.
