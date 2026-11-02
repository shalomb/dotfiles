// Run: bun test ~/.pi/agent/extensions/_lib/goal.test.ts
// Scenario names refer to docs/specs/agentic-coding/features/goal-contract.feature.
import { expect, test } from "bun:test";
import {
	applyApprovedChange, applyClose, applyLock, applyReject, branchSlug, canLock, closeDecision, dropGoal, fillDraft, goalPath, goalsDir,
	isEnvironmentFailure, newDraft, parseGoal, proposeChange, reminderLine, renderGoal, staleGoal, storeDir, validateGoal,
} from "./goal.ts";

const NOW = new Date("2026-11-01T10:00:00Z");

test("store is keyed by the main worktree root, so linked worktrees share it", () => {
	const main = storeDir({}, "/home/u", "/home/u/.config/dotfiles/.git");
	expect(main).toBe("/home/u/.cache/agent-skills/todos/home-u-.config-dotfiles");
	// a linked worktree reports the same common dir as the main checkout
	expect(storeDir({}, "/home/u", "/home/u/.config/dotfiles/.git")).toBe(main);
});

test("store honours an absolute XDG_CACHE_HOME and ignores a relative one", () => {
	expect(storeDir({ XDG_CACHE_HOME: "/tmp/c" }, "/home/u", "/r/app/.git")).toBe("/tmp/c/agent-skills/todos/r-app");
	expect(storeDir({ XDG_CACHE_HOME: "rel" }, "/home/u", "/r/app/.git")).toBe("/home/u/.cache/agent-skills/todos/r-app");
});

test("goal file is <store>/goals/<branch-slug>.md with slashes turned into dashes", () => {
	expect(branchSlug("feat/export")).toBe("feat-export");
	expect(branchSlug("design/sync/v2")).toBe("design-sync-v2");
	const store = "/s/todos/r";
	expect(goalsDir(store)).toBe("/s/todos/r/goals");
	expect(goalPath(store, "feat/export")).toBe("/s/todos/r/goals/feat-export.md");
});

test("a new draft carries the outcome, the branch id and the base commit, and is not locked", () => {
	const g = newDraft({ branch: "feat/export", outcome: "Users can export a backlog as CSV", baseCommit: "a1b2c3d" }, NOW);
	expect(g.id).toBe("g-feat-export");
	expect(g.status).toBe("draft");
	expect(g.createdAt).toBe("2026-11-01T10:00:00Z");
	expect(g.doneCheck.baseCommit).toBe("a1b2c3d");
	expect(g.doneCheck.lockedAt).toBe("");
	expect(g.doneCheck.commands).toEqual([]);
});

const full = () => {
	const g = newDraft({ branch: "feat/export", outcome: "Users can export a backlog as CSV", baseCommit: "a1b2c3d" }, NOW);
	g.doneCheck.commands = ["make -C skills/todo-navigator test-unit", `grep -q "a: b" out.csv # header`];
	g.antiGoals = ["No new runtime dependency"];
	g.scopeAnchors = ["skills/todo-navigator/src/"];
	g.specLinks = ["docs/specs/agentic-coding/features/goal-contract.feature"];
	g.history = [{ at: "2026-11-01T10:05:00Z", by: "human", reason: "locked (base a1b2c3d failed: exit 1)" }];
	return g;
};

test("rendered goal is the contract format: YAML front matter then sections", () => {
	const text = renderGoal(full());
	expect(text.startsWith("---\nid: g-feat-export\nbranch: feat/export\nstatus: draft\noutcome: Users can export a backlog as CSV\ndone_check:\n  kind: command\n  commands:\n    - make -C skills/todo-navigator test-unit\n")).toBe(true);
	expect(text).toContain('  locked_at: ""\n');
	expect(text).toContain("created_at: 2026-11-01T10:00:00Z\n");
	expect(text).toContain("## Anti-goals\n- No new runtime dependency\n");
	expect(text).toContain("## Scope anchors\n- skills/todo-navigator/src/\n");
	expect(text).toContain("## History\n- 2026-11-01T10:05:00Z human: locked (base a1b2c3d failed: exit 1)\n");
});

test("parse(render(goal)) returns the same goal, including awkward characters", () => {
	const g = full();
	g.outcome = 'Fix "the: thing" # now';
	g.doneCheck.kind = "command";
	g.history.push({ at: "2026-11-01T11:00:00Z", by: "human", reason: "drop a | b check", old: { kind: "command", commands: ["a", "b"] }, new: { kind: "command", commands: ["a"] } });
	expect(parseGoal(renderGoal(g))).toEqual(g);
});

test("a hostile reason cannot break the History or Pending line parse", () => {
	const reason = 'x | old: null | new: {"a":1}';
	const check = { kind: "command" as const, commands: ["a"] };
	const g = full();
	g.history.push({ at: "2026-11-01T11:00:00Z", by: "human", reason, old: check, new: { kind: "command", commands: ["b"] } });
	g.history.push({ at: "2026-11-01T11:01:00Z", by: "human", reason });
	g.pending = { at: "2026-11-01T12:00:00Z", by: "agent", reason, old: check, new: { kind: "command", commands: ["c"] } };
	expect(parseGoal(renderGoal(g))).toEqual(g);
});

test("a corrupt history line degrades to a plain-text entry instead of failing the whole parse", () => {
	const text = renderGoal(full()).replace("## History\n", '## History\n- {"at": broken | old: {oops\n');
	const g = parseGoal(text)!;
	expect(g.history.map((h) => h.reason)).toEqual(['{"at": broken | old: {oops', "locked (base a1b2c3d failed: exit 1)"]);
	expect(parseGoal(renderGoal(g))).toEqual(g);
});

test("a goal with empty lists and a human-confirm check round-trips", () => {
	const g = newDraft({ branch: "design/sync", outcome: "Sync design agreed", baseCommit: "" }, NOW);
	g.doneCheck.kind = "human";
	expect(parseGoal(renderGoal(g))).toEqual(g);
});

test("text that is not a goal file does not parse", () => {
	expect(parseGoal("# just notes\n")).toBeUndefined();
	expect(parseGoal("---\nid: g-x\nstatus: weird\n---\n")).toBeUndefined();
});

test("a goal without an outcome is refused; a draft may lack a done-check but an active goal may not", () => {
	const g = newDraft({ branch: "feat/x", outcome: "x", baseCommit: "b" }, NOW);
	expect(validateGoal(g)).toBeUndefined();
	expect(validateGoal({ ...g, outcome: "  " })).toMatch(/outcome/);
	expect(validateGoal({ ...g, status: "active" })).toMatch(/done-check/);
	expect(validateGoal({ ...g, status: "active", doneCheck: { ...g.doneCheck, commands: ["true"] } })).toBeUndefined();
	expect(validateGoal({ ...g, status: "active", doneCheck: { ...g.doneCheck, kind: "human" } })).toBeUndefined();
});

// ---- transitions ----

const LATER = new Date("2026-11-01T10:05:00Z");
const draftWithCheck = () => {
	const g = newDraft({ branch: "feat/export", outcome: "Users can export a backlog as CSV", baseCommit: "a1b2c3d" }, NOW);
	g.doneCheck.commands = ["make test-unit", "make test-csv"];
	return g;
};
const locked = () => {
	const r = applyLock(draftWithCheck(), { now: LATER, baseCommit: "a1b2c3d", baseExit: 1, outcomeChecks: ["make test-csv"] });
	if (!r.ok) throw new Error(r.reason);
	return r.goal;
};

// Scenario: A Done-check that already passes on the base commit is refused
test("a check that passes on the base commit (exit 0) cannot be locked; the reason says it must fail first", () => {
	const c = canLock(0);
	expect(c.ok).toBe(false);
	expect(!c.ok && c.reason).toMatch(/must fail before the work starts/);
	const r = applyLock(draftWithCheck(), { now: LATER, baseCommit: "a1b2c3d", baseExit: 0 });
	expect(r.ok).toBe(false);
});

test("a check that could not be run (no exit code) cannot be locked either", () => {
	expect(canLock(undefined).ok).toBe(false);
});

// Scenario: A Done-check that fails on the base commit is locked
test("a check that fails on the base commit locks with the base commit and a history line", () => {
	expect(canLock(1).ok).toBe(true);
	const g = locked();
	expect(g.status).toBe("active");
	expect(g.doneCheck.lockedAt).toBe("2026-11-01T10:05:00Z");
	expect(g.doneCheck.lockedBy).toBe("human");
	expect(g.doneCheck.baseCommit).toBe("a1b2c3d");
	expect(g.history).toEqual([{ at: "2026-11-01T10:05:00Z", by: "human", reason: "locked (base a1b2c3d failed: exit 1)" }]);
});

test("a draft without commands, or a goal that is not a draft, cannot be locked", () => {
	const empty = newDraft({ branch: "feat/x", outcome: "x", baseCommit: "b" }, NOW);
	expect(applyLock(empty, { now: LATER, baseCommit: "b", baseExit: 1 }).ok).toBe(false);
	expect(applyLock(locked(), { now: LATER, baseCommit: "b", baseExit: 1 }).ok).toBe(false);
});

test("a human-confirm check locks without a command run", () => {
	const g = newDraft({ branch: "design/sync", outcome: "Sync design agreed", baseCommit: "b" }, NOW);
	g.doneCheck.kind = "human";
	const r = applyLock(g, { now: LATER, baseCommit: "b" });
	expect(r.ok && r.goal.status).toBe("active");
	expect(r.ok && r.goal.history[0].reason).toBe("locked (human-confirm check)");
});

test("filling a draft sets contract fields but never locks", () => {
	const g = newDraft({ branch: "feat/export", outcome: "o", baseCommit: "b" }, NOW);
	const r = fillDraft(g, { doneCheck: { kind: "command", commands: ["make t"] }, antiGoals: ["no deps"], scopeAnchors: ["src/"], specLinks: ["spec.md"] });
	expect(r.ok && r.goal.doneCheck.commands).toEqual(["make t"]);
	expect(r.ok && r.goal.status).toBe("draft");
	expect(r.ok && r.goal.doneCheck.lockedAt).toBe("");
	expect(r.ok && r.goal.antiGoals).toEqual(["no deps"]);
});

test("a check command with a newline or control character is refused, not rewritten", () => {
	for (const bad of ["make t\nrm -rf x", "make t\r", "make t\u0000", "make\tt", "make t\u001b[0m"]) {
		const f = fillDraft(draftWithCheck(), { doneCheck: { kind: "command", commands: ["ok", bad] } });
		expect(f.ok).toBe(false);
		if (!f.ok) expect(f.reason).toMatch(/newline|control/i);
		expect(proposeChange(locked(), { now: LATER, by: "agent", reason: "r", check: { kind: "command", commands: [bad] } }).ok).toBe(false);
	}
	expect(fillDraft(draftWithCheck(), { doneCheck: { kind: "command", commands: ["make  t", " ok "] } }).ok).toBe(true);
});

test("filling an active goal is refused: a locked contract is changed through proposeChange", () => {
	expect(fillDraft(locked(), { antiGoals: ["x"] }).ok).toBe(false);
});

// Scenario: The Main Copilot proposes a change to a locked Done-check
test("a proposed change leaves the locked check unchanged and waits as pending", () => {
	const before = locked();
	const r = proposeChange(before, { now: LATER, by: "agent", reason: "csv check is flaky", check: { kind: "command", commands: ["make test-unit"] } });
	expect(r.ok).toBe(true);
	const g = r.ok ? r.goal : before;
	expect(g.doneCheck).toEqual(before.doneCheck);
	expect(g.pending).toEqual({ at: "2026-11-01T10:05:00Z", by: "agent", reason: "csv check is flaky", old: { kind: "command", commands: ["make test-unit", "make test-csv"] }, new: { kind: "command", commands: ["make test-unit"] } });
	expect(parseGoal(renderGoal(g))).toEqual(g);
});

test("a change can be proposed only for an active goal", () => {
	expect(proposeChange(draftWithCheck(), { now: LATER, by: "agent", reason: "r", check: { kind: "command", commands: ["x"] } }).ok).toBe(false);
});

test("an empty proposed command check is refused", () => {
	expect(proposeChange(locked(), { now: LATER, by: "agent", reason: "r", check: { kind: "command", commands: [] } }).ok).toBe(false);
});

test("a change without a reason is refused", () => {
	expect(proposeChange(locked(), { now: LATER, by: "agent", reason: "  ", check: { kind: "command", commands: ["x"] } }).ok).toBe(false);
});

// Scenario: ... And an approved change is recorded with who approved it and why
test("approving applies the new check and records who approved it, when, why, old and new", () => {
	const proposed = proposeChange(locked(), { now: LATER, by: "agent", reason: "csv check is flaky", check: { kind: "command", commands: ["make test-unit"] } });
	const g0 = proposed.ok ? proposed.goal : locked();
	const approved = applyApprovedChange(g0, { now: new Date("2026-11-01T11:00:00Z"), outcomeChecks: ["make test-unit"] });
	expect(approved.ok).toBe(true);
	const g = approved.ok ? approved.goal : g0;
	expect(g.doneCheck.commands).toEqual(["make test-unit"]);
	expect(g.doneCheck.lockedAt).toBe("2026-11-01T10:05:00Z");
	expect(g.pending).toBeUndefined();
	expect(g.history.at(-1)).toEqual({
		at: "2026-11-01T11:00:00Z", by: "human", reason: "csv check is flaky",
		old: { kind: "command", commands: ["make test-unit", "make test-csv"] }, new: { kind: "command", commands: ["make test-unit"] },
	});
	expect(parseGoal(renderGoal(g))).toEqual(g);
});

test("approving with nothing pending is refused", () => {
	expect(applyApprovedChange(locked(), { now: LATER }).ok).toBe(false);
});

test("rejecting drops the pending change, keeps the check, and logs the rejection", () => {
	const proposed = proposeChange(locked(), { now: LATER, by: "agent", reason: "weaker", check: { kind: "command", commands: ["true"] } });
	const g0 = proposed.ok ? proposed.goal : locked();
	const r = applyReject(g0, { now: new Date("2026-11-01T11:00:00Z") });
	expect(r.ok && r.goal.pending).toBeUndefined();
	expect(r.ok && r.goal.doneCheck).toEqual(g0.doneCheck);
	expect(r.ok && r.goal.history.at(-1)?.reason).toBe("change rejected: weaker");
});

// Scenario: Closing a goal while its Done-check fails is refused
test("close is refused while the command check fails and names the output as the pointer", () => {
	const d = closeDecision(1, "command");
	expect(d.close).toBe(false);
	expect(!d.close && d.reason).toMatch(/check output/);
});

// Scenario: Closing a goal with a green Done-check records the hand-off
test("close on a green command check is closed_by check; the goal records the time", () => {
	const d = closeDecision(0, "command");
	expect(d).toEqual({ close: true, closedBy: "check" });
	const r = applyClose(locked(), { now: LATER, closedBy: "check" });
	expect(r.ok && r.goal.status).toBe("closed");
	expect(r.ok && r.goal.closedBy).toBe("check");
	expect(r.ok && r.goal.closedAt).toBe("2026-11-01T10:05:00Z");
});

test("a command check that did not run (no exit code) refuses to close", () => {
	expect(closeDecision(undefined, "command").close).toBe(false);
});

// Scenario: A design goal without a command check closes as an assertion
test("a human-confirm check closes as assertion, whatever exit code is passed", () => {
	expect(closeDecision(undefined, "human")).toEqual({ close: true, closedBy: "assertion" });
	expect(closeDecision(1, "human")).toEqual({ close: true, closedBy: "assertion" });
});

test("only an active goal closes", () => {
	expect(applyClose(draftWithCheck(), { now: LATER, closedBy: "check" }).ok).toBe(false);
});

test("drop marks the goal dropped with a history line; a closed goal cannot be dropped", () => {
	const r = dropGoal(locked(), { now: LATER, reason: "branch abandoned" });
	expect(r.ok && r.goal.status).toBe("dropped");
	expect(r.ok && r.goal.history.at(-1)).toEqual({ at: "2026-11-01T10:05:00Z", by: "human", reason: "dropped: branch abandoned" });
	const closed = applyClose(locked(), { now: LATER, closedBy: "check" });
	expect(dropGoal(closed.ok ? closed.goal : locked(), { now: LATER, reason: "x" }).ok).toBe(false);
});

// Contract: one-line reminder in the prompt, only for an active goal
test("the reminder is one line with id and outcome, and only for an active goal", () => {
	expect(reminderLine(locked())).toBe("Goal: g-feat-export Users can export a backlog as CSV; run /goal to refresh");
	expect(reminderLine(draftWithCheck())).toBeUndefined();
	const closed = applyClose(locked(), { now: LATER, closedBy: "check" });
	expect(closed.ok && reminderLine(closed.goal)).toBeUndefined();
	const multi = { ...locked(), outcome: "line one\nline two" };
	expect(reminderLine(multi)).not.toContain("\n");
});

// Scenario: The goal of a merged branch is flagged at session start
test("a deleted or merged branch makes the goal stale; a live unmerged one does not", () => {
	expect(staleGoal(false, true)).toMatch(/deleted/);
	expect(staleGoal(false, false)).toMatch(/deleted/);
	expect(staleGoal(true, true)).toMatch(/merged/);
	expect(staleGoal(true, false)).toBeUndefined();
});

// ---- Outcome Check (ADR-009 Amendment 1) ----

// Scenario: Locking needs an Outcome Check
test("lock refuses a command goal until the human marks an Outcome Check among its commands", () => {
	for (const outcomeChecks of [undefined, [], ["make nonsense"]]) {
		const r = applyLock(draftWithCheck(), { now: LATER, baseCommit: "a1b2c3d", baseExit: 1, outcomeChecks });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.reason).toMatch(/Outcome Check/);
	}
	const ok = applyLock(draftWithCheck(), { now: LATER, baseCommit: "a1b2c3d", baseExit: 1, outcomeChecks: ["make test-csv"] });
	expect(ok.ok && ok.goal.doneCheck.outcomeChecks).toEqual(["make test-csv"]);
});

test("the lock takes the human's marks, not an agent suggestion already on the draft", () => {
	const suggested = fillDraft(draftWithCheck(), { outcomeChecks: ["make test-unit"] });
	const draft = suggested.ok ? suggested.goal : draftWithCheck();
	const r = applyLock(draft, { now: LATER, baseCommit: "a1b2c3d", baseExit: 1, outcomeChecks: ["make test-csv"] });
	expect(r.ok && r.goal.doneCheck.outcomeChecks).toEqual(["make test-csv"]);
	expect(applyLock(draft, { now: LATER, baseCommit: "a1b2c3d", baseExit: 1 }).ok).toBe(false);
});

test("a human-confirm check needs no Outcome Check and keeps none", () => {
	const g = newDraft({ branch: "design/sync", outcome: "Sync design agreed", baseCommit: "b" }, NOW);
	g.doneCheck.kind = "human";
	const r = applyLock(g, { now: LATER, baseCommit: "b", outcomeChecks: ["x"] });
	expect(r.ok && r.goal.doneCheck.outcomeChecks).toEqual([]);
});

test("Outcome Check marks round-trip through the goal file, awkward commands included; an old file without them parses as none", () => {
	const g = locked();
	g.doneCheck.commands = ["make test-unit", `grep -q "a: b" out.csv # header`];
	g.doneCheck.outcomeChecks = [`grep -q "a: b" out.csv # header`];
	const text = renderGoal(g);
	expect(text).toContain("  outcome_checks:\n    - ");
	expect(parseGoal(text)).toEqual(g);
	expect(parseGoal(renderGoal({ ...g, doneCheck: { ...g.doneCheck, outcomeChecks: [] } }))!.doneCheck.outcomeChecks).toEqual([]);
	const old = text.replace(/  outcome_checks:\n    - .*\n/, "");
	expect(old).not.toContain("outcome_checks");
	expect(parseGoal(old)!.doneCheck.outcomeChecks).toEqual([]);
});

test("an agent may suggest an Outcome Check on a draft, only among its commands; replacing the commands drops a stale suggestion", () => {
	const d = draftWithCheck();
	expect(fillDraft(d, { outcomeChecks: ["make test-csv"] })).toMatchObject({ ok: true, goal: { doneCheck: { outcomeChecks: ["make test-csv"] } } });
	expect(fillDraft(d, { outcomeChecks: ["nope"] }).ok).toBe(false);
	const withMark = fillDraft(d, { outcomeChecks: ["make test-csv"] });
	const replaced = fillDraft(withMark.ok ? withMark.goal : d, { doneCheck: { kind: "command", commands: ["make other"] } });
	expect(replaced.ok && replaced.goal.doneCheck.outcomeChecks).toEqual([]);
});

test("a proposed change never carries or alters the Outcome Check marks; approving keeps the marks that still exist", () => {
	const before = locked();
	const proposed = proposeChange(before, { now: LATER, by: "agent", reason: "add", check: { kind: "command", commands: ["make test-csv", "make lint"] } });
	const g0 = proposed.ok ? proposed.goal : before;
	expect(g0.doneCheck.outcomeChecks).toEqual(["make test-csv"]);
	const approved = applyApprovedChange(g0, { now: LATER });
	expect(approved.ok && approved.goal.doneCheck.outcomeChecks).toEqual(["make test-csv"]);
});

test("approving a change that drops every marked command is refused until the human marks one of the new commands", () => {
	const proposed = proposeChange(locked(), { now: LATER, by: "agent", reason: "swap", check: { kind: "command", commands: ["make lint"] } });
	const g0 = proposed.ok ? proposed.goal : locked();
	expect(applyApprovedChange(g0, { now: LATER }).ok).toBe(false);
	expect(applyApprovedChange(g0, { now: LATER, outcomeChecks: ["nope"] }).ok).toBe(false);
	const r = applyApprovedChange(g0, { now: LATER, outcomeChecks: ["make lint"] });
	expect(r.ok && r.goal.doneCheck.outcomeChecks).toEqual(["make lint"]);
});

// ---- Environment failures (ADR-009 Amendment 1) ----

// Scenario: A base failure caused by the environment does not lock by default
test("isEnvironmentFailure: exit 126/127 or a missing-command/module output is environmental, an ordinary failure is not", () => {
	const table: [number | undefined, string, boolean][] = [
		[126, "", true],
		[127, "", true],
		[1, "bash: foo: command not found", true],
		[1, "ModuleNotFoundError: No module named 'x'", true],
		[2, "ImportError: cannot import name y", true],
		[1, "", false],
		[1, "FAILED tests/test_x.py::test_export - assert 1 == 2", false],
		[2, "make: *** [test] Error 1", false],
		[125, "", false],
		[128, "fatal: bad object", false],
		[0, "", false],
		[undefined, "command killed", false],
	];
	for (const [exit, output, expected] of table) expect([exit, output, isEnvironmentFailure(exit, output)]).toEqual([exit, output, expected]);
});
