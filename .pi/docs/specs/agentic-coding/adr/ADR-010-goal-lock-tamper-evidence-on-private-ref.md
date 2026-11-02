# ADR-010: Tamper Evidence for Locked Done-Checks on a Private Git Ref

- **Status:** Accepted
- **Date:** 2026-11-01
- **Decider(s):** unop, Main Copilot (Design Session goal-v2)
- **Consulted:** TB-7 adversarial reviews (write guard is best-effort; no symlink check)
- **Informed:** Main Copilot, Builder subagents
- **Supersedes:** N/A

## Context

ADR-009 locks a done-check in `goal.md`. Only `/goal` command handlers, driven by the human, are meant to change it. The agent's write guard is best-effort: a bash command can still edit the file, for example through a variable-built path or a symlink. A silent edit to a locked check would let `/goal done` close on a weaker check than the human approved. Hard enforcement (file permissions, or a separate process that owns the store) costs much more than the risk justifies today.

## Decision Drivers

1. **[DRV-01 — Detect silent edits]:** Closing must notice when a locked check differs from what the human approved.
2. **[DRV-02 — Low cost]:** No new daemon and no permission model.
3. **[DRV-03 — Durable record]:** The approved state must survive sessions and be easy to audit.
4. **[DRV-04 — No repo pollution (ADR-002)]:** Nothing is pushed or added to the working tree.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code Architecture
- **Primary Framework:** ISO/IEC 25010 (Security: integrity, accountability)
- **Guiding Quality Pillars:**
  1. *Integrity:* A hash of the approved check is compared at close.
  2. *Accountability:* Each lock or approval is a commit with a time and message, in git history.

## Decision

On every lock and every approved change, `/goal` records a hash of the canonical done-check (kind plus commands, in order) as a commit on a private ref, `refs/goals/<branch-slug>`, in the repo's common git dir. This ref is never pushed. `/goal done` and `/goal check` recompute the hash and refuse to close when it differs from the hash at the tip of the ref.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | The write guard is best-effort; a silent edit of a locked check could pass closure. |
| **Constraint(s)** | No daemon or permissions (DRV-02); nothing pushed or in the tree (DRV-04). |
| **Requirement(s)** | Detect edits at close (DRV-01) with a durable audit trail (DRV-03). |
| **Decision** | Hash of the approved check, committed on private ref `refs/goals/<branch-slug>`; compared at close. |
| **Alternatives Rejected** | Guarded store directory; pi session entry; hard enforcement. |
| **Rationale** | Git gives an append-only-looking history for free, scoped to the repo and shared by its worktrees. |
| **Tradeoff Accepted** | Tamper-evident, not tamper-proof: the agent has git and the GPG agent, so it can rewrite the ref too. |
| **Decision Authority** | unop — review with H5 (2026-12-15). |

## Architectural Reification & Enforcement

- **Ref:** `refs/goals/<branch-slug>`. Each commit's tree holds `check.sha256`, and its message is `lock <id>` or `approve <id>: <reason>`. Commits are made with `git commit-tree` and `git update-ref`, so the working tree and index are untouched.
- **Closure gate:** `/goal done` refuses on a hash mismatch, and points to `git log refs/goals/<branch-slug>`.
- **Guard:** the existing tool guard also blocks agent commands that name `refs/goals/`, on a best-effort basis.
- **Push safety:** the ref sits outside `refs/heads` and `refs/tags`, so a normal `git push` does not send it.

## Consequences

### Positive Outcomes (+ Gains)
+ A silent edit of a locked check is caught at close, not after.
+ Every lock and approval has a durable, inspectable history shared across worktrees.
+ No new process, directory or permissions.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- The protection is tamper-evident only. An agent that rewrites both `goal.md` and the ref goes undetected, apart from reflog entries.
- GPG signatures would not tell a human apart from the agent, because the agent can use the signing key too, so commits are not signed for trust.
- It adds git plumbing code, and a goal store that is moved without its repo loses its tamper record.
- `git gc` keeps the ref, but reflogs expire, so evidence of a rewrite fades over time.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | A: Private git ref (Chosen) | B: Guarded store dir | C: pi session entry | D: Hard enforcement |
|---|---|---|---|---|
| **DRV-01: Detect edits** | Pass (hash + history) | Pass (hash) | Pass (hash) | Pass (prevents) |
| **DRV-02: Low cost** | Pass | Pass | Pass | Fail (daemon/permissions) |
| **DRV-03: Durable audit** | Pass (git log) | Medium (file only) | Fail (lost with session) | Pass |
| **DRV-04: No repo pollution** | Pass (unpushed ref) | Pass | Pass | Pass |
| **Reversibility** | Two-way door (delete ref) | Two-way | Two-way | One-way-ish |

### Option B: Guarded store directory
- **Description:** Keep the hash in a separate directory under the todo store.
- **Strongest Argument:** The simplest option.
- **Why Rejected:** Weaker on DRV-03, because there's no history of approvals beyond `goal.md`.

### Option C: pi session entry
- **Description:** Keep the hash in session state, which the agent's tools cannot write.
- **Strongest Argument:** Hardest place for the agent to reach.
- **Why Rejected:** Fails DRV-03, because the hash is lost when the session ends and goals span sessions.

### Option D: Hard enforcement
- **Description:** A separate process or OS user owns the goal store.
- **Strongest Argument:** The agent cannot change a locked check at all.
- **Why Rejected:** Fails DRV-02, because the cost is far above the current risk.

## Revisit Criteria

- A real tamper case is found, meaning an agent rewrote both the file and the ref: move to Option D.
- The goal store must be portable across machines: reconsider where the record lives.
