// Run: bun test ~/.pi/agent/extensions/_lib/goal.test.ts
// Scenario names refer to docs/specs/agentic-coding/features/goal-contract.feature.
import { expect, test } from "bun:test";
import { branchSlug, goalPath, goalsDir, newDraft, parseGoal, renderGoal, storeDir, validateGoal } from "./goal.ts";

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
