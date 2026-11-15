/**
 * Checks a /doc Markdown source against the authoring rules before it is filed.
 * Findings are warnings: the document is still rendered and filed.
 */
export interface Finding {
	code: string;
	message: string;
}

const PURPOSES_NEEDING_METHOD = new Set(["report", "brief"]);

/** GitHub-style heading slug (what pandoc's gfm reader generates). */
export function slug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.trim()
		.replace(/\s/g, "-");
}

function headings(md: string): { level: number; text: string; id: string }[] {
	const out: { level: number; text: string; id: string }[] = [];
	let fence = false;
	for (const line of md.split("\n")) {
		if (/^(```|~~~)/.test(line)) fence = !fence;
		if (fence) continue;
		const m = line.match(/^(#{1,6})\s+(.*?)\s*$/);
		if (!m) continue;
		const attr = m[2].match(/\s*\{#([^}\s]+)\}$/);
		const text = attr ? m[2].slice(0, attr.index).trim() : m[2];
		out.push({ level: m[1].length, text, id: attr ? attr[1] : slug(text) });
	}
	return out;
}

function section(md: string, title: RegExp): string | null {
	const lines = md.split("\n");
	const start = lines.findIndex((l) => /^##\s/.test(l) && title.test(l.replace(/^##\s+/, "")));
	if (start < 0) return null;
	const end = lines.findIndex((l, i) => i > start && /^#{1,2}\s/.test(l));
	return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

const has = (md: string, re: RegExp) => headings(md).some((h) => h.level <= 3 && re.test(h.text));
const FIGURE = /\b\d+(?:[.,]\d+)?\s*(?:%|percent|x\b)|\b\d{2,}(?:,\d{3})*\b/;

export function lintDoc(md: string, purpose = "report"): Finding[] {
	const f: Finding[] = [];
	const add = (code: string, message: string) => f.push({ code, message });
	const ids = new Set(headings(md).map((h) => h.id));

	if (!/^\*\*(?:The ask|In one sentence|The goal|The decision)[^*]*:\*\*\s*\S/m.test(md))
		add("no-ask", "Add a '**The ask in one sentence:**' line under the title.");

	const take = section(md, /^takeaways?\b|^key (points|findings)|^summary\b/i);
	if (purpose !== "deck") {
		if (take === null) add("no-takeaways", "Add a '## Takeaways' section: 3–5 numbered claims, each linking to its proof.");
		else {
			for (const item of take.split("\n").filter((l) => /^\s*(\d+\.|[-*])\s/.test(l))) {
				if (!/\]\(#[^)]+\)/.test(item)) add("takeaway-unlinked", `Takeaway has no link to the section that proves it: ${item.trim().slice(0, 70)}`);
				if (FIGURE.test(item.replace(/\]\(#[^)]*\)|§\d+/g, "")) && !/\[\^[^\]]+\]|\]\(https?:/.test(item))
					add("uncited-figure", `Figure in a takeaway has no source: ${item.trim().slice(0, 70)}`);
			}
		}
	}

	for (const m of md.matchAll(/\]\(#([^)\s]+)\)/g)) if (!ids.has(m[1])) add("broken-anchor", `Link to #${m[1]} matches no heading.`);

	const defined = new Set([...md.matchAll(/^\[\^([^\]]+)\]:/gm)].map((m) => m[1]));
	for (const m of new Set([...md.matchAll(/\[\^([^\]]+)\](?!:)/g)].map((m) => m[1])))
		if (!defined.has(m)) add("missing-footnote", `Citation [^${m}] has no definition under Sources.`);

	if (FIGURE.test(md.replace(/^#.*$/gm, "").replace(/^\[\^.*$/gm, "")) && !/\*\*(?:Data to|As of|Snapshot|Data as of):\*\*/i.test(md))
		add("no-data-date", "Figures are used: add a '**Data to:** <date>' meta field so readers know how fresh they are.");

	if (PURPOSES_NEEDING_METHOD.has(purpose) && !has(md, /method|limits|how far to trust/i))
		add("no-method", "Add '## Method and limits': where the data came from and what it cannot show.");

	if (purpose === "brief") {
		if (!has(md, /bias/i)) add("no-biases", "Add '## Our biases, in the open': who wrote it, who graded the evidence, what each bias could distort.");
		if (!has(md, /check it yourself|verify/i)) add("no-check-yourself", "Add '## Check it yourself': each claim with a link a reader can follow without asking.");
		for (const m of md.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) add("relative-link", `Relative link ${m[1]} breaks outside the repo; use an absolute URL.`);
	}

	if (purpose === "decision") {
		if (!has(md, /options?\b/i)) add("no-options", "Add '## Options' with 2–4 options and their cost, risk and reversibility.");
		if (!has(md, /recommend/i)) add("no-recommendation", "Add '## Recommendation': one option and the reason that decides it.");
	}
	return f;
}
