// Run: bun test doc-library.test.ts
// Port of lead-docs tests/test_library.py: the on-disk layout must stay identical.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { docRoot, fileDoc, findDocs, listDocs, showDoc } from "./doc-library.ts";

let tmp: string;
let lib: string;
let src: string;
let html: string;
let env: Record<string, string | undefined>;

beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), "doc-lib-"));
	const cache = join(tmp, "cache");
	lib = join(cache, "agent-skills", "docs");
	src = join(tmp, "brief.md");
	writeFileSync(src, "# Connecting teams\n\n**Owner:** POD lead\n\n**The ask in one sentence:** Agree one intake for all PODs.\n\n## 1. Problem\n");
	html = join(tmp, "brief.html");
	writeFileSync(html, "<html><title>Connecting teams</title></html>");
	env = { XDG_CACHE_HOME: cache };
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

const file = (extra: Partial<Parameters<typeof fileDoc>[0]> = {}) =>
	fileDoc({ html, kind: "brief", source: src, date: "2026-11-14", ...extra }, env);
const entry = () => join(lib, "brief", "2026-11-14-connecting-teams");
const meta = (dir = entry()) => JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));

describe("docRoot", () => {
	it("uses XDG_CACHE_HOME, and LEAD_DOCS_ROOT overrides it", () => {
		expect(docRoot(env)).toBe(lib);
		expect(docRoot({ ...env, LEAD_DOCS_ROOT: "/x" })).toBe("/x");
	});
});

describe("fileDoc", () => {
	it("keeps html, source and metadata in the shadow root", () => {
		const out = file({ tags: ["takos"] });
		expect(out).toBe(join(entry(), "index.html"));
		expect(existsSync(join(entry(), "source.md"))).toBe(true);
		const m = meta();
		expect([m.title, m.kind, m.tags]).toEqual(["Connecting teams", "brief", ["takos"]]);
	});

	it("takes the summary from the one-sentence line", () => {
		file();
		expect(meta().summary).toBe("Agree one intake for all PODs.");
	});

	it("takes the repo from the source checkout", () => {
		const repo = join(tmp, "repo");
		mkdirSync(repo);
		execFileSync("git", ["init", "-q", repo]);
		execFileSync("git", ["-C", repo, "remote", "add", "origin", "https://github.com/oneTakeda/takos-infra.git"]);
		src = join(repo, "brief.md");
		writeFileSync(src, "# Connecting teams\n");
		file();
		expect(meta().repo).toBe("oneTakeda/takos-infra");
	});

	it("keeps the previous version when filed again", () => {
		file();
		writeFileSync(html, "<html><title>Connecting teams</title>v2</html>");
		file();
		expect(readFileSync(join(entry(), "index.html"), "utf8")).toContain("v2");
		expect(readdirSync(join(entry(), "versions")).filter((f) => f.endsWith(".html"))).toHaveLength(1);
	});

	it("writes index.json with one card per document", () => {
		file({ tags: ["takos"] });
		const cards = JSON.parse(readFileSync(join(lib, "index.json"), "utf8"));
		expect(cards).toHaveLength(1);
		expect(cards[0].path).toBe("brief/2026-11-14-connecting-teams/index.html");
		expect(cards[0].summary).toBe("Agree one intake for all PODs.");
		expect(cards[0].tags).toEqual(["takos"]);
	});

	it("writes a search page showing the cards", () => {
		file();
		const page = readFileSync(join(lib, "index.html"), "utf8");
		for (const s of ["Connecting teams", "Agree one intake for all PODs.", "brief/2026-11-14-connecting-teams/index.html"]) expect(page).toContain(s);
	});

	it("takes the summary from the html when there is no source", () => {
		writeFileSync(html, '<html><head><title>T</title><meta name="description" content="From meta."></head><body><p>From body.</p></body></html>');
		fileDoc({ html, kind: "report", date: "2026-11-14" }, env);
		expect(meta(join(lib, "report", "2026-11-14-t")).summary).toBe("From meta.");
		writeFileSync(html, "<html><title>U</title><body><p>Short.</p><p>The <b>first</b> real paragraph of the report, long enough to say something.</p></body></html>");
		fileDoc({ html, kind: "report", date: "2026-11-14" }, env);
		expect(meta(join(lib, "report", "2026-11-14-u")).summary).toBe("The first real paragraph of the report, long enough to say something.");
	});

	it("makes stored files readable by the web server", () => {
		chmodSync(html, 0o600);
		chmodSync(src, 0o600);
		file();
		for (const n of ["index.html", "source.md", "meta.json"]) expect(statSync(join(entry(), n)).mode & 0o777).toBe(0o644);
	});

	it("refuses an unknown kind", () => {
		expect(() => fileDoc({ html, kind: "novel" }, env)).toThrow(/unknown kind/);
	});

	it("falls back to the html title without a source", () => {
		fileDoc({ html, kind: "report", date: "2026-11-14" }, env);
		expect(existsSync(join(lib, "report", "2026-11-14-connecting-teams"))).toBe(true);
	});
});

describe("listDocs and findDocs", () => {
	it("lists date and title", () => {
		file();
		const line = listDocs({}, env).map((e) => showDoc(e, env)).join("\n");
		expect(line).toContain("2026-11-14");
		expect(line).toContain("Connecting teams");
	});

	it("finds by summary and tags", () => {
		file({ tags: ["takos"] });
		expect(findDocs(["intake"], env)).toHaveLength(1);
		expect(findDocs(["TAKOS"], env)).toHaveLength(1);
		expect(findDocs(["kubernetes"], env)).toHaveLength(0);
	});

	it("skips a corrupt entry without breaking the list", () => {
		file();
		const bad = join(lib, "report", "2026-01-01-broken");
		mkdirSync(bad, { recursive: true });
		writeFileSync(join(bad, "meta.json"), "{not json");
		const skipped: string[] = [];
		const docs = listDocs({ onSkip: (m) => skipped.push(m) }, env);
		expect(docs.map((d) => d.title)).toEqual(["Connecting teams"]);
		expect(skipped[0]).toContain("skipped");
	});
});
