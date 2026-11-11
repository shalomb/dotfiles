// Run: bun test .pi/agent/extensions/_lib/locate.test.ts
import { describe, expect, it } from "bun:test";
import { parseLocateQuery } from "./locate.ts";

describe("parseLocateQuery", () => {
	it("parses the conversational BDD query with trailing connector", () => {
		const q = parseLocateQuery("find +blank +template and look for workspace name within");
		expect(q.pathTerms).toEqual(["blank", "template"]);
		expect(q.connector).toBe("within");
		expect(q.contentTerms).toEqual(["workspace", "name"]);
		expect(q.mandatory).toEqual(["blank", "template"]);
	});

	it("splits path and content on a mid-sentence connector", () => {
		const q = parseLocateQuery("template in title");
		expect(q.pathTerms).toEqual(["template"]);
		expect(q.connector).toBe("in");
		expect(q.contentTerms).toEqual(["title"]);
	});

	it("treats everything as path terms without a connector", () => {
		const q = parseLocateQuery("blank template");
		expect(q.pathTerms).toEqual(["blank", "template"]);
		expect(q.connector).toBeUndefined();
		expect(q.contentTerms).toEqual([]);
	});

	it("keeps quoted phrases whole", () => {
		const q = parseLocateQuery('"blank workspace" containing foo');
		expect(q.pathTerms).toEqual(["blank workspace"]);
		expect(q.contentTerms).toEqual(["foo"]);
	});

	it("handles empty input", () => {
		expect(parseLocateQuery("  ").pathTerms).toEqual([]);
	});
});

import { classifyZone, isNoise, scoreCandidate, rankCandidates, collapseToAnchors, formatReceipt, ZONE_WEIGHTS } from "./locate.ts";

describe("zones and noise", () => {
	const env = { cwd: "/h/p/repo/sub", repoRoot: "/h/p/repo", parent: "/h/p", home: "/h" };
	it("classifies zones with spec weights", () => {
		expect(classifyZone("/h/p/repo/sub/a.md", env)).toBe(0);
		expect(classifyZone("/h/p/repo/other/a.md", env)).toBe(1);
		expect(classifyZone("/h/p/iac/x.tf", env)).toBe(2);
		expect(classifyZone("/h/notes/x", env)).toBe(3);
		expect(classifyZone("/etc/x", env)).toBe(4);
		expect([0, 1, 2, 3, 4].map((z) => ZONE_WEIGHTS[z])).toEqual([1, 0.9, 0.75, 0.5, 0.25]);
	});
	it("masks noise", () => {
		for (const p of ["/a/.git/x", "/a/node_modules/x", "/h/.cache/x", "/h/.claude/x", "/h/.gemini/x", "/a/dist/x", "/a/target/x"])
			expect(isNoise(p, "/h")).toBe(true);
		expect(isNoise("/h/p/repo/a.md", "/h")).toBe(false);
	});
});

describe("ranking", () => {
	const env = { cwd: "/h/p/repo", repoRoot: "/h/p/repo", parent: "/h/p", home: "/h" };
	it("strong sibling match beats weak local match", () => {
		const terms = ["blank", "template"];
		const ranked = rankCandidates(["/h/p/repo/scratch/test.txt", "/h/p/iac/modules/blank-workspace-template.tf"], terms, env);
		expect(ranked[0].path).toBe("/h/p/iac/modules/blank-workspace-template.tf");
	});
	it("fresh local file is zone 0", () => {
		const r = rankCandidates(["/h/p/repo/docs/template.md"], ["template"], env);
		expect(r[0].zone).toBe(0);
		expect(r[0].score).toBeGreaterThan(0);
	});
	it("drops non-matching paths and requires mandatory terms", () => {
		expect(scoreCandidate("/h/p/repo/x.md", ["template"])).toBe(0);
		expect(rankCandidates(["/h/p/repo/blank.md"], ["blank", "template"], env, ["template"])).toEqual([]);
	});
});

describe("anchors and receipt", () => {
	it("collapses children under a repo into the anchor", () => {
		const a = collapseToAnchors(["/r/a/1.ts", "/r/a/2.ts", "/r/b/3.ts"], (p) => (p.startsWith("/r/a") ? "/r/a" : p));
		expect(a).toEqual(["/r/a", "/r/b/3.ts"]);
	});
	it("caps receipt at 25 lines", () => {
		const hits = Array.from({ length: 100 }, (_, i) => ({ path: `/x/${i}`, line: 1, col: 1, snippet: "s" }));
		expect(formatReceipt(hits, 100).split("\n").length).toBeLessThanOrEqual(25);
	});
});

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { runLocate } from "./locate.ts";

describe("runLocate (integration)", () => {
	it("finds an unindexed fresh file via git ls-files and returns a bounded receipt", async () => {
		const dir = mkdtempSync(join(tmpdir(), "locate-"));
		execFileSync("git", ["init", "-q"], { cwd: dir });
		mkdirSync(join(dir, "docs"));
		writeFileSync(join(dir, "docs/template.md"), "# my title\n");
		const out = await runLocate("template in title", { cwd: dir, plocate: false });
		expect(out).toContain("docs/template.md:1");
		expect(out.split("\n").length).toBeLessThanOrEqual(25);
	});
});

describe("anchor collapsing in runLocate", () => {
	it("collapses many hits in one directory into a single anchor line", async () => {
		const dir = mkdtempSync(join(tmpdir(), "locate-"));
		execFileSync("git", ["init", "-q"], { cwd: dir });
		mkdirSync(join(dir, "gen"));
		for (let i = 0; i < 30; i++) writeFileSync(join(dir, "gen", `template${i}.md`), "x\n");
		const out = await runLocate("template", { cwd: dir, plocate: false });
		expect(out).toContain("gen/ (30 files)");
		expect(out.split("\n").filter((l) => l.startsWith("- ")).length).toBe(1);
	});
});

describe("runLocate plocate harvesting", () => {
	it("finds a sibling-project file via a plocate index and masks noise", async () => {
		const root = mkdtempSync(join(tmpdir(), "locate-pl-"));
		const repo = join(root, "repo");
		mkdirSync(repo);
		execFileSync("git", ["init", "-q"], { cwd: repo });
		mkdirSync(join(root, "iac/modules"), { recursive: true });
		mkdirSync(join(root, "iac/node_modules"), { recursive: true });
		writeFileSync(join(root, "iac/modules/blank-workspace-template.tf"), "x\n");
		writeFileSync(join(root, "iac/node_modules/blank-template.js"), "x\n");
		const db = join(root, "test.db");
		execFileSync("updatedb", ["-l", "0", "-U", root, "-o", db]);
		const out = await runLocate("blank template", { cwd: repo, plocateDb: db });
		expect(out).toContain("iac/modules/blank-workspace-template.tf");
		expect(out).not.toContain("node_modules");
	});
});

import { toMentions, findCandidates, parseLocateArgs, pickerRows } from "./locate.ts";

describe("mentions and picker", () => {
	it("formats @mentions relative to cwd, quoting spaces", () => {
		expect(toMentions(["/w/a/b.md", "/w/my file.md", "/etc/x"], "/w/a")).toBe('@b.md @"../my file.md" @/etc/x');
	});
	it("extracts --list flag from args", () => {
		expect(parseLocateArgs("--list blank template")).toEqual({ query: "blank template", list: true });
		expect(parseLocateArgs("blank -l")).toEqual({ query: "blank", list: true });
		expect(parseLocateArgs("blank")).toEqual({ query: "blank", list: false });
	});
	it("findCandidates returns all ranked paths uncapped by anchors", async () => {
		const dir = mkdtempSync(join(tmpdir(), "locate-"));
		execFileSync("git", ["init", "-q"], { cwd: dir });
		for (let i = 0; i < 30; i++) writeFileSync(join(dir, `template${i}.md`), "x\n");
		const c = await findCandidates("template", { cwd: dir, plocate: false });
		expect(c.length).toBe(30);
		expect(c[0].zone).toBe(0);
	});
});

import { formatAge, locateForPicker } from "./locate.ts";

describe("picker rows", () => {
	const NOW = 1_000_000_000_000;
	it("formats ages", () => {
		expect(formatAge(NOW, NOW - 30_000)).toBe("now");
		expect(formatAge(NOW, NOW - 5 * 60_000)).toBe("5m ago");
		expect(formatAge(NOW, NOW - 3 * 3600_000)).toBe("3h ago");
		expect(formatAge(NOW, NOW - 2 * 86400_000)).toBe("2d ago");
		expect(formatAge(NOW, NOW - 21 * 86400_000)).toBe("3w ago");
		expect(formatAge(NOW, NOW - 90 * 86400_000)).toBe("3mo ago");
		expect(formatAge(NOW, NOW - 800 * 86400_000)).toBe("2y ago");
	});
	it("rows lead with file name, then directory, then age; carry path and line", () => {
		const rows = pickerRows(
			[
				{ path: "/w/a/iac/x.tf", zone: 0, score: 1, mtimeMs: NOW - 2 * 86400_000, line: 7 },
				{ path: "/h/p/other/y.md", zone: 3, score: 0.5 },
			],
			"/w/a", NOW, "/h",
		).split("\n");
		expect(rows[0]).toBe("x.tf  ·  iac  ·  2d ago\t/w/a/iac/x.tf\t7");
		expect(rows[1]).toBe("y.md  ·  ~/p/other\t/h/p/other/y.md\t");
	});
});

describe("noise pruning of dependency and build trees", () => {
	const dirs = [".venv", "venv", "site-packages", "__pycache__", ".tox", ".mypy_cache", ".pytest_cache", ".ruff_cache",
		".terraform", ".next", "build", ".gradle", ".m2", ".npm", ".idea", ".direnv", "coverage", "bower_components"];
	for (const d of dirs)
		it(`masks ${d}`, () => expect(isNoise(`/h/p/repo/${d}/lib/x.py`, "/h")).toBe(true));
	it("masks the directory itself and keeps real code", () => {
		expect(isNoise("/h/p/repo/.venv", "/h")).toBe(true);
		expect(isNoise("/h/p/repo/iac/s3-bucket.tf", "/h")).toBe(false);
		expect(isNoise("/h/p/repo/.github/workflows/s3.yml", "/h")).toBe(false);
	});
	it("does not mask lookalike names", () => {
		expect(isNoise("/h/p/repo/rebuild/x.md", "/h")).toBe(false);
		expect(isNoise("/h/p/repo/builds.md", "/h")).toBe(false);
	});
});

describe("worktree duplicates are demoted", () => {
	const env = { cwd: "/h/p/repo", repoRoot: "/h/p/repo", parent: "/h/p", home: "/h" };
	it("ranks the main-tree copy above a .worktrees copy", () => {
		const r = rankCandidates(["/h/p/repo/.worktrees/x/s3.md", "/h/p/repo/docs/s3.md"], ["s3"], env);
		expect(r[0].path).toBe("/h/p/repo/docs/s3.md");
	});
});

describe("worktree dedupe", () => {
	const env = { cwd: "/h/p/repo", repoRoot: "/h/p/repo", parent: "/h/p", home: "/h" };
	it("drops worktree copies whose main-tree twin exists but keeps unique ones", () => {
		const r = rankCandidates(
			["/h/p/repo/docs/s3.md", "/h/p/repo/.worktrees/a/docs/s3.md", "/h/p/repo/.worktrees/b/docs/s3.md", "/h/p/repo/.worktrees/b/docs/s3-new.md"],
			["s3"], env).map((x) => x.path);
		expect(r).toContain("/h/p/repo/docs/s3.md");
		expect(r).toContain("/h/p/repo/.worktrees/b/docs/s3-new.md");
		expect(r).not.toContain("/h/p/repo/.worktrees/a/docs/s3.md");
		expect(r).not.toContain("/h/p/repo/.worktrees/b/docs/s3.md");
	});
	it("keeps worktree files when cwd is inside that worktree", () => {
		const e = { cwd: "/h/p/repo/.worktrees/a", repoRoot: "/h/p/repo/.worktrees/a", parent: "/h/p/repo/.worktrees", home: "/h" };
		const r = rankCandidates(["/h/p/repo/docs/s3.md", "/h/p/repo/.worktrees/a/docs/s3.md"], ["s3"], e).map((x) => x.path);
		expect(r).toContain("/h/p/repo/.worktrees/a/docs/s3.md");
	});
});

describe("locateForPicker", () => {
	const mk = () => {
		const dir = mkdtempSync(join(tmpdir(), "locate-"));
		execFileSync("git", ["init", "-q"], { cwd: dir });
		writeFileSync(join(dir, "a-template.md"), "intro\nthe workspace name is here\n");
		writeFileSync(join(dir, "b-template.md"), "nothing relevant\n");
		return dir;
	};
	it("keeps only content matches and records the matching line and mtime", async () => {
		const dir = mk();
		const { items, note } = await locateForPicker("template containing workspace", { cwd: dir, plocate: false });
		expect(items.map((i) => i.path.split("/").pop())).toEqual(["a-template.md"]);
		expect(items[0].line).toBe(2);
		expect(items[0].mtimeMs).toBeGreaterThan(0);
		expect(note).toBeUndefined();
	});
	it("falls back to the path-only list when no file contains the content terms", async () => {
		const dir = mk();
		const { items, note } = await locateForPicker("template containing zzzzz", { cwd: dir, plocate: false });
		expect(items.length).toBe(2);
		expect(note).toContain("no file contains");
	});
	it("drops the last path term when nothing matches", async () => {
		const dir = mk();
		const { items, note } = await locateForPicker("template nonexistentterm", { cwd: dir, plocate: false });
		expect(items.length).toBe(2);
		expect(note).toContain("nonexistentterm");
	});
});
