// Run: bun test ./.pi/agent/extensions/_lib/doc-dossier.test.ts
// Spec: docs/specs/doc-system/vision-and-roadmap.md section 4 (dossier hopping-board, portable bundle, meeting subsets).
import { describe, expect, it } from "bun:test";
import { bundleDossier, renderDossier, subsetDossier, zipStore, type Dossier } from "./doc-dossier.ts";

const dossier: Dossier = {
	title: "Payments Replatform",
	synthesis: "We move to the new ledger in Q1. Risks are tracked in the risk register.",
	hops: [
		{ id: "adr-14", title: "ADR-014 Ledger choice", kind: "adr", ref: "docs/adr/ADR-014.md", tags: ["architecture", "decision"], summary: "Chose event-sourced ledger" },
		{ id: "jira-77", title: "EPIC-77", kind: "link", ref: "https://jira.example.com/browse/EPIC-77?token=abc", tags: ["status"] },
		{ id: "notes", title: "Kickoff notes", kind: "note", ref: "/home/alice/notes/kickoff.md", tags: ["status", "meeting"] },
		{ id: "diff", title: "Ledger diff", kind: "snapshot", ref: "snapshots/ledger.diff", tags: ["architecture"] },
	],
};

describe("subsetDossier", () => {
	it("keeps only hops matching any tag, preserving order", () => {
		const s = subsetDossier(dossier, { tags: ["status"] });
		expect(s.hops.map((h) => h.id)).toEqual(["jira-77", "notes"]);
	});
	it("keeps only listed ids", () => {
		expect(subsetDossier(dossier, { ids: ["diff", "adr-14"] }).hops.map((h) => h.id)).toEqual(["adr-14", "diff"]);
	});
	it("caps hop count for a short sync", () => {
		expect(subsetDossier(dossier, { limit: 2 }).hops.length).toBe(2);
	});
	it("does not mutate the original and notes the audience in the title", () => {
		const s = subsetDossier(dossier, { tags: ["decision"], audience: "ARB" });
		expect(dossier.hops.length).toBe(4);
		expect(s.title).toBe("Payments Replatform (ARB)");
	});
});

describe("renderDossier", () => {
	const html = renderDossier(dossier);
	it("puts the synthesis before the hop list", () => {
		expect(html.indexOf("new ledger")).toBeLessThan(html.indexOf("ADR-014 Ledger choice"));
	});
	it("links public hops and shows no private path or secret", () => {
		expect(html).toContain('href="docs/adr/ADR-014.md"');
		expect(html).not.toMatch(/alice|abc|\/home\//);
	});
	it("escapes html in titles", () => {
		expect(renderDossier({ ...dossier, title: "<img src=x>" })).not.toContain("<img src=x>");
	});
});

describe("bundleDossier", () => {
	const files = { "docs/adr/ADR-014.md": "# ADR\nsee /home/alice/x and password=hunter2", "snapshots/ledger.diff": "+ line" };
	const b = bundleDossier(dossier, files);
	const names = b.entries.map((e) => e.path);
	it("contains index.html, manifest.json and the referenced local files", () => {
		expect(names).toContain("index.html");
		expect(names).toContain("manifest.json");
		expect(names).toContain("docs/adr/ADR-014.md");
		expect(names).toContain("snapshots/ledger.diff");
	});
	it("sanitises every entry", () => {
		for (const e of b.entries) expect(e.content).not.toMatch(/alice|hunter2|abc\b|\/home\//);
	});
	it("reports hops whose local file was not supplied, and never bundles absolute paths", () => {
		expect(b.missing).toEqual([]);
		expect(names.every((n) => !n.startsWith("/") && !n.includes(".."))).toBe(true);
	});
	it("lists missing relative refs", () => {
		const m = bundleDossier(dossier, {});
		expect(m.missing.sort()).toEqual(["docs/adr/ADR-014.md", "snapshots/ledger.diff"]);
	});
	it("refuses traversal paths", () => {
		const bad = bundleDossier({ ...dossier, hops: [{ id: "x", title: "x", kind: "note", ref: "../../etc/passwd" }] }, { "../../etc/passwd": "root" });
		expect(bad.entries.map((e) => e.path)).not.toContain("../../etc/passwd");
		expect(bad.skipped).toContain("../../etc/passwd");
	});
	it("is deterministic", () => {
		expect(JSON.stringify(bundleDossier(dossier, files))).toBe(JSON.stringify(b));
	});
});

describe("zipStore", () => {
	const zip = zipStore([{ path: "a.txt", content: "hello" }, { path: "d/b.txt", content: "world" }]);
	it("writes a valid stored zip with local, central and end records", () => {
		const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
		expect(v.getUint32(0, true)).toBe(0x04034b50);
		expect(v.getUint32(zip.length - 22, true)).toBe(0x06054b50);
		expect(v.getUint16(zip.length - 22 + 10, true)).toBe(2);
	});
	it("contains the file names and bytes", () => {
		const text = new TextDecoder().decode(zip);
		expect(text).toContain("d/b.txt");
		expect(text).toContain("hello");
	});
	it("matches the known crc32 of 'hello'", () => {
		const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
		expect(v.getUint32(14, true)).toBe(0x3610a686);
	});
});
