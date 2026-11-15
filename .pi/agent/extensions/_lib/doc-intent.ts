/**
 * /doc intent: read purpose, depth, audience and style from the arguments, and
 * leave everything else (topic, facts, sources) to be inferred from the session.
 */
import { principleRules, templateGuide } from "./doc-principles.ts";
import { isTemplateType, type TemplateType } from "./doc-templates.ts";

export const PURPOSES = ["decision", "report", "status", "workshop", "deck", "brief"] as const;
export type Purpose = (typeof PURPOSES)[number];
export type Depth = 1 | 6 | 20 | "deeper" | "shorter";
export type Action = "write" | "revise" | "find" | "list" | "file" | "open" | "index";

export interface DocIntent {
	action: Action;
	purpose?: Purpose;
	depth?: Depth;
	audience?: string;
	style?: "formal" | "house";
	/** epicmap | readout | decision: write structured input and publish it with that template. */
	template?: TemplateType;
	topic: string;
}

const PURPOSE_WORDS: Record<string, Purpose> = {
	decision: "decision", decide: "decision", rfc: "decision", adr: "decision", options: "decision",
	report: "report", analysis: "report", findings: "report",
	brief: "brief", concept: "brief", pitch: "brief",
	status: "status", update: "status",
	workshop: "workshop", session: "workshop",
	deck: "deck", slides: "deck", presentation: "deck",
};
const DEPTH_WORDS: Record<string, Depth> = {
	"one-pager": 1, "1-pager": 1, onepager: 1, short: 1,
	"six-pager": 6, "6-pager": 6, sixpager: 6, brief: 6,
	"twenty-pager": 20, "20-pager": 20, long: 20, full: 20,
	deeper: "deeper", longer: "deeper", shorter: "shorter", tighter: "shorter",
};
const STYLE_WORDS: Record<string, "formal" | "house"> = { formal: "formal", corporate: "formal", house: "house", informal: "house" };
const LIBRARY: Action[] = ["find", "list", "file", "open", "index"];

export const DEFAULT_DEPTH: Record<Purpose, 1 | 6 | 20> = { decision: 1, report: 6, status: 1, workshop: 1, deck: 6, brief: 6 };

/** A concept brief: shaped work, after discovery and before the build commits, read by several audiences. */
const BRIEF_GUIDE = [
	"- kind: concept brief. Use it when exploration is done, the build is about to commit, and several audiences must align. One decision only: write a decision. Finished work: write a status.",
	"- readers in order: the builders first (contract, seams, tests in ::: engineers folds), then stakeholders (each section's first paragraph), then leadership (masthead, KPIs, decisions).",
	"- sections: Takeaways; The problem; The model; How we kept options open (options carried, seam, converge when, deciding evidence); Evidence (hypotheses with pass and kill lines); Assumptions (owner, check that retires it); Prerequisites vs satisfied during build; Plan: gates, not dates; Risks (ROAM); Decisions we need (::: decision); What we need from you (ask per role, by when, default if silent; risk owners confirm); Our biases, in the open; Check it yourself (claim, source, link); Method and limits; What changed; How to read and regenerate this document (lineage, audience preferences, regeneration prompt); Sources.",
	"- links: absolute URLs only (the page is read outside the repo); every figure gets a footnote.",
];

const isModifier = (w: string) => w.toLowerCase() in DEPTH_WORDS || w.toLowerCase() in STYLE_WORDS;

export function parseDocArgs(raw: string): DocIntent {
	const words = raw.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.toLowerCase();
	if (first && (LIBRARY as string[]).includes(first)) {
		const rest = words.slice(1);
		const p = rest[0] && PURPOSE_WORDS[rest[0].toLowerCase()];
		if (first === "list" && p) return { action: "list", purpose: p, topic: rest.slice(1).join(" ") };
		return { action: first as Action, topic: rest.join(" ") };
	}

	// "decision" is also a purpose: it is the template only for `decision <input>.json` or `decision template [topic]`.
	const second = words[1]?.toLowerCase();
	if (first && isTemplateType(first) && (first !== "decision" || second === "template" || second?.endsWith(".json"))) {
		const rest = words.slice(second === "template" ? 2 : 1);
		const style = rest.map((w) => STYLE_WORDS[w.toLowerCase()]).find(Boolean);
		return { action: "write", template: first, ...(style ? { style } : {}), topic: rest.filter((w) => !(w.toLowerCase() in STYLE_WORDS)).join(" ") };
	}

	const intent: DocIntent = { action: "write", purpose: undefined, depth: undefined, audience: undefined, style: undefined, topic: "" };
	const topic: string[] = [];
	for (let i = 0; i < words.length; i++) {
		const w = words[i];
		const lw = w.toLowerCase();
		if (lw === "for" && i + 1 < words.length) {
			const aud: string[] = [];
			while (i + 1 < words.length && !isModifier(words[i + 1])) aud.push(words[++i]);
			intent.audience = aud.join(" ");
			continue;
		}
		if (!intent.purpose && lw in PURPOSE_WORDS && topic.length === 0) {
			intent.purpose = PURPOSE_WORDS[lw];
			if (lw in DEPTH_WORDS) intent.depth = DEPTH_WORDS[lw];
			continue;
		}
		if (lw in DEPTH_WORDS) { intent.depth = DEPTH_WORDS[lw]; continue; }
		if (lw in STYLE_WORDS) { intent.style = STYLE_WORDS[lw]; continue; }
		topic.push(w);
	}
	intent.topic = topic.join(" ");
	const onlyModifiers = !intent.purpose && !intent.topic && (intent.audience || intent.style || intent.depth === "deeper" || intent.depth === "shorter");
	if (onlyModifiers) intent.action = "revise";
	return intent;
}

const pages = (d: 1 | 6 | 20) => (d === 1 ? "1 page" : `${d} pages`);

function buildTemplatePrompt(type: TemplateType, i: DocIntent): string {
	const lines = [
		`Write a document from what this session already knows, as structured input for the ${type} template.`,
		`- topic: ${i.topic || "the most recent unresolved difficulty, open question or analysis in this conversation; if there is nothing to work from, ask what it is about"}`,
	];
	if (type === "epicmap") lines.push("- the input is a local Jira cache folder and an epic key; never fetch from Jira, and ask for the cache folder or the key if you do not have them");
	lines.push(
		"",
		`1. Call doc_template with type=${type} to get a valid example input and the rules.`,
		"2. Write the structured input as JSON to a scratch file in the OS temp directory (not inside a git tree).",
		"3. Never add brand, theme, css or colour keys; the renderer rejects them and the page's look is fixed.",
		`4. Call doc_publish with template=${type} and source=<that file>${i.style ? `, style=${i.style}` : ""}.`,
		"5. If it answers with 'error: <field> ...', fix that field in the input and publish again.",
		"6. The page's gate, references, labels and recipe are fixed by the template; do not try to imitate them in the input.",
		"Use only facts already in this session; cite where each figure came from.",
	);
	return lines.join("\n");
}

export function buildDocPrompt(i: DocIntent): string {
	if (i.template) return buildTemplatePrompt(i.template, i);
	if (i.action === "revise") {
		const changes = [
			i.depth === "deeper" && "go one depth deeper (1 → 6 → 20 pages: add argument, then appendices)",
			i.depth === "shorter" && "cut one depth shorter (20 → 6 → 1 page: keep the summary and takeaways, drop the rest)",
			typeof i.depth === "number" && `rewrite at ${pages(i.depth)}`,
			i.audience && `rewrite for ${i.audience}: their vocabulary, what they must decide or do, and what they already know`,
			i.style && `render in the ${i.style} style`,
		].filter(Boolean);
		return [
			"/skill:docs-authoring Revise the last document written or filed in this session (its Markdown source).",
			`Changes: ${changes.join("; ")}.`,
			"",
			principleRules(),
			"",
			"Edit the same source file, then call doc_publish on it again (the library keeps the old render under versions/).",
		].join("\n");
	}

	const lines = ["/skill:docs-authoring Write a document from what this session already knows."];
	if (i.purpose) {
		const depth = typeof i.depth === "number" ? i.depth : DEFAULT_DEPTH[i.purpose];
		lines.push(`- purpose: ${i.purpose} (use the ${i.purpose} skeleton)`);
		lines.push(`- depth: ${pages(depth)}${i.depth ? "" : " (default for this purpose)"}`);
		if (i.purpose === "brief") lines.push(...BRIEF_GUIDE);
	} else {
		lines.push(
			"- purpose: choose the purpose from the session: open options or a choice → decision; findings from data → report; finished work → status; questions needing people together → workshop.",
		);
		if (typeof i.depth === "number") lines.push(`- depth: ${pages(i.depth)}`);
	}
	lines.push(
		i.topic
			? `- topic: ${i.topic}`
			: "- topic: the most recent unresolved difficulty, open question or analysis in this conversation. If two candidates are equally likely, ask once with ask_user_question; if there is nothing to work from, ask what it is about.",
	);
	if (i.purpose === "brief" && !i.style) lines.push("- style: formal");
	lines.push(`- audience: ${i.audience ?? "infer from the purpose (decision → whoever owns the call; report → readers outside the work)"}`);
	if (i.style) lines.push(`- style: ${i.style}`);
	lines.push(
		"",
		"Use only facts already in this session (files read, commands run, tickets, data); every figure gets a citation to where it came from.",
		"",
		principleRules(),
		"",
		templateGuide(),
		"",
		"Start the draft with one line: 'Assumed: <purpose> for <audience>, <depth>, from <topic>. Say deeper, shorter, for <who> or formal to change.'",
		"Write the Markdown next to the work it describes, then call the doc_publish tool on it. It renders, checks, files and returns the URLs. Fix what its findings flag that you can fix from the facts, then publish once more.",
	);
	return lines.join("\n");
}
