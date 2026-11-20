/**
 * The /doc principles every document follows, as one source for the prompt /doc builds and the lint.
 * The templates enforce the same rules in doc-render/templates/kernel.py; a test keeps the lists equal.
 * Spec: docs/specs/doc-system/principles.md. The docs-authoring skill explains them in full.
 */

/** Words the checks reject. Kept equal to HYPE_WORDS in doc-render/templates/kernel.py. */
export const HYPE_WORDS = [
	"seamless",
	"leverage",
	"synergy",
	"robust",
	"cutting-edge",
	"game-changing",
	"revolutionary",
	"best-in-class",
	"powerful",
	"blazing",
	"world-class",
	"awesome",
	"amazing",
] as const;

/** Terms of art that need a plain meaning at first use. Kept equal to JARGON_TERMS in kernel.py. */
export const JARGON_TERMS = ["ALB", "ACM", "PITR", "GSI", "TFC", "APMS", "SG", "EBS", "ROAM"] as const;

/** Whether a claim was measured (a tool produced it), derived (computed by a stated rule) or judged (a person's reading). */
export const BASIS_LABELS = ["measured", "derived", "judged"] as const;

export interface Rule {
	/** The principle number in docs/specs/doc-system/principles.md. */
	id: string;
	/** The bold lead the docs-authoring skill uses for the rule. */
	name: string;
	text: string;
}

export const RULES: Rule[] = [
	{ id: "P1", name: "Cite every claim", text: "A number, status, cause or recommendation names its source: a footnote [^id] in Markdown, a reference [r1] in a template. A claim with no source says it is judged." },
	{ id: "P2", name: "Label the basis", text: "Mark each takeaway (measured), (derived: say the rule) or (judged). Colour and status lights count as judged unless you print the rule." },
	{ id: "P6", name: "State what you do not know", text: "List unknowns as unknowns, or inline as [OPEN — ...]. Never fill a gap with a guess; mark a suggestion nobody tried (untested)." },
	{ id: "P5", name: "Mark your recommendation", text: "Name one option as 'Recommended (judged): B', give the one reason that decides it, and say what would change your mind." },
	{ id: "P18", name: "No hype, and explain jargon", text: `Do not use: ${HYPE_WORDS.join(", ")}. Define a term of art at first use as 'term (plain meaning)'.` },
];

/** The short rules that go into every Markdown /doc prompt. Under 1600 characters on purpose. */
export function principleRules(): string {
	return ["Principles (the checks warn on these):", ...RULES.map((r, i) => `${i + 1}. ${r.name}. ${r.text}`)].join("\n");
}

export interface TemplateHint {
	type: string;
	purpose: string;
	use: string;
}

export const TEMPLATE_HINTS: TemplateHint[] = [
	{ type: "epicmap", purpose: "status", use: "what blocks and depends on one Jira epic, from a local Jira cache" },
	{ type: "readout", purpose: "report", use: "where one request stands: layers, conflicts, open options, needs, risks" },
	{ type: "decision", purpose: "decision", use: "one decision with a deadline: options, one recommendation, who answers by when" },
];

/** Points structured content at the templates instead of Markdown. */
export function templateGuide(): string {
	return [
		"Templates: if the content has one of these shapes, prefer the template to Markdown. Call doc_template with the type for an example input, then doc_publish with template=<type>.",
		...TEMPLATE_HINTS.map((t) => `- ${t.type} (files as ${t.purpose}): ${t.use}.`),
	].join("\n");
}
