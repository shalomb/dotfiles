// Run: bun test ~/.pi/agent/extensions/_lib/goal-io.test.ts
// Real git and the real filesystem, in temp directories. The store is injected; ~/.cache is never touched.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newDraft } from "./goal.ts";
import { agentWouldWriteGoalStore, branchState, appendGoalEvent, goalRefName, isGoalStorePath, listGoals, loadGoal, loadGoalFile, readRecordedHash, recordCheckHash, resolveRepo, runChecks, runChecksAtCommit, saveGoal, type Exec } from "./goal-io.ts";

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

test("loadGoal throws for an existing file it cannot parse instead of reporting no goal", () => {
	mkdirSync(join(store, "goals"), { recursive: true });
	writeFileSync(join(store, "goals", "feat-x.md"), "garbage, not a goal\n");
	expect(() => loadGoal(store, "feat/x")).toThrow(/cannot be parsed/);
});

test("branches whose names share a slug (feat/x and feat-x) do not see each other's goal", () => {
	const g = newDraft({ branch: "feat/x", outcome: "o", baseCommit: "abc" }, new Date("2026-11-01T10:00:00Z"));
	saveGoal(store, g);
	expect(loadGoal(store, "feat-x")).toBeUndefined();
	expect(loadGoalFile(store, "feat-x")?.branch).toBe("feat/x");
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

test("runChecks: an empty command list is never green", async () => {
	const r = await runChecks(exec, [], root);
	expect(r.exit).toBeUndefined();
	expect(r.output).toMatch(/no commands/i);
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

test("a failed `worktree add` leaves no temp directory behind", async () => {
	const tmp = realpathSync(mkdtempSync(join(tmpdir(), "goal-tmp-")));
	try {
		const failAdd: Exec = (cmd, args, o) => (args.includes("add") ? Promise.resolve({ code: 128, stdout: "", stderr: "boom" }) : exec(cmd, args, o));
		const r = await runChecksAtCommit(failAdd, root, "HEAD", ["true"], tmp);
		expect(r.exit).toBeUndefined();
		expect(readdirSync(tmp)).toEqual([]);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("when `worktree remove` fails or throws, the temp worktree is still pruned and removed, and the check result is kept", async () => {
	for (const mode of ["code", "throw"]) {
		const tmp = realpathSync(mkdtempSync(join(tmpdir(), "goal-tmp-")));
		try {
			const calls: string[] = [];
			const badRemove: Exec = async (cmd, args, o) => {
				calls.push(args.join(" "));
				if (args.includes("remove")) {
					if (mode === "throw") throw new Error("spawn failed");
					return { code: 1, stdout: "", stderr: "locked" };
				}
				return exec(cmd, args, o);
			};
			const r = await runChecksAtCommit(badRemove, root, "HEAD", ["exit 7"], tmp);
			expect(r.exit).toBe(7);
			expect(readdirSync(tmp)).toEqual([]);
			expect(calls.some((c) => c.includes("worktree prune"))).toBe(true);
			expect(git("worktree", "list", "--porcelain").match(/^worktree /gm)?.length).toBe(1);
		} finally {
			rmSync(tmp, { recursive: true, force: true });
		}
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

// ---- Tamper evidence (ADR-010) ----

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const status = () => git("status", "--porcelain=v1", "--untracked-files=all");

test("goalRefName is refs/goals/<branch-slug>", () => {
	expect(goalRefName("feat/export")).toBe("refs/goals/feat-export");
});

test("no ref yet reads as none", async () => {
	expect(await readRecordedHash(exec, root, "feat/export")).toEqual({ kind: "none" });
});

test("recordCheckHash commits check.sha256 to the private ref, leaving the working tree, index and branches untouched", async () => {
	const head = git("rev-parse", "HEAD");
	const index = git("ls-files", "--stage");
	expect(await recordCheckHash(exec, root, "feat/export", HASH_A, "lock g-feat-export")).toEqual({ ok: true });
	expect(await readRecordedHash(exec, root, "feat/export")).toEqual({ kind: "hash", hash: HASH_A });
	expect(git("show", "refs/goals/feat-export:check.sha256")).toBe(HASH_A);
	expect(git("log", "-1", "--format=%s", "refs/goals/feat-export")).toBe("lock g-feat-export");
	expect(git("ls-tree", "--name-only", "refs/goals/feat-export")).toBe("check.sha256");
	expect(status()).toBe("");
	expect(git("rev-parse", "HEAD")).toBe(head);
	expect(git("ls-files", "--stage")).toBe(index);
	expect(git("for-each-ref", "--format=%(refname)")).toBe("refs/goals/feat-export\nrefs/heads/main");
});

test("each record adds a commit on top of the last, and the tip's hash is the one that counts", async () => {
	await recordCheckHash(exec, root, "feat/export", HASH_A, "lock g-feat-export");
	await recordCheckHash(exec, root, "feat/export", HASH_B, "approve g-feat-export: stricter");
	expect(await readRecordedHash(exec, root, "feat/export")).toEqual({ kind: "hash", hash: HASH_B });
	expect(git("log", "--format=%s", "refs/goals/feat-export")).toBe("approve g-feat-export: stricter\nlock g-feat-export");
});

test("the ref lives in the common git dir: written from a linked worktree, read from the main checkout (and the other way round)", async () => {
	git("switch", "-q", "-c", "feat/export");
	const linked = join(root, ".worktrees", "other");
	git("worktree", "add", "-q", "-b", "feat/other", linked);
	expect(await recordCheckHash(exec, linked, "feat/export", HASH_A, "lock g-feat-export")).toEqual({ ok: true });
	expect(await readRecordedHash(exec, root, "feat/export")).toEqual({ kind: "hash", hash: HASH_A });
	expect(git("rev-parse", "--verify", "refs/goals/feat-export")).toMatch(/^[0-9a-f]{40}$/);
	await recordCheckHash(exec, root, "feat/export", HASH_B, "approve g-feat-export: x");
	expect(await readRecordedHash(exec, linked, "feat/export")).toEqual({ kind: "hash", hash: HASH_B });
	expect(execFileSync("git", ["-C", linked, "status", "--porcelain"], { encoding: "utf8" })).toBe("");
});

test("a ref whose tip lacks check.sha256 reads as an error, not as none", async () => {
	git("update-ref", "refs/goals/feat-export", git("rev-parse", "HEAD"));
	const r = await readRecordedHash(exec, root, "feat/export");
	expect(r.kind).toBe("error");
});

test("recordCheckHash reports a git failure instead of throwing", async () => {
	const r = await recordCheckHash(exec, join(root, "no-such-dir"), "feat/export", HASH_A, "lock x");
	expect(r.ok).toBe(false);
});

test("the agent guard blocks any command or path that names refs/goals/", () => {
	for (const command of [
		"git update-ref refs/goals/feat-export HEAD",
		"git update-ref -d refs/goals/feat-export",
		"git log refs/goals/feat-export",
		"echo abc > .git/refs/goals/feat-export",
		"git push origin :refs/goals/x",
	]) expect([command, agentWouldWriteGoalStore("bash", { command })]).toEqual([command, true]);
	expect(agentWouldWriteGoalStore("write", { path: "/repo/.git/refs/goals/feat-export" })).toBe(true);
	expect(agentWouldWriteGoalStore("edit", { path: "/repo/.git/refs/goals/feat-export" })).toBe(true);
	expect(agentWouldWriteGoalStore("bash", { command: "git log --oneline" })).toBe(false);
	expect(agentWouldWriteGoalStore("bash", { command: "git update-ref refs/heads/x HEAD" })).toBe(false);
	expect(agentWouldWriteGoalStore("read", { path: "/repo/.git/refs/goals/feat-export" })).toBe(false);
});

// ---- Events (ADR-009 Amendment 1) ----

test("appendGoalEvent appends one JSON line per event to <store>/trajectories.jsonl, creating the store if needed", () => {
	const nested = join(store, "not", "yet");
	appendGoalEvent(nested, { at: "2026-11-01T10:00:00Z", event: "goal_locked", goal: "g-feat-export", branch: "feat/export", checkHash: HASH_A });
	appendGoalEvent(nested, { at: "2026-11-01T11:00:00Z", event: "goal_dropped", goal: "g-feat-export", branch: "feat/export", reason: "multi\nline" });
	const lines = readFileSync(join(nested, "trajectories.jsonl"), "utf8").split("\n");
	expect(lines).toHaveLength(3);
	expect(lines[2]).toBe("");
	expect(JSON.parse(lines[0])).toEqual({ at: "2026-11-01T10:00:00Z", event: "goal_locked", goal: "g-feat-export", branch: "feat/export", checkHash: HASH_A });
	expect(JSON.parse(lines[1]).reason).toBe("multi\nline");
});
