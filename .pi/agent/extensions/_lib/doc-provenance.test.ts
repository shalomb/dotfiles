// Run: bun test ./.pi/agent/extensions/_lib/doc-provenance.test.ts
// Spec: docs/specs/doc-system/vision-and-roadmap.md section 6 (embedded provenance, no private paths or secrets).
import { describe, expect, it } from "bun:test";
import {
	audiencePromptRules,
	embedProvenance,
	extractProvenance,
	redactPrivatePaths,
	redactSecrets,
	renderProvenanceBlock,
	sanitizeText,
	type ProvenanceRecipe,
} from "./doc-provenance.ts";

const recipe: ProvenanceRecipe = {
	prompt: "Summarise /home/alice/work/acme/notes.md for the steering committee",
	params: { purpose: "report", style: "house", pages: 4 },
	sources: [
		{ ref: "/home/alice/work/acme/notes.md", at: "2026-11-01T09:00:00Z" },
		{ ref: "https://bob:hunter2@example.com/spec?token=abc123", at: "2026-11-02T10:00:00Z" },
		{ ref: "docs/architecture/ADR-014.md", at: "2026-11-03T11:00:00Z" },
	],
	generatedAt: "2026-11-04T12:00:00Z",
	audience: [{ persona: "CTO", prefers: ["bulleted risk tables"] }],
	contract: ["doc publish --source <your-copy-of-notes.md> --purpose report"],
};

describe("redactPrivatePaths", () => {
	it("replaces home, root, tilde and Windows user paths", () => {
		const t = "see /home/alice/x/y.md, /Users/bob/z, ~/secret/a.txt, C:\\Users\\carol\\d and /root/.ssh/id";
		const out = redactPrivatePaths(t);
		expect(out).not.toMatch(/alice|bob|carol|\.ssh|secret/);
		expect(out.match(/<private-path>/g)?.length).toBe(5);
	});
	it("keeps repo-relative and public paths", () => {
		expect(redactPrivatePaths("docs/a.md and /usr/bin/env")).toBe("docs/a.md and /usr/bin/env");
	});
	it("redacts a literal home directory that is not under /home", () => {
		expect(redactPrivatePaths("at /srv/people/dana/work/f", { homes: ["/srv/people/dana"] })).toBe("at <private-path>");
	});
});

describe("redactSecrets", () => {
	it("masks tokens, bearer headers, key=value secrets and URL credentials", () => {
		const t = "ghp_abcdefghijklmnopqrstuvwxyz0123456789 Authorization: Bearer abc.def-123 password=hunter2 https://u:p@h.io/x AKIAABCDEFGHIJKLMNOP";
		const out = redactSecrets(t);
		expect(out).not.toMatch(/ghp_|abc\.def|hunter2|u:p@|AKIA/);
		expect(out).toContain("<secret>");
		expect(out).toContain("https://h.io/x");
	});
	it("drops secret-looking query parameters but keeps others", () => {
		expect(redactSecrets("https://e.com/a?page=2&token=zzz&x=1")).toBe("https://e.com/a?page=2&token=<secret>&x=1");
	});
});

describe("renderProvenanceBlock", () => {
	const html = renderProvenanceBlock(recipe);
	it("is a folded details element", () => {
		expect(html).toMatch(/^<details class="doc-provenance">/);
		expect(html).not.toContain(" open");
	});
	it("never contains a private path or a secret", () => {
		expect(html).not.toMatch(/alice|hunter2|abc123|\/home\//);
	});
	it("states prompt, params, sources with timestamps, and the execution contract", () => {
		expect(html).toContain("Summarise");
		expect(html).toContain("purpose");
		expect(html).toContain("2026-11-01T09:00:00Z");
		expect(html).toContain("docs/architecture/ADR-014.md");
		expect(html).toContain("doc publish --source");
		expect(html).toContain("2026-11-04T12:00:00Z");
	});
	it("bakes in audience preferences", () => {
		expect(html).toContain("CTO");
		expect(html).toContain("bulleted risk tables");
	});
	it("escapes HTML in recipe text", () => {
		const out = renderProvenanceBlock({ ...recipe, prompt: "</script><b>x</b>" });
		expect(out).not.toContain("<b>x</b>");
		expect(out).not.toMatch(/<\/script><b>/);
	});
	it("is deterministic", () => {
		expect(renderProvenanceBlock(recipe)).toBe(html);
	});
});

describe("embed and extract", () => {
	const page = "<html><body><p>hi</p></body></html>";
	it("embeds before </body> and round-trips the sanitised recipe", () => {
		const out = embedProvenance(page, recipe);
		expect(out.indexOf("doc-provenance")).toBeLessThan(out.indexOf("</body>"));
		const back = extractProvenance(out);
		expect(back?.generatedAt).toBe(recipe.generatedAt);
		expect(back?.sources.map((s) => s.ref)).toContain("docs/architecture/ADR-014.md");
		expect(JSON.stringify(back)).not.toMatch(/alice|hunter2/);
	});
	it("replaces an existing block rather than stacking", () => {
		const twice = embedProvenance(embedProvenance(page, recipe), recipe);
		expect(twice.match(/class="doc-provenance"/g)?.length).toBe(1);
	});
	it("appends when there is no </body>", () => {
		expect(embedProvenance("<p>x</p>", recipe)).toContain("doc-provenance");
	});
	it("returns undefined when a page has no block", () => {
		expect(extractProvenance(page)).toBeUndefined();
	});
});

describe("audiencePromptRules", () => {
	it("turns profiles into prompt rules, in input order", () => {
		const rules = audiencePromptRules([
			{ persona: "CTO", prefers: ["bulleted risk tables"] },
			{ persona: "Compliance", prefers: ["ISO clause matrices", "numbered sections"] },
		]);
		expect(rules).toBe("- CTO: bulleted risk tables\n- Compliance: ISO clause matrices; numbered sections");
	});
	it("is empty without profiles", () => {
		expect(audiencePromptRules([])).toBe("");
	});
});

describe("sanitizeText", () => {
	it("applies paths then secrets", () => {
		expect(sanitizeText("/home/a/b token=xyz")).toBe("<private-path> token=<secret>");
	});
});
