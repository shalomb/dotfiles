/**
 * Checks a /doc Markdown source against the authoring rules before it is filed.
 * Findings are warnings: the document is still rendered and filed.
 */
import { HYPE_WORDS, JARGON_TERMS } from "./doc-principles.ts";

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

/** Markdown with code, links' targets and heading anchors removed: what a reader reads as prose. */
function prose(md: string): string {
	return md
		.replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, " ")
		.replace(/`[^`\n]*`/g, " ")
		.replace(/\]\([^)]*\)/g, "]")
		.replace(/https?:\/\/\S+/g, " ")
		.replace(/\{#[^}]*\}/g, " ")
		.replace(/^\[\^[^\]]+\]:.*$/gm, " ");
}

/**
 * Escape a literal for use inside a RegExp. The patterns below are built from the constant word lists in
 * doc-principles.ts, escaped here, and never from the document being checked.
 */
const reEscape = (word: string) => word.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

const BASIS = /\((measured|derived|judged)\b[^)]*\)/i;
const LABEL_TITLE = /^(simulation|report|decision|status|update|summary|notes?)\s*:/i;

/** Principles checkable from plain text (docs/specs/doc-system/principles.md): hype, jargon, label titles. Warnings only. */
function checkPrinciples(md: string): Finding[] {
	const f: Finding[] = [];
	const add = (code: string, message: string) => f.push({ code, message });
	const text = prose(md);
	for (const w of HYPE_WORDS)
		for (const m of text.matchAll(new RegExp(`(?<![\\w-])${reEscape(w)}(?![\\w-])`, "gi")))
			add("hype-word", `'${m[0]}' says nothing a reader can check: say what it does instead.`);
	for (const term of JARGON_TERMS) {
		const first = text.search(new RegExp(`\\b${term}\\b`));
		if (first < 0) continue;
		// explained AT first use: 'plain words (TERM)' around it, or 'TERM (plain words)' straight after it
		const before = text.slice(Math.max(0, first - 70), first + term.length);
		const after = text.slice(first + term.length, first + term.length + 90);
		const glossed = new RegExp(`[a-z][a-z -]{3,60}\\s\\(${term}$`, "i").test(before) || /^\s*\([^()]{4,80}\)/.test(after);
		if (!glossed) add("unglossed-jargon", `${term} is used before it is explained: write 'plain meaning (${term})' at first use.`);
	}
	const title = md.match(/^#\s+(.+?)\s*$/m)?.[1] ?? "";
	if (title && (LABEL_TITLE.test(title) || (!/[?]$/.test(title) && title.split(/\s+/).length < 4)))
		add("label-title", `The title '${title.slice(0, 60)}' names a topic. State the finding, or ask the decision as a question.`);
	return f;
}

const wordCount = (md: string) => prose(md).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Per-type structure rules for the document types that are not decision/report/brief. */
function lintType(md: string, purpose: string): Finding[] {
	const f: Finding[] = [];
	const add = (code: string, message: string) => f.push({ code, message });
	if (purpose === "guide" && !/^\s*1\.\s/m.test(prose(md))) add("guide-steps", "Add numbered steps ('1. ...') a reader can follow in order.");
	if (purpose === "runbook") {
		if (!/^(```|~~~)/m.test(md)) add("runbook-code", "Add a code block with the exact commands to run.");
		if (!has(md, /roll ?back/i)) add("runbook-rollback", "Add a '## Rollback' section: how to undo the procedure.");
	}
	if (purpose === "changerecord") {
		if (!has(md, /back-?out/i)) add("changerecord-backout", "Add a '## Back-out' section: how to undo the change.");
		if (!has(md, /risk/i)) add("changerecord-risk", "Add a '## Risk' section: what could go wrong and how likely.");
	}
	if (purpose === "postmortem") {
		if (!has(md, /timeline/i)) add("postmortem-timeline", "Add a '## Timeline' section: what happened, in order.");
		if (!has(md, /action/i)) add("postmortem-actions", "Add a '## Action items' section: what changes, who owns it.");
	}
	if (purpose === "onepager") {
		if (wordCount(md) > 400) add("onepager-length", `A one-pager is at most about 400 words; this has ${wordCount(md)}.`);
		if (!has(md, /\bask\b/i) && !/^\*\*(?:The ask)[^*]*:\*\*\s*\S/m.test(md)) add("onepager-ask", "State the ask: a '## Ask' section or a '**The ask in one sentence:**' line.");
	}
	return f;
}

export function lintDoc(md: string, purpose = "report"): Finding[] {
	const f: Finding[] = [];
	const add = (code: string, message: string) => f.push({ code, message });
	const ids = new Set(headings(md).map((h) => h.id));

	for (const x of checkPrinciples(md)) f.push(x);

	if (!/^\*\*(?:The ask|In one sentence|The goal|The decision)[^*]*:\*\*\s*\S/m.test(md))
		add("no-ask", "Add a '**The ask in one sentence:**' line under the title.");

	const take = section(md, /^takeaways?\b|^key (points|findings)|^summary\b/i);
	if (purpose !== "deck") {
		if (take === null) add("no-takeaways", "Add a '## Takeaways' section: 3–5 numbered claims, each linking to its proof.");
		else {
			for (const item of take.split("\n").filter((l) => /^\s*(\d+\.|[-*])\s/.test(l))) {
				if (!/\]\(#[^)]+\)/.test(item)) add("takeaway-unlinked", `Takeaway has no link to the section that proves it: ${item.trim().slice(0, 70)}`);
				if (!BASIS.test(item)) add("takeaway-no-basis", `Say whether the takeaway is (measured), (derived: the rule) or (judged): ${item.trim().slice(0, 70)}`);
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
	if (PURPOSES_NEEDING_METHOD.has(purpose) || purpose === "decision") {
		if (!has(md, /(do not|don't|does not) know|unknowns?|limits|open questions?/i) && !/\[OPEN\s*[—-]/.test(md))
			add("no-unknowns", "State what you do not know: a '## What we do not know' section, a 'Method and limits' section, or inline [OPEN — ...].");
	}

	if (purpose === "brief") {
		if (!has(md, /bias/i)) add("no-biases", "Add '## Our biases, in the open': who wrote it, who graded the evidence, what each bias could distort.");
		if (!has(md, /check it yourself|verify/i)) add("no-check-yourself", "Add '## Check it yourself': each claim with a link a reader can follow without asking.");
		for (const m of md.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) add("relative-link", `Relative link ${m[1]} breaks outside the repo; use an absolute URL.`);
	}

	if (purpose === "decision") {
		if (!has(md, /options?\b/i)) add("no-options", "Add '## Options' with 2–4 options and their cost, risk and reversibility.");
		if (!has(md, /recommend/i)) add("no-recommendation", "Add '## Recommendation': one option and the reason that decides it.");
		else if (!/recommended\s*\(judged\)/i.test(md))
			add("recommendation-basis", "Mark the recommendation as yours: 'Recommended (judged): B', then the one reason and what would change your mind.");
	}
	f.push(...lintType(md, purpose));
	return f;
}
