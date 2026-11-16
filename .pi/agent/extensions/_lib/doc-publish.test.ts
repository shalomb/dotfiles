// Run: bun test doc-publish.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractProvenance } from "./doc-provenance.ts";
import { publishDoc } from "./doc-publish.ts";
import { urlsFor } from "./doc-urls.ts";
import { TEMPLATE_TYPES, type TemplateType, TEMPLATES, templateExample } from "./doc-templates.ts";

const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../tests/doc/fixtures");

let tmp: string;
let src: string;
const env = () => ({ ...process.env, LEAD_DOCS_ROOT: join(tmp, "lib") });

beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), "doc-pub-"));
	src = join(tmp, "pin-or-vendor.md");
	writeFileSync(src, "# Pin or vendor the SDK?\n\n**The ask in one sentence:** Choose one.\n\n## Takeaways\n\n1. Pinning is reversible (judged) ([§2](#options)).\n\n## Options\n\nA or B.\n\n## Recommendation\n\n**Recommended (judged): A.** It is the cheaper way back.\n\n## What we do not know\n\nWhether the vendor will keep the old API.\n");
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
	it("a deck purpose renders one page that opens in present mode, filed once", () => {
		const r = publishDoc({ source: src, purpose: "deck", downloads: tmp }, env());
		expect(r.rendered.map((p) => p.replace(/^.*\//, ""))).toEqual(["pin-or-vendor.html"]);
		expect(r.filed).toHaveLength(1);
		expect(r.filed[0]).toContain("/deck/");
		expect(readFileSync(r.rendered[0], "utf8")).toContain('data-start="present"');
	});
	it("an art front-matter key injects the motif override; no key injects none", () => {
		const withArt = join(tmp, "art.md");
		writeFileSync(withArt, "---\nart: circuit\n---\n# Art\n\nBody.\n");
		const r = publishDoc({ source: withArt, purpose: "deck", downloads: tmp }, env());
		expect(readFileSync(r.rendered[0], "utf8")).toContain('<style id="doc-art-css">\n:root{--art-right:var(--art-circuit)');
		const plain = publishDoc({ source: src, purpose: "deck", downloads: tmp }, env());
		expect(readFileSync(plain.rendered[0], "utf8")).not.toContain("doc-art-css");
	});
	it("refuses a missing source", () => {
		expect(() => publishDoc({ source: join(tmp, "nope.md"), purpose: "report", downloads: tmp }, env())).toThrow(/no such source/);
	});
	it("embeds provenance block with recipe in rendered HTML", () => {
		const r = publishDoc({ source: src, purpose: "decision", downloads: tmp, prompt: "decide pin vs vendor, see /home/alice/secret/notes.md", audience: [{ persona: "cto", prefers: ["short"] }], now: "2026-01-02T03:04:05Z" }, env());
		const html = readFileSync(r.rendered[0], "utf8");
		expect(html).toContain("doc-provenance-data");
		expect(html.indexOf("doc-provenance-data")).toBeLessThan(html.lastIndexOf("</body>"));
		expect(html).not.toContain("/home/alice");
		const rec = extractProvenance(html);
		expect(rec?.params.purpose).toBe("decision");
		expect(rec?.sources[0].ref).toBe("pin-or-vendor.md");
		expect(rec?.audience?.[0].persona).toBe("cto");
		expect(readFileSync(r.filed[0], "utf8")).toContain("doc-provenance-data");
	});
	it("omits provenance without a prompt and injects nav and brand css when asked", () => {
		const plain = publishDoc({ source: src, purpose: "decision", downloads: tmp }, env());
		expect(readFileSync(plain.rendered[0], "utf8")).not.toContain("doc-provenance-data");
		const r = publishDoc({ source: src, purpose: "decision", downloads: tmp, nav: true, style: "formal", brand: { ctx: { host: "x.acme.com" }, cfg: { domains: ["acme.com"], css: ".acme{color:red}" } } }, env());
		const html = readFileSync(r.rendered[0], "utf8");
		expect(html).toContain('id="doc-nav-css"');
		expect(html).toContain(".acme{color:red}");
		const neutral = publishDoc({ source: src, purpose: "decision", downloads: tmp, style: "formal", brand: { ctx: { host: "x.acme.com", personal: true }, cfg: { domains: ["acme.com"], css: ".acme{color:red}" } } }, env());
		expect(readFileSync(neutral.rendered[0], "utf8")).not.toContain(".acme{color:red}");
	});
});

describe("publishDoc with a template", () => {
	const KINDS: Record<TemplateType, string> = { decision: "decision", readout: "report", epicmap: "status" };
	/** Write a usable structured input named <type>-input.json (epicmap pointed at the Jira fixture). */
	function input(type: TemplateType, edit?: (d: Record<string, any>) => void): string {
		const doc = JSON.parse(templateExample(type));
		if (type === "epicmap") Object.assign(doc, { cache: join(FIXTURES, "jira_epic"), epic: "DEMO-1" });
		edit?.(doc);
		const p = join(tmp, `${type}-input.json`);
		writeFileSync(p, JSON.stringify(doc));
		return p;
	}
	/** An isolated brand folder with one stylesheet, as formalCss looks it up. */
	const brandEnv = () => {
		const cfg = join(tmp, "xdg");
		mkdirSync(join(cfg, "agent-skills", "brands"), { recursive: true });
		writeFileSync(join(cfg, "agent-skills", "brands", "acme.css"), ".acme-formal{color:teal}");
		return { ...env(), XDG_CONFIG_HOME: cfg };
	};

	for (const type of TEMPLATE_TYPES) {
		it(`${type}: renders, files as ${KINDS[type]} in the isolated library and returns urls`, () => {
			const r = publishDoc({ source: input(type), template: type, downloads: tmp }, env());
			expect(r.rendered).toEqual([join(tmp, `${type}-input.html`)]);
			expect(r.filed).toHaveLength(1);
			expect(r.filed[0]).toContain(join("lib", KINDS[type]));
			expect(r.urls).toEqual(urlsFor(r.filed[0]).map((u) => u.url));
			expect(r.findings).toEqual([]);
			expect(TEMPLATES[type].purpose).toBe(KINDS[type] === "report" ? "report" : KINDS[type]);
			expect(readFileSync(r.filed[0], "utf8")).toContain('id="recipe"');
		});
	}
	it("uses the caller's summary, else the page's lede", () => {
		const r = publishDoc({ source: input("decision"), template: "decision", downloads: tmp, summary: "my summary" }, env());
		expect(readFileSync(join(dirname(r.filed[0]), "..", "..", "index.json"), "utf8")).toContain("my summary");
		const l = publishDoc({ source: input("readout"), template: "readout", downloads: tmp }, env());
		expect(readFileSync(join(dirname(l.filed[0]), "..", "..", "index.json"), "utf8")).toContain("The ticket asks for one search page");
	});
	it("formal style injects the brand css when one exists; house does not", () => {
		const e = brandEnv();
		const formal = publishDoc({ source: input("decision"), template: "decision", downloads: tmp, style: "formal" }, e);
		expect(readFileSync(formal.rendered[0], "utf8")).toContain('<style id="doc-brand-css">\n.acme-formal{color:teal}');
		expect(formal.brandCss).toContain("acme.css");
		const house = publishDoc({ source: input("decision"), template: "decision", downloads: tmp, style: "house" }, e);
		expect(readFileSync(house.rendered[0], "utf8")).not.toContain(".acme-formal");
	});
	it("applies the corporate-context brand css and the nav style", () => {
		const r = publishDoc({ source: input("readout"), template: "readout", downloads: tmp, nav: true, style: "formal", brand: { ctx: { host: "x.acme.com" }, cfg: { domains: ["acme.com"], css: ".acme{color:red}" } } }, env());
		const html = readFileSync(r.rendered[0], "utf8");
		expect(html).toContain('id="doc-nav-css"');
		expect(html).toContain(".acme{color:red}");
		const plain = publishDoc({ source: input("readout"), template: "readout", downloads: tmp }, env());
		expect(readFileSync(plain.rendered[0], "utf8")).not.toContain("doc-nav-css");
	});
	it("a prompt embeds the provenance block next to the single recipe, with no path leaks", () => {
		const r = publishDoc({ source: input("decision"), template: "decision", downloads: tmp, prompt: `decide it, notes in ${homedir()}/secret/n.md`, now: "2031-02-02T00:00:00Z" }, env());
		const html = readFileSync(r.rendered[0], "utf8");
		expect(html.match(/id="recipe"/g)).toHaveLength(1);
		expect(html).toContain("doc-provenance-data");
		expect(extractProvenance(html)?.params).toMatchObject({ purpose: "decision", template: "decision" });
		expect(html).not.toContain("/home/");
		expect(html).not.toContain(homedir());
		expect(html).not.toContain(tmp);
	});
	it("masks temp and home paths in the prompt and sources of a template page", () => {
		const r = publishDoc({ source: input("readout"), template: "readout", downloads: tmp, prompt: `read /tmp/x/y.json and /home/alice/z, cache in ${tmpdir()}/q/r.json and /var/folders/ab/c`, sources: ["/tmp/x/y.json", "/home/alice/z"], now: "2031-02-02T00:00:00Z" }, env());
		const html = readFileSync(r.rendered[0], "utf8");
		expect(html).toContain("doc-provenance-data");
		for (const leak of ["/tmp/x/y.json", "/home/alice/z", `${tmpdir()}/q`, "/var/folders/ab", tmp]) expect(html).not.toContain(leak);
	});
	it("redacts every private path flavour in the prompt and sources of a template page (one classifier, in Python)", () => {
		const leaks = ["/home/alice/x", "file:///etc/private.conf", "\\\\srv\\share\\f", "/mnt/c/Users/a/b", "/var/home/carol/n", "C:\\Users\\Bob\\d", "~/secret.md"];
		const r = publishDoc({ source: input("readout"), template: "readout", downloads: tmp, prompt: `use ${leaks.join(" then ")} and https://example.com/home/ok and /etc/hosts`, sources: leaks, now: "2031-02-02T00:00:00Z" }, env());
		const html = readFileSync(r.rendered[0], "utf8");
		expect(html).toContain("doc-provenance-data");
		for (const leak of ["alice", "private.conf", "srv", "Users/a", "carol", "Bob", "secret.md"]) expect(html).not.toContain(leak);
		expect(html).toContain("https://example.com/home/ok");
	});
	it("runs the final-page gate after nav, brand and provenance are injected, and refuses a leaking page", () => {
		const r = publishDoc({ source: input("readout"), template: "readout", downloads: tmp, nav: true, prompt: "plain request", now: "2031-02-02T00:00:00Z" }, env());
		expect(readFileSync(r.rendered[0], "utf8")).toContain("doc-nav-css");
		// a brand stylesheet that names a private path must stop the publish: the gate looks at the finished page
		const dir = join(tmp, "brandcfg", "agent-skills", "brands");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "leak.css"), "/* built at /home/alice/projects/brand */ body{color:#123}");
		expect(() => publishDoc({ source: input("readout"), template: "readout", downloads: tmp, style: "formal" }, { ...env(), XDG_CONFIG_HOME: join(tmp, "brandcfg") })).toThrow(/error: final page: a private path survived/);
	});
	it("redacts the whole provenance structure and leaves public links alone", () => {
		const r = publishDoc({ source: input("readout"), template: "readout", downloads: tmp, prompt: "see https://example.com/tmp/manual and d:/work/x", params: { where: "d:/work/y", note: "/mnt/c/Users/a/z", n: 3 }, now: "2031-02-02T00:00:00Z" }, env());
		const html = readFileSync(r.rendered[0], "utf8");
		for (const leak of ["d:/work", "/mnt/c/Users"]) expect(html).not.toContain(leak);
		expect(html).toContain("https://example.com/tmp/manual");
	});
	it("refuses a template input that names a private path, naming the field", () => {
		const bad = input("readout", (d) => {
			d.problem = "see /home/alice/private.md";
		});
		expect(() => publishDoc({ source: bad, template: "readout", downloads: tmp }, env())).toThrow(/error: problem: private paths are not allowed/);
	});
	it("refuses a purpose that differs from the template's", () => {
		expect(() => publishDoc({ source: input("decision"), template: "decision", purpose: "report", downloads: tmp }, env())).toThrow("template decision files as purpose decision");
		expect(() => publishDoc({ source: input("decision"), template: "decision", purpose: "decision", downloads: tmp }, env())).not.toThrow();
	});
	it("never reads brand from the input: a brand key throws with its field path", () => {
		const bad = input("decision", (d) => {
			d.meta.brand = "acme";
		});
		expect(() => publishDoc({ source: bad, template: "decision", downloads: tmp }, env())).toThrow(/meta\.brand/);
	});
	it("surfaces a renderer error naming the field", () => {
		const bad = input("decision", (d) => {
			delete d.why;
		});
		expect(() => publishDoc({ source: bad, template: "decision", downloads: tmp }, env())).toThrow(/error: .*why/);
	});
	it("a Markdown publish keeps its result shape", () => {
		const r = publishDoc({ source: src, purpose: "decision", downloads: tmp }, env());
		expect(Object.keys(r).sort()).toEqual(["brandCss", "filed", "findings", "provenance", "rendered", "urls"]);
		expect(r.rendered).toHaveLength(1);
		expect(r.urls).toEqual(urlsFor(r.filed[0]).map((u) => u.url));
	});
});
