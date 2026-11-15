---
description: Start or resume the car — drive toward the end-state until a stop (bootstrap)
---
Start or resume the drive toward `docs/explanation/end-state-evolution.md`. Keep driving hop after hop without
asking. Stop only at a stop condition below; then explain and discuss until the human resolves it. The human
presses `/n` again to resume. Never change the key results: they are the human's intent.

**Before the first hop (and after any stop):**
1. Compute `rg '^- \*\*KR-' docs/explanation/end-state-evolution.md | sha256sum | cut -c1-16` and compare with
   the `Approved:` line. Pending or mismatch → STOP (destination not approved).
2. If the human left a note during the stop, apply it first.

**Each hop:**
1. Run every key-result check in file order, with a timeout. Exit 126/127 or a missing tool → STOP (blocked
   road). All green → STOP (arrived).
2. Take the first red key result. Read the last glovebox and `trajectories.jsonl` lines for lessons.
3. Build it test-first in this worktree; commit each green step (Conventional Commits, signed). For any change
   bigger than one test and one function, use the `drive` skill's wave (Steward → Builder → `drive_gate` →
   Verifier) and obey its verdicts.
4. Re-run the key-result check. Green → append one lesson line to the glovebox and continue with the next hop.
   Still red after two attempts → STOP (unclear road).

**Stop conditions (always):** destination not approved or changed; blocked road; a one-way door (push, deploy,
publish, deletes outside the worktree, weakening or skipping a check, editing the end-state file); a lesson that
says the destination is wrong; two rejects on one task; context near 60% (checkpoint first); all key results green.

At a stop, say in two lines: where the car is (key results green/red), and what it needs from the human.
