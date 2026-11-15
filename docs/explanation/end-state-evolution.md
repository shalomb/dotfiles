# End-State Evolution

The destination of this repository's agent workflow. The car reads this file to pick each next hop.
Intent lives here and nowhere else: only the human changes the key results below.

Scope: the local need (one person, this machine, code work in this repo). See
[ADR-012](../../.pi/docs/specs/agentic-coding/adr/ADR-012-intent-upstream-loop-runs-itself.md).

## Vision

From any idea, the human reaches a verified, committed change in this repo without driving it by hand. The human
makes every intent decision, the machine does the rest, and it stops by itself at one-way doors and unclear roads.

## Key results

Format: `- **KR-n.m** sentence — check: \`command\``. A check exits 0 when the key result is met. Checks run from
the repo root. The first red key result, in file order, is the next hop.

### O1. Intent is captured once, upstream

- **KR-1.1** The key results in this file parse into id, sentence and check — check: `bun test ./.pi/agent/extensions/_lib/kr.test.ts`

### O2. The car drives itself between stops

- **KR-2.1** The car picks the first red key result and drives on to the next one when its check turns green, without a human command — check: `bun test ./.pi/agent/extensions/_lib/next-hop.test.ts`
- **KR-2.2** The car stops at a changed destination, a blocked road or a spent budget, and `/n` resumes it — check: `bun test ./.pi/agent/extensions/_lib/next-hop.test.ts -t stops`

### O3. Every Builder commit is graded mechanically, never by the agent itself

- **KR-3.1** The gate and the `drive_gate` tool are tested code — check: `bun test ./.pi/agent/extensions/_lib/drive-gate.test.ts ./.pi/agent/extensions/_lib/drive-gate-io.test.ts`
- **KR-3.2** The `drive_gate` tool is deployed where pi loads it — check: `test -f ~/.pi/agent/extensions/drive-gate-tool.ts`

- **KR-3.3** Arrival is proven by replay: every `Serves:` commit's check is red at its base and green at its head — check: `bun test ./.pi/agent/extensions/_lib/replay.test.ts`

### O4. The sensors are honest

- **KR-4.1** The fast test target is green and fails on any failure — check: `make test-fast`
- **KR-4.2** Tests leave no litter in `/tmp` — check: `bun test ./.pi/agent/extensions/_lib/registry-spikes.test.ts && test -z "$(fd -d1 -t d '^spike-h2-' /tmp)"`

## Approval

The human approves the key results once by writing the hash of the key-result lines below. `/n` stops if the hash
no longer matches. Compute it with:

```bash
rg '^- \*\*KR-' docs/explanation/end-state-evolution.md | sha256sum | cut -c1-16
```

Approved: (pending)

## Later, not now

- O5. Autonomy is visible: every hop logs the key result it targeted, whether it moved, tokens and time.
- O6. The docs do not lie: one source of truth; no ADR is Accepted without cited evidence.
