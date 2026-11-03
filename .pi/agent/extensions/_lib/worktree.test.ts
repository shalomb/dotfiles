// Run: bun test ~/.pi/agent/extensions/_lib/worktree.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { execFileSync, execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBrief, dirNameFor, findWorktree, parseWorktreeArgs, setupWorktree, type Exec } from "./worktree";

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
	expect(parseWorktreeArgs("just text")).toMatchObject({ target: "just", text: "text" });
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

test("parseWorktreeArgs: first word without --branch is a candidate worktree target", () => {
	expect(parseWorktreeArgs(".worktrees/iacre-console/")).toEqual({ back: false, target: ".worktrees/iacre-console/", text: "" });
	expect(parseWorktreeArgs("feat/x fix the bug")).toMatchObject({ target: "feat/x", text: "fix the bug" });
	expect(parseWorktreeArgs("--branch feat/x go").target).toBeUndefined();
});

test("findWorktree: matches by relative path (trailing slash), absolute path, dir name and branch", async () => {
	const r = await setupWorktree(exec, root, { branch: "feat/x" });
	if (!r.ok) throw new Error(r.error);
	for (const t of [".worktrees/feat-x/", ".worktrees/feat-x", r.dir, "feat-x", "feat/x"]) {
		const f = await findWorktree(exec, root, t);
		expect(f).toEqual({ ok: true, dir: r.dir, branch: "feat/x" });
	}
	// also from inside another worktree, relative to the common root
	expect(await findWorktree(exec, r.dir, ".worktrees/feat-x/")).toMatchObject({ ok: true, dir: r.dir });
});

test("findWorktree: unknown target lists the known worktrees", async () => {
	await setupWorktree(exec, root, { branch: "feat/x" });
	const f = await findWorktree(exec, root, "nope");
	expect(f.ok).toBe(false);
	if (!f.ok) expect(f.error).toContain("feat/x");
});

import { searchCandidates } from "./worktree";

test("parseWorktreeArgs: switch/find take free-text instructions", () => {
	expect(parseWorktreeArgs("switch the auth fix")).toMatchObject({ search: true, text: "the auth fix" });
	expect(parseWorktreeArgs("find login").search).toBe(true);
	expect(parseWorktreeArgs("find").error).toMatch(/usage/);
});

test("searchCandidates: ranks worktrees, branches and PRs; collapses by branch", async () => {
	const exec: any = async (cmd: string, a: string[]) => {
		if (cmd === "gh") return { code: 0, stderr: "", stdout: JSON.stringify([{ number: 7, title: "Fix login bug", headRefName: "fix/login" }]) };
		if (a[0] === "worktree") return { code: 0, stderr: "", stdout: "worktree /r\\nbranch refs/heads/main\\n\\nworktree /r/.worktrees/fix-login\\nbranch refs/heads/fix/login\\n".replace(/\\n/g, "\n") };
		return { code: 0, stderr: "", stdout: "main\nfix/login\nfeat/other\n" };
	};
	const r: any = await searchCandidates(exec, "/r", "login fix");
	expect(r).toHaveLength(1);
	expect(r[0]).toMatchObject({ kind: "worktree", dir: "/r/.worktrees/fix-login" });
	expect(await searchCandidates(exec, "/r", "zzz")).toEqual([]);
});
