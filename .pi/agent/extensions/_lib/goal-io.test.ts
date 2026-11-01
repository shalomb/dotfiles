// Run: bun test ~/.pi/agent/extensions/_lib/goal-io.test.ts
// Real git and the real filesystem, in temp directories. The store is injected; ~/.cache is never touched.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDraft } from "./goal.ts";
import { agentWouldWriteGoalStore, branchState, isGoalStorePath, listGoals, loadGoal, resolveRepo, runChecks, runChecksAtCommit, saveGoal, type Exec } from "./goal-io.ts";

const exec: Exec = (cmd, args, o) =>
	new Promise((res) => execFile(cmd, args, { cwd: o?.cwd, timeout: o?.timeout }, (e: any, stdout, stderr) => res({ code: e ? (typeof e.code === "number" ? e.code : 1) : 0, stdout, stderr })));

let root: string;
let store: string;
const git = (...a: string[]) => execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();
const commitFile = (name: string, body: string) => {
	writeFileSync(join(root, name), body);
	git("add", name);
	git("commit", "-q", "-m", `add ${name}`);
	return git("rev-parse", "--short", "HEAD");
};

beforeEach(() => {
	root = realpathSync(mkdtempSync(join(tmpdir(), "goal-repo-")));
	store = realpathSync(mkdtempSync(join(tmpdir(), "goal-store-")));
	execFileSync("git", ["init", "-q", "-b", "main", root]);
	commitFile("a.txt", "one\n");
});
afterEach(() => {
	rmSync(root, { recursive: true, force: true });
	rmSync(store, { recursive: true, force: true });
});

test("a saved goal loads back; a missing goal loads as undefined", () => {
	expect(loadGoal(store, "feat/x")).toBeUndefined();
	const g = newDraft({ branch: "feat/x", outcome: "o", baseCommit: "abc" }, new Date("2026-11-01T10:00:00Z"));
	saveGoal(store, g);
	expect(existsSync(join(store, "goals", "feat-x.md"))).toBe(true);
	expect(loadGoal(store, "feat/x")).toEqual(g);
});

test("saving refuses a goal with no outcome and writes nothing", () => {
	const g = newDraft({ branch: "feat/x", outcome: "o", baseCommit: "abc" }, new Date());
	expect(() => saveGoal(store, { ...g, outcome: "" })).toThrow(/outcome/);
	expect(loadGoal(store, "feat/x")).toBeUndefined();
});

test("runChecks: all commands green gives exit 0; the first failing command gives its exit and output", async () => {
	expect((await runChecks(exec, ["true", "echo hi"], root)).exit).toBe(0);
	const r = await runChecks(exec, ["echo before", "echo boom >&2; exit 3", "echo never"], root);
	expect(r.exit).toBe(3);
	expect(r.output).toContain("boom");
	expect(r.output).not.toContain("never");
});

// Scenario: A Done-check that fails on the base commit is locked / one that passes is refused
test("runChecksAtCommit runs the check in a detached worktree at that commit, then removes it", async () => {
	const base = git("rev-parse", "--short", "HEAD");
	commitFile("export.csv", "x\n"); // the work: the check passes at HEAD but not at base
	const tmp = realpathSync(mkdtempSync(join(tmpdir(), "goal-tmp-")));
	try {
		const atBase = await runChecksAtCommit(exec, root, base, ["test -f export.csv"], tmp);
		expect(atBase.exit).not.toBe(0);
		const atHead = await runChecksAtCommit(exec, root, "HEAD", ["test -f export.csv"], tmp);
		expect(atHead.exit).toBe(0);
		expect(git("worktree", "list", "--porcelain").match(/^worktree /gm)?.length).toBe(1);
		expect(readdirSync(tmp)).toEqual([]);
		expect(git("status", "--short")).toBe("");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("the temporary worktree is removed even when the check fails", async () => {
	const tmp = realpathSync(mkdtempSync(join(tmpdir(), "goal-tmp-")));
	try {
		const r = await runChecksAtCommit(exec, root, "HEAD", ["exit 1"], tmp);
		expect(r.exit).toBe(1);
		expect(git("worktree", "list", "--porcelain").match(/^worktree /gm)?.length).toBe(1);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("an unknown commit gives no exit code, so it can never count as 'failed on base'", async () => {
	const tmp = realpathSync(mkdtempSync(join(tmpdir(), "goal-tmp-")));
	try {
		const r = await runChecksAtCommit(exec, root, "deadbeefdeadbeef", ["exit 1"], tmp);
		expect(r.exit).toBeUndefined();
		expect(r.output).toMatch(/worktree/i);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

// Scenario: The goal of a merged branch is flagged at session start
test("branchState: live unmerged, merged, and deleted branches", async () => {
	const base = git("rev-parse", "--short", "HEAD");
	git("switch", "-q", "-c", "feat/export");
	expect(await branchState(exec, root, "feat/export", base)).toEqual({ exists: true, merged: false }); // no work yet: tip == base
	commitFile("export.csv", "x\n");
	expect(await branchState(exec, root, "feat/export", base)).toEqual({ exists: true, merged: false });
	git("switch", "-q", "main");
	git("merge", "-q", "--no-ff", "-m", "merge", "feat/export");
	expect(await branchState(exec, root, "feat/export", base)).toEqual({ exists: true, merged: true });
	git("branch", "-q", "-d", "feat/export");
	expect((await branchState(exec, root, "feat/export", base)).exists).toBe(false);
});

// Rule: the agent can reach the goal store only through goal_propose
test("isGoalStorePath flags writes under any goals dir of the todo store, not other paths", () => {
	expect(isGoalStorePath("/home/u/.cache/agent-skills/todos/r-app/goals/feat-x.md")).toBe(true);
	expect(isGoalStorePath("/home/u/.cache/agent-skills/todos/r-app/TODO.md")).toBe(false);
	expect(isGoalStorePath("/repo/goals/x.md")).toBe(false);
});

test("agentWouldWriteGoalStore blocks write/edit into the goals store and shell writes to it, but not reads", () => {
	const dir = "/home/u/.cache/agent-skills/todos/r-app/goals/feat-x.md";
	expect(agentWouldWriteGoalStore("write", { path: dir })).toBe(true);
	expect(agentWouldWriteGoalStore("edit", { path: dir })).toBe(true);
	expect(agentWouldWriteGoalStore("write", { path: "/repo/src/a.ts" })).toBe(false);
	expect(agentWouldWriteGoalStore("bash", { command: `sed -i s/draft/active/ ${dir}` })).toBe(true);
	expect(agentWouldWriteGoalStore("bash", { command: `echo x > ~/.cache/agent-skills/todos/r-app/goals/feat-x.md` })).toBe(true);
	expect(agentWouldWriteGoalStore("bash", { command: `cat ${dir}` })).toBe(false);
	expect(agentWouldWriteGoalStore("bash", { command: "ls src" })).toBe(false);
	expect(agentWouldWriteGoalStore("read", { path: dir })).toBe(false);
});

// Contract section 1: all linked worktrees of one repo share one store.
test("resolveRepo gives the same store from the main checkout and a linked worktree, and reports branch and head", async () => {
	git("switch", "-q", "-c", "feat/export");
	const linked = join(root, ".worktrees", "other");
	git("worktree", "add", "-q", "-b", "feat/other", linked);
	const env = { XDG_CACHE_HOME: store };
	const a = await resolveRepo(exec, root, env, "/nohome");
	const b = await resolveRepo(exec, linked, env, "/nohome");
	expect(a && b && a.store).toBe(b!.store);
	expect(a!.store.startsWith(store)).toBe(true);
	expect(a).toMatchObject({ root, branch: "feat/export", head: git("rev-parse", "--short", "HEAD") });
	expect(b).toMatchObject({ root: linked, branch: "feat/other" });
});

test("resolveRepo: detached HEAD has no branch; a non-git directory is undefined", async () => {
	git("checkout", "-q", "--detach");
	expect((await resolveRepo(exec, root, { XDG_CACHE_HOME: store }, "/nohome"))?.branch).toBeUndefined();
	const plain = realpathSync(mkdtempSync(join(tmpdir(), "goal-plain-")));
	try {
		expect(await resolveRepo(exec, plain, { XDG_CACHE_HOME: store }, "/nohome")).toBeUndefined();
	} finally {
		rmSync(plain, { recursive: true, force: true });
	}
});

test("listGoals returns every goal of the store whatever its branch, and skips files that are not goals", () => {
	expect(listGoals(store)).toEqual([]);
	const a = newDraft({ branch: "feat/a", outcome: "a", baseCommit: "1" }, new Date("2026-11-01T10:00:00Z"));
	const b = newDraft({ branch: "feat/b", outcome: "b", baseCommit: "2" }, new Date("2026-11-01T10:00:00Z"));
	saveGoal(store, a);
	saveGoal(store, b);
	writeFileSync(join(store, "goals", "notes.md"), "# not a goal\n");
	expect(listGoals(store).map((g) => g.id).sort()).toEqual(["g-feat-a", "g-feat-b"]);
});
