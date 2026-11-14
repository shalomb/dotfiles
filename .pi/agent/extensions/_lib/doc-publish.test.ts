// Run: bun test doc-publish.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishDoc } from "./doc-publish.ts";

let tmp: string;
let src: string;
const env = () => ({ ...process.env, LEAD_DOCS_ROOT: join(tmp, "lib") });

beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), "doc-pub-"));
	src = join(tmp, "pin-or-vendor.md");
	writeFileSync(src, "# Pin or vendor the SDK?\n\n**The ask in one sentence:** Choose one.\n\n## Takeaways\n\n1. Pinning is reversible ([§2](#options)).\n\n## Options\n\nA or B.\n\n## Recommendation\n\nA.\n");
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("publishDoc", () => {
	it("renders to Downloads, files under the purpose and reports findings", () => {
		const r = publishDoc({ source: src, purpose: "decision", downloads: tmp }, env());
		expect(r.rendered).toEqual([join(tmp, "pin-or-vendor.html")]);
		expect(existsSync(r.filed[0])).toBe(true);
		expect(r.filed[0]).toContain(join("lib", "decision"));
		expect(readFileSync(r.filed[0], "utf8")).toContain("Pin or vendor the SDK?");
		expect(r.findings).toEqual([]);
	});
	it("reports rule findings without refusing to file", () => {
		writeFileSync(src, readFileSync(src, "utf8").replace("(#options)", "(#nowhere)"));
		const r = publishDoc({ source: src, purpose: "decision", downloads: tmp }, env());
		expect(r.findings.map((f) => f.code)).toEqual(["broken-anchor"]);
		expect(existsSync(r.filed[0])).toBe(true);
	});
	it("a deck purpose renders both the page and the deck", () => {
		const r = publishDoc({ source: src, purpose: "deck", downloads: tmp }, env());
		expect(r.rendered.map((p) => p.replace(/^.*\//, ""))).toEqual(["pin-or-vendor.html", "pin-or-vendor-deck.html"]);
		expect(r.filed).toHaveLength(2);
	});
	it("refuses a missing source", () => {
		expect(() => publishDoc({ source: join(tmp, "nope.md"), purpose: "report", downloads: tmp }, env())).toThrow(/no such source/);
	});
});
