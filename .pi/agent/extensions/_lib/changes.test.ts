// Black-box tests for changes.sh. Run: bun test ~/.pi/agent/extensions/_lib/changes.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = join(dirname(fileURLToPath(import.meta.url)), "changes.sh");
let repo: string;
const git = (...a: string[]) => spawnSync("git", ["-C", repo, ...a], { encoding: "utf8" });
const changes = (...a: string[]) =>
	spawnSync("bash", [script, "diff", repo, ...a], { encoding: "utf8", env: { ...process.env, CHANGES_PLAIN: "1" } });

beforeEach(() => {
	repo = mkdtempSync(join(tmpdir(), "changes-test-"));
	git("init", "-q");
	git("config", "user.email", "t@t");
	git("config", "user.name", "t");
	git("config", "commit.gpgsign", "false");
	writeFileSync(join(repo, "a.txt"), "one\n");
	git("add", "a.txt");
	git("commit", "-q", "-m", "init");
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

test("reports a clean tree", () => {
	expect(changes().stdout).toContain("No changes since HEAD");
});

test("shows unstaged, staged and untracked changes against HEAD", () => {
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	writeFileSync(join(repo, "staged.txt"), "s\n");
	git("add", "staged.txt");
	writeFileSync(join(repo, "new.txt"), "brand new\n");
	const out = changes().stdout;
	expect(out).toContain("+two");
	expect(out).toContain("staged.txt");
	expect(out).toContain("new.txt");
	expect(out).toContain("+brand new");
});

test("does not touch the real index", () => {
	writeFileSync(join(repo, "new.txt"), "x\n");
	changes();
	expect(git("status", "--porcelain").stdout).toContain("?? new.txt");
});

test("excludes gitignored files", () => {
	writeFileSync(join(repo, ".gitignore"), "secret.txt\n");
	writeFileSync(join(repo, "secret.txt"), "shh\n");
	expect(changes().stdout).not.toContain("shh");
});

test("works in a repo with no commits", () => {
	const fresh = mkdtempSync(join(tmpdir(), "changes-empty-"));
	spawnSync("git", ["-C", fresh, "init", "-q"]);
	writeFileSync(join(fresh, "f.txt"), "hi\n");
	const r = spawnSync("bash", [script, "diff", fresh], { encoding: "utf8", env: { ...process.env, CHANGES_PLAIN: "1" } });
	rmSync(fresh, { recursive: true, force: true });
	expect(r.stdout).toContain("+hi");
});

test("accepts another baseline ref", () => {
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	git("commit", "-qam", "second");
	expect(changes("HEAD").stdout).toContain("No changes");
	expect(changes("HEAD~1").stdout).toContain("+two");
});

// ---- file list / base modes / noise filter ----
const files = (mode: string, noise = "hide", env: Record<string, string> = {}) =>
	spawnSync("bash", [script, "files", repo, mode, noise], { encoding: "utf8", env: { ...process.env, ...env } })
		.stdout.split("\n").filter(Boolean).map((l) => l.split("\t"));

test("files lists status, counts and path for staged, unstaged and untracked", () => {
	writeFileSync(join(repo, "a.txt"), "one\ntwo\nthree\n");
	writeFileSync(join(repo, "new.txt"), "x\ny\n");
	const rows = files("head");
	expect(rows).toContainEqual(["M", "2", "0", "a.txt"]);
	expect(rows).toContainEqual(["A", "2", "0", "new.txt"]);
});

test("files hides tests and generated files, and hidden counts them", () => {
	writeFileSync(join(repo, "src.ts"), "x\n");
	writeFileSync(join(repo, "src.test.ts"), "x\n");
	writeFileSync(join(repo, "package-lock.json"), "{}\n");
	const paths = (n: string) => files("head", n).map((r) => r[3]);
	expect(paths("hide")).toEqual(["src.ts"]);
	expect(paths("show").sort()).toEqual(["package-lock.json", "src.test.ts", "src.ts"]);
	const h = spawnSync("bash", [script, "hidden", repo, "head"], { encoding: "utf8" });
	expect(h.stdout.trim()).toBe("2");
});

test("branch mode compares against the merge-base with the default branch", () => {
	git("branch", "-M", "main");
	git("checkout", "-q", "-b", "feature");
	writeFileSync(join(repo, "f.txt"), "feat\n");
	git("add", "f.txt");
	git("commit", "-qm", "feature work");
	expect(files("head")).toEqual([]);
	expect(files("branch").map((r) => r[3])).toEqual(["f.txt"]);
});

test("session mode compares against CHANGES_SESSION_TREE", () => {
	writeFileSync(join(repo, "before.txt"), "b\n");
	const tree = spawnSync("bash", [join(dirname(script), "since.sh"), "snap", repo], { encoding: "utf8" }).stdout.trim();
	writeFileSync(join(repo, "after.txt"), "a\n");
	const paths = files("session", "hide", { CHANGES_SESSION_TREE: tree }).map((r) => r[3]);
	expect(paths).toEqual(["after.txt"]);
});

test("sig changes when file content changes, and is stable otherwise", () => {
	const sig = () => spawnSync("bash", [script, "sig", repo, "head"], { encoding: "utf8" }).stdout;
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	const s1 = sig();
	expect(sig()).toBe(s1);
	writeFileSync(join(repo, "a.txt"), "one\nTWO\n");
	expect(sig()).not.toBe(s1);
});

test("file renders a single file's diff; cycle-base walks session, head, branch", () => {
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	writeFileSync(join(repo, "b.txt"), "other\n");
	const r = spawnSync("bash", [script, "file", repo, "head", "a.txt"], { encoding: "utf8", env: { ...process.env, CHANGES_PLAIN: "1" } });
	expect(r.stdout).toContain("+two");
	expect(r.stdout).not.toContain("other");
	const state = mkdtempSync(join(tmpdir(), "changes-state-"));
	writeFileSync(join(state, "base"), "head\n");
	const cyc = (env = {}) => {
		spawnSync("bash", [script, "cycle-base", repo, state], { env: { ...process.env, ...env } });
		return spawnSync("cat", [join(state, "base")], { encoding: "utf8" }).stdout.trim();
	};
	expect(cyc()).toBe("branch");
	expect(cyc()).toBe("head");        // no session tree: session is skipped
	writeFileSync(join(state, "base"), "head\n");
	expect(cyc({ CHANGES_SESSION_TREE: "x" })).toBe("branch");
	expect(cyc({ CHANGES_SESSION_TREE: "x" })).toBe("session");
	expect(cyc({ CHANGES_SESSION_TREE: "x" })).toBe("head");
	rmSync(state, { recursive: true, force: true });
});

// ---- cheap signature + result cache (no `git add -A` when nothing changed) ----
import { chmodSync, existsSync, readFileSync, utimesSync } from "node:fs";

const shimGit = () => {
	const dir = mkdtempSync(join(tmpdir(), "changes-shim-"));
	const log = join(dir, "calls.log");
	const real = spawnSync("which", ["git"], { encoding: "utf8" }).stdout.trim();
	writeFileSync(join(dir, "git"), `#!/bin/bash\necho "$*" >>${JSON.stringify(log)}\nexec ${real} "$@"\n`);
	chmodSync(join(dir, "git"), 0o755);
	const adds = () => { try { return readFileSync(log, "utf8").split("\n").filter((l) => /(^| )add( |$)/.test(l)).length; } catch { return 0; } };
	return { dir, adds };
};
const run = (cmd: string, args: string[], env: Record<string, string>) =>
	spawnSync("bash", [script, cmd, repo, ...args], { encoding: "utf8", env: { ...process.env, CHANGES_PLAIN: "1", ...env } }).stdout;

test("sig sees same-size edits made within the same mtime tick", () => {
	const sig = () => run("sig", ["head"], {});
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	const t = new Date(); utimesSync(join(repo, "a.txt"), t, t);
	const s1 = sig();
	writeFileSync(join(repo, "a.txt"), "one\nTWO\n");
	utimesSync(join(repo, "a.txt"), t, t);   // identical size and mtime: only content differs
	expect(sig()).not.toBe(s1);
});

test("sig is cheap: it never builds a temp index", () => {
	const shim = shimGit();
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	run("sig", ["head"], { PATH: `${shim.dir}:${process.env.PATH}` });
	expect(shim.adds()).toBe(0);
	rmSync(shim.dir, { recursive: true, force: true });
});

test("files and file are served from cache while the tree is unchanged", () => {
	const shim = shimGit();
	const cache = mkdtempSync(join(tmpdir(), "changes-cache-"));
	const env = { PATH: `${shim.dir}:${process.env.PATH}`, CHANGES_CACHE: cache };
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	const old = new Date(Date.now() - 60_000); utimesSync(join(repo, "a.txt"), old, old);   // not racy
	const f1 = run("files", ["head", "hide"], env);
	const d1 = run("file", ["head", "a.txt"], env);
	const n = shim.adds();
	expect(n).toBeGreaterThan(0);
	expect(run("files", ["head", "hide"], env)).toBe(f1);
	expect(run("file", ["head", "a.txt"], env)).toBe(d1);
	expect(shim.adds()).toBe(n);   // no further temp-index builds
	writeFileSync(join(repo, "a.txt"), "one\ntwo\nthree\n");
	expect(f1).toContain("M\t1\t0\ta.txt");
	expect(run("files", ["head", "hide"], env)).toContain("M\t2\t0\ta.txt");
	expect(shim.adds()).toBeGreaterThan(n);
	for (const d of [shim.dir, cache]) rmSync(d, { recursive: true, force: true });
});

// ---- foldable tree: file rows with hunk rows beneath expanded files ----
// row = display \t path \t hunk-index (0 = file row)
const tree = (open: string[], env: Record<string, string> = {}) => {
	const state = mkdtempSync(join(tmpdir(), "changes-tree-"));
	writeFileSync(join(state, "open"), open.map((p) => p + "\n").join(""));
	const out = spawnSync("bash", [script, "tree", repo, "head", "hide", state], {
		encoding: "utf8", env: { ...process.env, CHANGES_PLAIN: "1", CHANGES_CACHE: join(state, "c"), ...env },
	}).stdout;
	rmSync(state, { recursive: true, force: true });
	return out.split("\n").filter(Boolean).map((l) => l.split("\t"));
};
const manyLines = (n: number, tweak: Record<number, string> = {}) =>
	Array.from({ length: n }, (_, i) => tweak[i + 1] ?? `line${i + 1}`).join("\n") + "\n";

test("tree: collapsed files are one row each, marked as folded", () => {
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	writeFileSync(join(repo, "new.txt"), "x\n");
	const rows = tree([]);
	expect(rows.map((r) => r.slice(1))).toEqual([["a.txt", "0"], ["new.txt", "0"]]);
	expect(rows[0][0]).toContain("▸");
});

test("tree: an expanded file lists one row per hunk with its first line number", () => {
	writeFileSync(join(repo, "big.txt"), manyLines(40));
	git("add", "big.txt"); git("commit", "-qm", "big");
	writeFileSync(join(repo, "big.txt"), manyLines(40, { 2: "TWO", 38: "THIRTY-EIGHT" }));
	const rows = tree(["big.txt"]);
	expect(rows[0][0]).toContain("▾");
	expect(rows.slice(1).map((r) => r.slice(1))).toEqual([["big.txt", "1"], ["big.txt", "2"]]);
	expect(rows[1][0]).toMatch(/@@ L1\b/);
	expect(rows[2][0]).toMatch(/@@ L3[5-9]\b/);
});

test("tree: files stay folded unless listed in the open set", () => {
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	writeFileSync(join(repo, "b.txt"), "b\n");
	const rows = tree(["b.txt"]);
	expect(rows.map((r) => r.slice(1, 3).join(":"))).toEqual(["a.txt:0", "b.txt:0", "b.txt:1"]);
});

test("tree: recently modified files get a ● marker, old ones do not", () => {
	writeFileSync(join(repo, "fresh.txt"), "f\n");
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	const old = new Date(Date.now() - 3600_000); utimesSync(join(repo, "a.txt"), old, old);
	const rows = tree([]);
	expect(rows.find((r) => r[1] === "fresh.txt")![0]).toContain("●");
	expect(rows.find((r) => r[1] === "a.txt")![0]).not.toContain("●");
});

test("hunk renders only the requested hunk", () => {
	writeFileSync(join(repo, "big.txt"), manyLines(40));
	git("add", "big.txt"); git("commit", "-qm", "big");
	writeFileSync(join(repo, "big.txt"), manyLines(40, { 2: "TWO", 38: "THIRTY-EIGHT" }));
	const h = (n: string) => spawnSync("bash", [script, "hunk", repo, "head", "big.txt", n], {
		encoding: "utf8", env: { ...process.env, CHANGES_PLAIN: "1" } }).stdout;
	expect(h("1")).toContain("+TWO");
	expect(h("1")).not.toContain("THIRTY-EIGHT");
	expect(h("2")).toContain("+THIRTY-EIGHT");
	expect(h("2")).not.toContain("+TWO");
});

test("toggle-open folds and unfolds one file, open-all/close-all set them en masse", () => {
	writeFileSync(join(repo, "a.txt"), "one\ntwo\n");
	writeFileSync(join(repo, "b.txt"), "b\n");
	const state = mkdtempSync(join(tmpdir(), "changes-open-"));
	const sh = (...a: string[]) => spawnSync("bash", [script, ...a], { encoding: "utf8", env: { ...process.env, CHANGES_CACHE: join(state, "c") } });
	const open = () => (existsSync(join(state, "open")) ? readFileSync(join(state, "open"), "utf8").split("\n").filter(Boolean).sort() : []);
	sh("toggle-open", repo, state, "a.txt");
	expect(open()).toEqual(["a.txt"]);
	sh("toggle-open", repo, state, "a.txt");
	expect(open()).toEqual([]);
	sh("open-all", repo, state);
	expect(open()).toEqual(["a.txt", "b.txt"]);
	sh("close-all", repo, state);
	expect(open()).toEqual([]);
	rmSync(state, { recursive: true, force: true });
});
