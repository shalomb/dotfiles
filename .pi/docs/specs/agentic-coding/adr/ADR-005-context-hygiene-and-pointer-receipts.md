# ADR-005: Context Hygiene via Pointer-Rich Batch Receipts and Wave Checkpoints

- **Status:** Amended 2026-10-31: receipts must be machine-verifiable (`H2`); see [Amendment 1](#amendment-1-2026-10-31-h2-evidence)
- **Date:** 2026-10-31
- **Decider(s):** unop, Main Copilot (Design Session)
- **Consulted:** Lexler Augmented Coding Patterns (`Context Management`, `Focused Agent`, `Knowledge Checkpoint`, `Context Rot`)
- **Informed:** Main Copilot, Wave Runner, Builder & Critic Subagents
- **Supersedes:** N/A

## Context

Over a long coding session (10+ Work Batches), the Main Copilot's context window degrades if it ingests raw subagent tool outputs, test logs, or full git diffs. Conversely, if the Main Copilot receives only a bare exit code and resets its context blindly, it loses awareness of subtle architectural drift across waves and can drop nuances from human design discussions. As Lexler's *Context Management* pattern states, an LLM context window supports only two operations: **append** and **reset**.

## Decision Drivers

1. **[DRV-01 — Bounded Per-Batch Token Intake (`H2`)]:** The Main Copilot must stay below $50\%$ context occupancy across 10 completed Work Batches (~30 tasks).
2. **[DRV-02 — On-Demand Deep Inspectability]:** Both the Main Copilot and the human must be able to jump directly to any commit, task card, symbol, or failure log when an exception occurs.
3. **[DRV-03 — Structural Drift Visibility Across Waves]:** The Main Copilot must detect architectural/dependency drift without reading per-batch diffs.
4. **[DRV-04 — Lossless Context Reset]:** Context resets must preserve North Star intent, settled architectural anchors, and human nuance.

## Domain Quality Framework Alignment

- **Domain Archetype:** Software & Code Architecture
- **Primary Framework:** ISO/IEC 25010 (Cognitive Load & Maintainability)
- **Guiding Quality Pillars:**
  1. *Cognitive Load & Intention:* Replaces noisy raw dumps with a strict `<= 25`-line receipt of navigable pointers.
  2. *Architectural Fitness Functions:* Uses a deterministic `codemap diff` at wave boundaries to surface structural changes before checkpoint reset.

## Decision

Enforce a two-part **Context Hygiene Protocol**:
1. **Strict `<= 25`-Line `Batch Receipt` with `Context Pointers`:** Every subagent run returns at most 25 lines to the Main Copilot. Inline diffs and logs are replaced by `Context Pointers` (`git:<sha>`, `todo:<id>`, `file:///path#L<line>`, and report URIs) dereferenced only on block or human query.
2. **Wave-Boundary `Knowledge Checkpoint` with `codemap diff` and Human Ack:** At the end of each wave (or at $60\%$ context occupancy), the system writes an on-disk `Knowledge Checkpoint` containing North Star intent, settled anchors, wave status, and a deterministic `codemap diff`. The Main Copilot resets its context window from this checkpoint only after human acknowledgement.

## Y-Statement

| Dimension | Detail |
|---|---|
| **Context** | Raw subagent logs pollute the Main Copilot window (`Context Rot`), while blind resets lose architectural drift. |
| **Constraint(s)** | Context only supports append or reset; Main Copilot must stay $< 50\%$ full across 10 batches (`DRV-01`). |
| **Requirement(s)** | Clickable on-demand evidence (`DRV-02`), wave-level drift detection (`DRV-03`), and safe resets (`DRV-04`). |
| **Decision** | Cap Batch Receipts at 25 lines using URI/SHA Context Pointers, paired with human-acknowledged wave checkpoints + `codemap diff`. |
| **Alternatives Rejected** | Option B: Inline diff snippets and prose summaries per batch; Option C: Automatic silent context compaction/reset. |
| **Rationale** | Bounds append growth to $O(25 \text{ lines/batch})$ while keeping full evidence 1 pointer hop away and structural drift visible per wave. |
| **Tradeoff Accepted** | Requires a strict receipt formatter/validator and human confirmation at wave checkpoint resets. |
| **Decision Authority** | `unop` — gated on Falsifiable Hypothesis `H2` in Tracer Spike `TB-2` (2026-11-30). |

## Architectural Reification & Enforcement

- **Receipt Schema Validator:** The runner truncates or rejects any `Batch Receipt` exceeding 25 lines and validates that every commit, task, and log reference uses a valid `Context Pointer` URI scheme.
- **Wave `codemap diff` Hook:** Before writing `checkpoint-wave-N.md`, the runner executes a deterministic structural diff of module fan-in/fan-out and embeds it in the checkpoint.
- **Kill Criterion (`H2`):** If the Main Copilot has to dereference pointers on $> 40\%$ of green batches in `TB-2`, add a 3-line changed-signature summary to the receipt schema.

## Consequences

### Positive Outcomes (+ Gains)
+ Main Copilot context grows linearly at $\le 25$ lines per batch regardless of how many files or tests the subagent touched.
+ Terminal OSC-8 / `file://` / `git:` pointers let the human or Main Copilot inspect exact evidence in one click or tool call when needed.
+ Wave-boundary `codemap diff` catches unexpected coupling without reading line-by-line code diffs.

### Negative Consequences & Trade-offs (- Costs & Accepted Debt)
- If a subagent mislabels a `Context Pointer`, a non-failing semantic drift could go unnoticed until the wave-boundary `codemap diff`.

## Alternatives Considered

### Multi-Criteria Comparison Matrix

| Evaluation Criterion | Option A: `<= 25`-Line Pointer Receipt + Wave Checkpoint (Chosen) | Option B: Inline Diff Snippets + LLM Auto-Compaction | Option C: Silent Stateless Reset After Every Batch |
|---|---|---|---|
| **DRV-01: Bounded Token Intake (`H2`)** | Pass ($\le 250$ lines per 10 batches) | Fail (diffs fill window in 3–4 batches) | Pass (resets every batch) |
| **DRV-02: On-Demand Inspectability** | High (URI/SHA/`file:line` pointers) | Medium (inlined, noisy) | Low (lost on reset) |
| **DRV-03: Structural Drift Visibility** | Pass (wave `codemap diff`) | Medium (buried in prose) | Fail (no cross-batch memory) |
| **DRV-04: Lossless Context Reset** | Pass (human-ack `Knowledge Checkpoint`) | Low (lossy LLM summary) | Fail (interrupts human dialogue) |
| **Reversibility / Lock-in** | Two-way door (receipt template) | Two-way door | Two-way door |

### Option A: `<= 25`-Line Pointer Receipt + Human-Acknowledged Wave Checkpoint with `codemap diff` (Chosen)
- **Why Chosen:** Combines minimal per-batch token growth with on-demand pointer resolution and wave-level structural verification.
- **Key Caveat:** Gated on Hypothesis `H2` ($< 15\%$ pointer dereference rate on green batches).

### Option B: Inline Diff Snippets and Continuous LLM Auto-Compaction
- **Description:** Return prose summaries with key diff hunks after each batch and rely on automatic conversation summarization when the context fills.
- **Strongest Argument:** No pointer dereferencing needed to see code snippets.
- **Why Rejected:** Violates `DRV-01` and `DRV-04` — inline diffs accelerate context rot, and generic auto-compaction blurs sharp architectural constraints.

### Option C: Stateless Hard Reset After Every Single Batch
- **Description:** Wipe and restart the Main Copilot session after every batch completion.
- **Strongest Argument:** Maximum context freshness.
- **Why Rejected:** Violates `DRV-04` — destroys ongoing design conversations with the human mid-wave.

## Revisit Criteria

- Revisit if Tracer Spike `TB-2` shows pointer dereference rates $> 40\%$ or if `Main Copilot` context exceeds $50\%$ within 10 batches. **Triggered 2026-10-31** (Sonnet with an attestation line: 0.41).

## Amendment 1 (2026-10-31): H2 Evidence

**Finding.** The context half of `H2` holds: peak `Main Copilot` context stayed at or below 7% of a 200k window across 10 receipts on every variant. The dereference half is **model-dependent**:
- On Sonnet, the Copilot follows `git:` pointers to *verify* the claims, and gets worse when the receipt merely asserts "verified by gate" (0.32 → 0.41).
- On Gemini, it reads `file://` contract anchors (0.14).

Either way, a pointer receipt invites a tool call on every turn. Evidence: `~/shalomb/agentic-falsify/runs/h2/`, `runs/FINDINGS.md`.

**Amended decision.**
1. **Trust is machine-checkable, never asserted.** Every `Batch Receipt` is accompanied by a deterministic `verify-receipt <receipt>` command. It checks that every `git:` pointer is a commit on the `Feature Worktree` branch and every `file://` anchor exists and is in range, in a single call. Receipts must not carry prose attestations such as "verified by gate".
2. **Copilot policy: verify once, then decide.** The Copilot runs `verify-receipt` once per receipt and follows individual pointers only for *content* it needs (e.g. reviewing an escalated hub-file diff).
3. **H2 is re-scoped.** Measure *calls per receipt* and *tokens* against plain receipts on the same model. Track content dereferences separately from verification calls. With `verify-receipt` on Gemini: 1 call per receipt, 0.44× tokens, and correct decisions on the SALVAGED and ESCALATE receipts.

**Open.** Confirm the policy on Sonnet once its quota resets (`VERIFY=1 MODEL=<sonnet> spikes/h2/run.sh`). Kill rule: if Sonnet still makes more than 1 verification call per receipt alongside `verify-receipt`, add the verification result to the receipt itself, signed by the gate.
