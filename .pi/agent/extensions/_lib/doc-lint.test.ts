// Run: bun test doc-lint.test.ts
import { describe, expect, it } from "bun:test";
import { lintDoc } from "./doc-lint.ts";
import { HYPE_WORDS } from "./doc-principles.ts";

const codes = (md: string, purpose = "report") => lintDoc(md, purpose).map((f) => f.code);

const good = `# Run work halves if we automate renewals

**Owner:** Lead · **Status:** Draft · **Data to:** 30 Oct 2026

**The ask in one sentence:** Fund two sprints of automation.

## Takeaways

1. Run work is 42% of commits (measured) ([§2](#evidence))[^1].
2. Two people hold the knowledge (judged) ([§3](#risks)).

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

	describe("principles checked from plain text (warnings)", () => {
		it("flags hype words in prose, by word, and ignores code, links and longer words", () => {
			expect(codes(good + "\nA seamless and Robust renderer.\n")).toEqual(["hype-word", "hype-word"]);
			const found = lintDoc(good + "\nA seamless renderer.\n").find((x) => x.code === "hype-word");
			expect(found?.message).toContain("seamless");
			expect(codes(good + "\nUse `seamless` as the flag name, see https://example.com/powerful and [the guide](https://example.com/robust).\n")).toEqual([]);
			expect(codes(good + "\nThe robustness of the plan, and a leveraged buyout.\n")).toEqual([]);
			expect(codes(good + "\n```\nseamless\n```\n")).toEqual([]);
		});
		it("lists the same hype words as the template kernel (one rule, two checkers)", () => {
			for (const w of HYPE_WORDS) expect(codes(good + `\nA ${w} thing.\n`)).toContain("hype-word");
		});
		it("wants a term of art explained at first use", () => {
			const bad = good + "\nThe ALB drops idle connections.\n";
			expect(codes(bad)).toContain("unglossed-jargon");
			expect(lintDoc(bad).find((x) => x.code === "unglossed-jargon")?.message).toContain("ALB");
			expect(codes(good + "\nThe load balancer (ALB) drops idle connections.\n")).toEqual([]);
			expect(codes(good + "\nThe application load balancer (ALB) drops idle connections; the ALB logs it.\n")).toEqual([]);
			expect(codes(good + "\nThe ALB (application load balancer) drops idle connections.\n")).toEqual([]);
			expect(codes(good + "\nThe ALB drops idle connections. Later the load balancer (ALB) is explained.\n")).toContain("unglossed-jargon");
		});
		it("jargon inside code is not prose", () => {
			expect(codes(good + "\nRun `terraform apply` against the ACM stack module.\n")).toContain("unglossed-jargon");
			expect(codes(good + "\nRun `aws acm list` today.\n")).toEqual([]);
		});
		it("wants a title that states a finding, not a label", () => {
			expect(codes(good.replace("# Run work halves if we automate renewals", "# Report: DevSecOps load"))).toContain("label-title");
			expect(codes(good.replace("# Run work halves if we automate renewals", "# DevSecOps load"))).toContain("label-title");
			expect(codes(good.replace("# Run work halves if we automate renewals", "# Do we pin the provider or vendor the SDK?"))).toEqual([]);
		});
		it("wants each takeaway to say whether it is measured, derived or judged", () => {
			expect(codes(good.replace("(measured) ", ""))).toContain("takeaway-no-basis");
			expect(codes(good.replace("(measured)", "(derived: from the git log)"))).toEqual([]);
			expect(codes(good.replace("(judged) ", ""))).toContain("takeaway-no-basis");
			const slide = good.replace("(measured) ", "").replace("(judged) ", "");
			expect(codes(slide, "deck")).not.toContain("takeaway-no-basis");
		});
		it("wants the unknowns stated, in a section or inline", () => {
			const noLimits = good.replace("## Method and limits\n\n", "## Method\n\n");
			expect(codes(noLimits)).toContain("no-unknowns");
			expect(codes(noLimits + "\n[OPEN — who owns the renewal?]\n")).not.toContain("no-unknowns");
			expect(codes(noLimits.replace("## Method\n", "## Method\n\n## What we do not know\n"))).not.toContain("no-unknowns");
			expect(codes(noLimits, "status")).not.toContain("no-unknowns");
		});
		it("wants a decision's recommendation marked as the author's judgement", () => {
			const decision = `# Do we pin the provider or vendor the SDK?

**The ask in one sentence:** Choose by Friday.

## Takeaways

1. Pinning costs one day (measured) ([§2](#options)).

## 2. Options {#options}

## 3. Recommendation {#recommendation}

**Recommended: B.** It is cheaper.

## 4. What would change our mind {#revisit}
`;
			expect(codes(decision, "decision")).toContain("recommendation-basis");
			expect(codes(decision.replace("**Recommended: B.**", "**Recommended (judged): B.**"), "decision")).not.toContain("recommendation-basis");
		});
	});
});
