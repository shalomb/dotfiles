// Run: bun test ~/.pi/agent/extensions/_lib/worktree.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { execFileSync, execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBrief, dirNameFor, parseWorktreeArgs, setupWorktree, type Exec } from "./worktree";

const exec: Exec = (cmd, args, o) =>
	new Promise((res) => execFile(cmd, args, { cwd: o?.cwd }, (e: any, stdout, stderr) => res({ code: e ? (e.code ?? 1) : 0, stdout, stderr })));

let root: string;
const git = (...a: string[]) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8" }).trim();
beforeEach(() => {
	root = realpathSync(mkdtempSync(join(tmpdir(), "wt-")));
	execFileSync("git", ["init", "-q", "-b", "main", root]);
	git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "chore: init");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("parseWorktreeArgs: flags, text, back", () => {
	expect(parseWorktreeArgs('--branch feat/x fix the "login page"')).toEqual({ back: false, branch: "feat/x", base: undefined, text: 'fix the login page' });
	expect(parseWorktreeArgs("--base v1.2 --branch a/b go")).toMatchObject({ base: "v1.2", branch: "a/b", text: "go" });
	expect(parseWorktreeArgs("back")).toMatchObject({ back: true });
	expect(parseWorktreeArgs("--branch")).toMatchObject({ error: expect.stringContaining("--branch") });
	expect(parseWorktreeArgs("just text")).toMatchObject({ error: expect.stringContaining("--branch") });
	expect(parseWorktreeArgs("")).toMatchObject({ error: expect.any(String) });
});

test("dirNameFor replaces slashes", () => {
	expect(dirNameFor("feat/central-mode")).toBe("feat-central-mode");
});

test("setupWorktree: makes worktree under .worktrees, excludes it, returns facts", async () => {
	const r = await setupWorktree(exec, root, { branch: "feat/x" });
	expect(r.ok).toBe(true);
	if (!r.ok) return;
	expect(r.dir).toBe(join(root, ".worktrees", "feat-x"));
	expect(existsSync(r.dir)).toBe(true);
	expect(git("-C", r.dir, "branch", "--show-current")).toBe("feat/x");
	expect(readFileSync(join(root, ".git", "info", "exclude"), "utf8")).toContain(".worktrees/");
	expect(git("status", "--short")).toBe(""); // worktree dir not shown as untracked
	expect(r.base).toBe("HEAD");
});

test("setupWorktree: --base is honoured and dirty origin is reported in status", async () => {
	git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "chore: two");
	const first = git("rev-parse", "HEAD~1");
	writeFileSync(join(root, "notes.txt"), "x");
	const r = await setupWorktree(exec, root, { branch: "fix/y", base: first });
	expect(r.ok).toBe(true);
	if (!r.ok) return;
	expect(git("-C", r.dir, "rev-parse", "HEAD")).toBe(first);
	expect(r.status).toContain("notes.txt");
});

test("setupWorktree: not a git repo and git failure give ok:false with a message", async () => {
	const plain = realpathSync(mkdtempSync(join(tmpdir(), "plain-")));
	try {
		const a = await setupWorktree(exec, plain, { branch: "feat/x" });
		expect(a).toMatchObject({ ok: false, error: expect.stringContaining("git") });
	} finally { rmSync(plain, { recursive: true, force: true }); }
	await setupWorktree(exec, root, { branch: "feat/x" });
	const dup = await setupWorktree(exec, root, { branch: "feat/x" });
	expect(dup).toMatchObject({ ok: false });
});

test("buildBrief holds the contract fields", () => {
	const b = buildBrief({ origin: "/o", base: "HEAD", branch: "feat/x", parentSession: "/s/p.jsonl", status: " M a.ts", text: "do it" });
	for (const needle of ["/o", "HEAD", "feat/x", "/s/p.jsonl", "M a.ts", "do it", "baseline"]) expect(b).toContain(needle);
	expect(buildBrief({ origin: "/o", base: "HEAD", branch: "b", status: "", text: "t" })).toContain("clean");
});
