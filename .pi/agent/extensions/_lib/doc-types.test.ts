// Run: bun test doc-types.test.ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintDoc } from "./doc-lint.ts";
import { parseDocArgs, PURPOSES } from "./doc-intent.ts";
import { publishDoc } from "./doc-publish.ts";
import { TEMPLATE_TYPES, type TemplateType, TEMPLATES, templateExample } from "./doc-templates.ts";

const NEW = ["guide", "runbook", "changerecord", "postmortem", "onepager"] as const;
const SYNONYM: Record<(typeof NEW)[number], string> = {
	guide: "playbook for onboarding",
	runbook: "procedure for failover",
	changerecord: "change request for the proxy",
	postmortem: "incident review of the outage",
	onepager: "exec summary of the plan",
};

/** Passes every base rule (ask, takeaways, no figures) plus the type's own. */
const BASE = "# Why the new proxy is safe to ship?\n\n**The ask in one sentence:** Approve the change.\n\n## Takeaways\n\n1. It is reversible (judged) ([§1](#steps)).\n\n";
const COMPLIANT: Record<(typeof NEW)[number], string> = {
	guide: `${BASE}## Steps {#steps}\n\n1. Install it.\n2. Run it.\n`,
	runbook: `${BASE}## Steps {#steps}\n\n\`\`\`sh\nsystemctl restart proxy\n\`\`\`\n\n## Rollback\n\nRestart the old unit.\n`,
	changerecord: `${BASE}## Plan {#steps}\n\nSwap the unit.\n\n## Back-out\n\nRestore the old unit.\n\n## Risk\n\nShort outage.\n`,
	postmortem: `${BASE}## Timeline {#steps}\n\nIt broke, then we fixed it.\n\n## Action items\n\nAdd an alert.\n`,
	onepager: `${BASE}## Plan {#steps}\n\nShip it.\n\n## Ask\n\nApprove by Friday.\n`,
};

let tmp: string;
const env = () => ({ ...process.env, LEAD_DOCS_ROOT: join(tmp, "lib") });
beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "doc-types-")); });
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

for (const t of NEW) {
	describe(t, () => {
		it("is a template type with its own purpose", () => {
			expect(TEMPLATE_TYPES as readonly string[]).toContain(t);
			expect(TEMPLATES[t as TemplateType].purpose).toBe(t);
			expect(PURPOSES as readonly string[]).toContain(TEMPLATES[t as TemplateType].purpose);
		});
		it("routes a synonym to it", () => {
			expect(parseDocArgs(SYNONYM[t]).template).toBe(t);
		});
		it("has an example that is JSON", () => {
			expect(() => JSON.parse(templateExample(t))).not.toThrow();
		});
		it("lint flags a bare doc and passes a compliant one", () => {
			const bare = lintDoc(BASE.replace("1. It", "- It").replace(/\*\*The ask.*\n/, "") + "## Notes\n\nNothing.\n", t).map((f) => f.code);
			expect(bare.some((c) => c.startsWith(`${t}-`))).toBe(true);
			expect(lintDoc(COMPLIANT[t], t)).toEqual([]);
		});
		it("publishes its example to a page", () => {
			const p = join(tmp, `${t}.json`);
			writeFileSync(p, templateExample(t));
			const r = publishDoc({ source: p, template: t, downloads: tmp }, env());
			expect(r.filed[0]).toContain(join("lib", t));
			expect(readFileSync(r.rendered[0], "utf8")).toContain("<main");
		});
	});
}

it("keeps 'one-pager on x' as a length modifier, not a template", () => {
	expect(parseDocArgs("one-pager on intake")).toMatchObject({ depth: 1, topic: "on intake" });
	expect(parseDocArgs("one-pager on intake").template).toBeUndefined();
});

describe("existing /doc parses survive the new routing", () => {
	it("parses 'ops update on x' exactly as before (no template)", () => {
		expect(parseDocArgs("ops update on X")).toEqual({ action: "write", purpose: undefined, depth: undefined, audience: undefined, style: undefined, topic: "ops update on X" });
	});
	it.each(["retro", "approach", "cr"])("does not route bare '%s' to a template", (w) => {
		const i = parseDocArgs(`${w} on X`);
		expect(i.template).toBeUndefined();
		expect(i.topic).toBe(`${w} on X`);
	});
	it("keeps '1-pager summary of x' as depth 1 with the topic intact", () => {
		const i = parseDocArgs("1-pager summary of X");
		expect(i.template).toBeUndefined();
		expect(i).toMatchObject({ depth: 1, topic: "summary of X" });
	});
	it("still routes 'onepager' and 'one pager' to the template", () => {
		expect(parseDocArgs("onepager X").template).toBe("onepager");
		expect(parseDocArgs("one pager X").template).toBe("onepager");
	});
	it("keeps the audience when routing to a template", () => {
		expect(parseDocArgs("runbook for oncall engineers formal")).toMatchObject({ template: "runbook", audience: "oncall engineers", style: "formal", topic: "" });
		expect(parseDocArgs("how to deploy for newcomers")).toMatchObject({ template: "guide", audience: "newcomers", topic: "deploy" });
	});
});

describe("archmap", () => {
	it("is a template type with its own purpose, default depth 1", () => {
		expect(TEMPLATE_TYPES as readonly string[]).toContain("archmap");
		expect(TEMPLATES.archmap.purpose).toBe("archmap");
		expect(PURPOSES as readonly string[]).toContain("archmap");
	});
	it.each(["architecture of the proxy", "archmap for billing", "infra diagram of the stack"])("routes '%s' to it", (s) => {
		expect(parseDocArgs(s).template).toBe("archmap");
	});
	it("has an example that is JSON", () => {
		expect(() => JSON.parse(templateExample("archmap"))).not.toThrow();
	});
	it("publishes its example to an inline-SVG page", () => {
		const p = join(tmp, "archmap.json");
		writeFileSync(p, templateExample("archmap"));
		const r = publishDoc({ source: p, template: "archmap", downloads: tmp }, env());
		expect(r.filed[0]).toContain(join("lib", "archmap"));
		const page = readFileSync(r.rendered[0], "utf8");
		expect(page).toContain("<main");
		expect(page).toContain("data-node-id=");
	});
});
