// Run: bun test ~/.pi/agent/extensions/_lib/drive-gate-io.test.ts
// driveGate against a real git repo in a temp dir: diff from git, scenario at base and head, event logged.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Exec } from "./goal-io.ts";
import { driveGate } from "./drive-gate-io.ts";

const exec: Exec = (cmd, args, o) =>
	new Promise((res) => execFile(cmd, args, { cwd: o?.cwd, timeout: o?.timeout }, (e: any, stdout, stderr) => res({ code: e ? (typeof e.code === "number" ? e.code : 1) : 0, stdout, stderr })));

let root: string;
let store: string;
let tmp: string;

const git = (...a: string[]) => execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).trim();
const commit = (files: Record<string, string>) => {
	for (const [n, c] of Object.entries(files)) {
		mkdirSync(dirname(join(root, n)), { recursive: true });
		writeFileSync(join(root, n), c);
	}
	git("add", "-A");
	git("commit", "-q", "-m", "c");
	return git("rev-parse", "HEAD");
};
const run = (base: string, head: string, o: Partial<Parameters<typeof driveGate>[1]> = {}) =>
	driveGate(
		{ exec, root, store, tmpParent: tmp, now: () => new Date("2026-11-01T10:00:00Z") },
		{ goal: "g-x", branch: "feat/x", task: "t1", taskKind: "behaviour", base, head, scope: ["out.txt"], scenario: ["test -f out.txt"], ...o },
	);
const events = (): any[] => {
	try { return readFileSync(join(store, "trajectories.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; }
};

beforeEach(() => {
	root = realpathSync(mkdtempSync(join(tmpdir(), "dgio-root-")));
	store = mkdtempSync(join(tmpdir(), "dgio-store-"));
	tmp = mkdtempSync(join(tmpdir(), "dgio-tmp-"));
	git("init", "-q", "-b", "main");
});
afterEach(() => { for (const d of [root, store, tmp]) rmSync(d, { recursive: true, force: true }); });

test("behaviour: red at base, green at head, in scope -> pass, no verifier, one event logged", async () => {
	const base = commit({ "a.txt": "a\n" });
	const head = commit({ "out.txt": "x\n" });
	const r = await run(base, head);
	expect(r.verdict).toBe("pass");
	expect(r.verifier).toBe(false);
	expect(r.task).toBe("t1");
	const ev = events();
	expect(ev).toHaveLength(1);
	expect(ev[0]).toMatchObject({ event: "drive_gate", goal: "g-x", branch: "feat/x", task: "t1", base, head, verdict: "pass", verifier: false });
	expect(ev[0].checks).toContain("G1 pass");
});

test("a feature file edited alongside the work -> reject G2", async () => {
	const base = commit({ "a.txt": "a\n" });
	const head = commit({ "out.txt": "x\n", "features/x.feature": "Feature: x\n" });
	const r = await run(base, head, { scope: ["out.txt", "features/"] });
	expect(r.verdict).toBe("reject");
	expect(r.checks.find((c) => c.id === "G2")?.level).toBe("reject");
});

test("refactor whose scenario is red at base -> reject G1", async () => {
	const base = commit({ "a.txt": "a\n" });
	const head = commit({ "out.txt": "x\n" });
	const r = await run(base, head, { taskKind: "refactor" });
	expect(r.verdict).toBe("reject");
	expect(r.checks.find((c) => c.id === "G1")?.level).toBe("reject");
});

test("a change under drivers/ -> the Verifier must run", async () => {
	const base = commit({ "a.txt": "a\n" });
	const head = commit({ "out.txt": "x\n", "drivers/d.ts": "export {}\n" });
	const r = await run(base, head, { scope: ["out.txt", "drivers/"] });
	expect(r.verifier).toBe(true);
	expect(r.verifierReasons).toContain("driver/DSL change");
});

test("behaviour task with no scenario commands -> reject G1 as not run", async () => {
	const base = commit({ "a.txt": "a\n" });
	const head = commit({ "out.txt": "x\n" });
	const r = await run(base, head, { scenario: [] });
	expect(r.verdict).toBe("reject");
	expect(r.checks.find((c) => c.id === "G1")?.reason).toContain("not run");
});

test("an unwritable store does not stop the verdict", async () => {
	const base = commit({ "a.txt": "a\n" });
	const head = commit({ "out.txt": "x\n" });
	writeFileSync(join(store, "blocked"), "");
	const r = await driveGate(
		{ exec, root, store: join(store, "blocked", "sub"), tmpParent: tmp, now: () => new Date() },
		{ goal: "g", branch: "b", task: "t", taskKind: "behaviour", base, head, scope: ["out.txt"], scenario: ["test -f out.txt"] },
	);
	expect(r.verdict).toBe("pass");
});
