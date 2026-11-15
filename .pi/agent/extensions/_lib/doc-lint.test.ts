// Run: bun test doc-lint.test.ts
import { describe, expect, it } from "bun:test";
import { lintDoc } from "./doc-lint.ts";

const codes = (md: string, purpose = "report") => lintDoc(md, purpose).map((f) => f.code);

const good = `# Run work halves if we automate renewals

**Owner:** Lead · **Status:** Draft · **Data to:** 30 Oct 2026

**The ask in one sentence:** Fund two sprints of automation.

## Takeaways

1. Run work is 42% of commits ([§2](#evidence))[^1].
2. Two people hold the knowledge ([§3](#risks)).

## 2. Evidence {#evidence}

## 3. Risks {#risks}

## Method and limits

## Sources

[^1]: [git log, Jul–Oct](https://example.com/q)
`;

describe("lintDoc", () => {
	it("passes a well-formed report", () => {
		expect(codes(good)).toEqual([]);
	});
	it("wants a one-sentence ask", () => {
		expect(codes(good.replace(/\*\*The ask.*\n/, ""))).toContain("no-ask");
	});
	it("wants takeaways that link to the section proving them", () => {
		expect(codes(good.replace(" ([§3](#risks))", ""))).toContain("takeaway-unlinked");
		expect(codes(good.replace(/## Takeaways[\s\S]*?(?=## 2)/, ""))).toContain("no-takeaways");
	});
	it("flags a takeaway link to a section that does not exist", () => {
		expect(codes(good.replace("(#risks))", "(#nowhere))"))).toContain("broken-anchor");
	});
	it("flags a cited footnote with no definition", () => {
		expect(codes(good.replace(/\[\^1\]: .*\n/, ""))).toContain("missing-footnote");
	});
	it("wants method and limits in a report, not in a status", () => {
		const noMethod = good.replace("## Method and limits\n", "");
		expect(codes(noMethod, "report")).toContain("no-method");
		expect(codes(noMethod, "status")).not.toContain("no-method");
	});
	it("wants options and a recommendation in a decision", () => {
		const c = codes(good, "decision");
		expect(c).toContain("no-options");
		expect(c).toContain("no-recommendation");
		const dec = `${good}\n## Options\n\n## Recommendation\n`;
		expect(codes(dec, "decision")).not.toContain("no-options");
	});
	it("flags figures in takeaways that carry no source", () => {
		expect(codes(good.replace("[^1]", ""))).toContain("uncited-figure");
	});
	it("wants a brief to name its biases, offer checks, and link outside the repo", () => {
		expect(codes(good, "brief")).toEqual(["no-biases", "no-check-yourself"]);
		const brief = good.replace("## Method and limits", "## Our biases, in the open\n\n## Check it yourself\n\n## Method and limits");
		expect(codes(brief, "brief")).toEqual([]);
		expect(codes(brief + "\nSee [notes](notes.md).\n", "brief")).toEqual(["relative-link"]);
	});
	it("wants a dated snapshot when figures are used", () => {
		expect(codes(good.replace(" · **Data to:** 30 Oct 2026", ""))).toContain("no-data-date");
	});
});
