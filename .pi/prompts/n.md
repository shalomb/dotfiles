---
description: Start or resume the car — drive toward the end-state until a stop (bootstrap)
---
Start or resume the drive toward `docs/explanation/end-state-evolution.md`. Keep driving hop after hop without
asking. Stop only at a stop condition below; then explain and discuss until the human resolves it. The human
presses `/n` again to resume. Never change the key results: they are the human's intent.

**Before the first hop (and after any stop):**
1. Compute `rg '^- \*\*KR-' docs/explanation/end-state-evolution.md | sha256sum | cut -c1-16` and compare with
   the `Approved:` line. Pending or mismatch → ask one yes/no question: "Approve these key results (hash <h>)?"
   Yes → write `Approved: <date> <h>` (the only edit allowed to the end-state file), commit it alone with the
   trailer `Approved-By: human (in session)`, and drive on. No or anything else → STOP (destination not approved).
2. If the human left a note during the stop, apply it first.

**Each hop:**
1. Ask the satnav: `timeout 1200 bun .pi/agent/extensions/_lib/next-hop.ts --context <your context %>`. It runs
   every key-result check in file order and ends with `drive KR-n.m` or `stop <reason>` (not-approved, blocked,
   budget, arrived). Obey it.
2. Take the first red key result. Read the last glovebox and `trajectories.jsonl` lines for lessons.
3. Classify the road by rule, not by feel. Motorway: diff about 150 lines or less, no one-way door, and no change
   to a check, a test that a check runs, or the end-state file. Anything else inside the destination is City.
   Load the `drive` skill and drive the key result on its key-result road (Steward → Builder → `drive_gate` →
   Verifier on warnings); obey its verdicts. A motorway hop may skip the wave: build test-first yourself.
   Commit each green step (Conventional Commits, signed).
4. Re-run the key-result check. Green → the hop commit carries these trailers, then continue with the next hop:

   ```
   Serves: KR-n.m
   Road: motorway|city
   Check: <the key-result check, verbatim>
   Check-Base: red (exit N) @ <base sha>
   Check-Head: green (exit 0)
   Gate: drive_gate pass|n/a
   Lesson: <one line>
   ```

   Still red after two attempts → STOP (unclear road).

**Stop conditions (always):** destination not approved or changed; blocked road; a one-way door (push, deploy,
publish, deletes outside the worktree, weakening or skipping a check, editing the end-state file); a lesson that
says the destination is wrong; two rejects on one task; context near 60% (checkpoint first); all key results green.

**Arrival:** before claiming it, replay every `Serves:` commit: its check red at `Check-Base`, green at the head,
and its `Road:` recomputed from the diff. Show one table: key result, commits, replay verdict.

At a stop, the human may arrive cold in a new session. Show the dashboard first, then the discussion:
1. Call the `card` tool twice. First type `scorecard`: `title` = `⛔ STOP <kind>`, `metrics` = one row per key
   result (label `KR-n.m <short sentence>`, value 1 green / 0 red, total 1), `result` = `<n>/<m> green`, `gaps`.
   Then type `status` (state `blocked` for a stop, `ok` on arrival): `done` = this leg's hops (`KR → sha`),
   `blocked` = why the car stopped, `next` = the one decision needed, `unknown` = where to investigate (the
   satnav command, `git log --format='%h %s %(trailers:key=Serves)'`, the failing check verbatim), `gaps`.
2. Then one line: `⛔ STOP <kind> · where: <n>/<m> green, on <KR> · needs: <one decision>`.
