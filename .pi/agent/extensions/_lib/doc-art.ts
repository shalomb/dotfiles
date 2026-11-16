/**
 * Per-doc edge art: the `art:` front-matter key picks the motif pair for the brand's edge bands.
 * The masks themselves live in the brand stylesheet (--art-waves/flow/arcs/circuit); this module
 * only reads the key and emits the :root override that points --art-right / --art-left at them.
 */
const PAIRS: Record<string, [right: string, left: string]> = {
	waves: ["waves", "flow"],
	flow: ["flow", "arcs"],
	arcs: ["arcs", "circuit"],
	circuit: ["circuit", "waves"],
};

export type Art = keyof typeof PAIRS | "none";

/** The `art:` value of a leading `---` front-matter block; undefined when absent or unknown. */
export function artFromFrontMatter(md: string): Art | undefined {
	const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
	if (!m) return undefined;
	const line = /^art:\s*["']?([A-Za-z]+)["']?\s*$/m.exec(m[1]);
	const v = line?.[1].toLowerCase();
	return v && (v === "none" || v in PAIRS) ? (v as Art) : undefined;
}

/** CSS for the chosen motif; empty when the doc sets none (the brand default applies). */
export function artCss(art: Art | undefined): string {
	if (!art) return "";
	if (art === "none") return "html.present body::before,html.present body::after{display:none}";
	const [right, left] = PAIRS[art];
	return `:root{--art-right:var(--art-${right});--art-left:var(--art-${left})}`;
}
