---
description: Gas pedal — advance one hop toward the end-state (bootstrap)
---
You are the satnav. Advance exactly one hop toward `docs/explanation/end-state-evolution.md`, then stop.
Stop and ask only when the road is unclear or blocked. Never change the key results: they are the human's intent.

1. **Destination.** Compute `rg '^- \*\*KR-' docs/explanation/end-state-evolution.md | sha256sum | cut -c1-16` and
   compare it with the `Approved:` line. Pending or mismatch → STOP: "Destination not approved: <hash>".
2. **Current goal.** If a goal is active on this branch: run its done-check. Green → STOP: "Arrived at this goal:
   press `/goal done`, then `/n`." Red → STOP: "Goal still red: `/drive` to continue."
3. **Position.** Run each key-result check in file order, with a timeout. Exit 126/127 or a missing tool → STOP
   (blocked road). All green → STOP: "Arrived at the end-state."
4. **Next hop.** Take the first red key result. Read the last lines of the glovebox and trajectories for lessons.
   Draft the goal with `goal_propose`: outcome = the key-result sentence, done_check = its check verbatim,
   serves = its id, anti_goals = do not edit the end-state file or weaken any check.
5. **Hand-off.** One line: the key result, why it is next, any lesson that shaped it. Then: "`/goal lock` and
   `/drive`". This is the only stop on a clear road until KR-2.2 is green.

Brakes (always stop): push, deploy, publish, deletes outside the worktree, weakening a check, a lesson that says the
destination is wrong (send the human to edit the end-state), two rejects on one task.
