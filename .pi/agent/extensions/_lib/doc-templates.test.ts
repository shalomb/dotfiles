// Run: bun test doc-templates.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isTemplateType, renderTemplate, TEMPLATE_TYPES, TEMPLATES, templateExample } from "./doc-templates.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "../../../../tests/doc/fixtures");
let tmp: string;
beforeEach(() => {
	tmp = mkdtempSync(join(tmpdir(), "doc-tpl-"));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

/** An input that renders: the example, with epicmap pointed at the Jira fixture. */
function usable(type: (typeof TEMPLATE_TYPES)[number]): unknown {
	const doc = JSON.parse(templateExample(type));
	if (type === "epicmap") Object.assign(doc, { cache: join(FIXTURES, "jira_epic"), epic: "DEMO-1" });
	return doc;
}
function write(doc: unknown, name = "in.json"): string {
	const p = join(tmp, name);
	writeFileSync(p, JSON.stringify(doc));
	return p;
}

describe("registry", () => {
	it("matches template.py --list so the two lists cannot drift", () => {
		const listed = JSON.parse(execFileSync("python3", [join(HERE, "doc-render", "templates", "template.py"), "--list"], { encoding: "utf8" }));
		expect([...TEMPLATE_TYPES].sort()).toEqual([...listed].sort());
	});
	it("says which purpose each type files as", () => {
		expect(Object.fromEntries(TEMPLATE_TYPES.map((t) => [t, TEMPLATES[t].purpose]))).toEqual({ decision: "decision", readout: "report", epicmap: "status", guide: "guide", runbook: "runbook", changerecord: "changerecord", postmortem: "postmortem", onepager: "onepager" });
		for (const t of TEMPLATE_TYPES) expect(TEMPLATES[t].label.length).toBeGreaterThan(0);
	});
	it("isTemplateType accepts only the three types", () => {
		expect(TEMPLATE_TYPES.every(isTemplateType)).toBe(true);
		for (const x of ["report", "", undefined, 3, "Readout"]) expect(isTemplateType(x)).toBe(false);
	});
});

describe("templateExample", () => {
	it("returns valid JSON for each type", () => {
		for (const t of TEMPLATE_TYPES) expect(typeof JSON.parse(templateExample(t))).toBe("object");
	});
	it("refuses an unknown type", () => {
		expect(() => templateExample("nope" as never)).toThrow(/unknown template type/);
	});
});

describe("renderTemplate", () => {
	it("renders each type to a self-contained page", () => {
		for (const t of TEMPLATE_TYPES) {
			const out = join(tmp, t, "page.html");
			renderTemplate({ type: t, input: write(usable(t)), out });
			expect(existsSync(out)).toBe(true);
			expect(readFileSync(out, "utf8")).toContain('id="recipe"');
		}
	});
	it("throws the renderer's error line naming the field", () => {
		const doc = usable("decision") as Record<string, unknown>;
		delete doc.why;
		expect(() => renderTemplate({ type: "decision", input: write(doc), out: join(tmp, "o.html") })).toThrow(/^error: .*why/);
		expect(existsSync(join(tmp, "o.html"))).toBe(false);
	});
	it("rejects style keys, naming the path", () => {
		const doc = usable("readout") as Record<string, unknown>;
		(doc.meta as Record<string, unknown>).brand = "acme";
		expect(() => renderTemplate({ type: "readout", input: write(doc), out: join(tmp, "o.html") })).toThrow(/^error: .*meta\.brand/);
	});
	it("refuses an unknown type", () => {
		expect(() => renderTemplate({ type: "nope" as never, input: write({}), out: join(tmp, "o.html") })).toThrow(/^error: unknown template type/);
	});
});
