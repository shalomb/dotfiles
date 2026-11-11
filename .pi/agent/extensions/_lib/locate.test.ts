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
