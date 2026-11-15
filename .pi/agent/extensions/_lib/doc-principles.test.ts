// Run: bun test doc-principles.test.ts
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASIS_LABELS, HYPE_WORDS, JARGON_TERMS, principleRules, RULES, TEMPLATE_HINTS, templateGuide } from "./doc-principles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const KERNEL = readFileSync(join(HERE, "doc-render", "templates", "kernel.py"), "utf8");
const PRINCIPLES_MD = readFileSync(join(HERE, "..", "..", "..", "..", "docs", "specs", "doc-system", "principles.md"), "utf8");
const SKILL = process.env.DOCS_AUTHORING_SKILL ?? "/home/unop/projects/shalomb/agent-skills/.worktrees/lead-docs/skills/docs-authoring/SKILL.md";

/** A Python list or tuple of strings assigned to `name` in kernel.py. */
function pyStrings(name: string): string[] {
	const m = KERNEL.match(new RegExp(`^${name}\\s*=\\s*[\\[(]([\\s\\S]*?)[\\])]\\s*$`, "m"));
	if (!m) throw new Error(`${name} not found in kernel.py`);
	return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

describe("the lists stay equal to the template kernel", () => {
	it("hype words", () => expect([...HYPE_WORDS]).toEqual(pyStrings("HYPE_WORDS")));
	it("jargon terms", () => expect([...JARGON_TERMS]).toEqual(pyStrings("JARGON_TERMS")));
	it("basis labels: derived is the renderer's, measured and judged are the author's", () => {
		expect([...BASIS_LABELS].sort()).toEqual(["derived", ...pyStrings("AUTHOR_BASES")].sort());
	});
});

describe("principleRules", () => {
	it("names every rule once, in order", () => {
		expect(RULES.map((r) => r.id)).toEqual(["P1", "P2", "P6", "P5", "P18"]);
		const text = principleRules();
		let at = -1;
		for (const r of RULES) {
			const i = text.indexOf(r.name);
			expect(i).toBeGreaterThan(at);
			at = i;
		}
	});
	it("tells the writer the three labels, the citation forms and the recommendation mark", () => {
		const text = principleRules();
		for (const label of BASIS_LABELS) expect(text).toContain(label);
		expect(text).toContain("[^id]");
		expect(text).toContain("[r1]");
		expect(text).toContain("Recommended (judged)");
		expect(text).toContain("(untested)");
	});
	it("lists the hype words the checks reject", () => {
		for (const w of HYPE_WORDS) expect(principleRules()).toContain(w);
	});
	it("stays short: it goes into every /doc prompt", () => {
		expect(principleRules().length).toBeLessThan(1600);
	});
	it("matches the rules written in principles.md", () => {
		for (const r of RULES) expect(PRINCIPLES_MD).toContain(`**${r.id}.`);
	});
});

describe("templateGuide", () => {
	it("names every template, what it files as and doc_template", () => {
		const text = templateGuide();
		for (const t of TEMPLATE_HINTS) {
			expect(text).toContain(t.type);
			expect(text).toContain(t.purpose);
		}
		expect(text).toContain("doc_template");
		expect(TEMPLATE_HINTS.map((t) => t.type).sort()).toEqual(["decision", "epicmap", "readout"]);
	});
});

describe("the docs-authoring skill says the same", () => {
	const skill = existsSync(SKILL) ? readFileSync(SKILL, "utf8") : undefined;
	it.skipIf(!skill)("lists the same hype words and names each rule", () => {
		const listed = skill!.replace(/\s+/g, " ").match(/Words the checks reject: (.*?)\. Say what a thing/);
		expect(listed).not.toBeNull();
		expect(listed![1].split(", ").sort()).toEqual([...HYPE_WORDS].sort());
		for (const r of RULES) expect(skill).toContain(`**${r.name}`);
	});
	it.skipIf(!skill)("names the same templates and the same purposes they file as", () => {
		for (const t of TEMPLATE_HINTS) expect(skill).toMatch(new RegExp(`\\| \`${t.type}\` \\|.*\`${t.purpose}\``));
	});
});
