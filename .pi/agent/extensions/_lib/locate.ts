/** /locate query parsing. See .pi/docs/specs/locate-command/spec.md */

export const CONNECTORS = ["within", "inside", "in", "containing", "contains", "for", "about", "with"] as const;
const FILLERS = new Set(["find", "look", "and", "the", "a", "an", "to", "me", "show", "locate", "search", "where", "is"]);

export interface LocateQuery {
	pathTerms: string[];
	contentTerms: string[];
	/** Last connector seen in the sentence. */
	connector?: string;
	/** Terms marked with `+`. */
	mandatory: string[];
}

function tokenize(input: string): { text: string; quoted: boolean }[] {
	const out: { text: string; quoted: boolean }[] = [];
	const re = /(\+?)"([^"]*)"|(\S+)/g;
	for (let m = re.exec(input); m; m = re.exec(input)) {
		if (m[3] !== undefined) out.push({ text: m[3], quoted: false });
		else out.push({ text: (m[1] ?? "") + m[2], quoted: true });
	}
	return out;
}

export function parseLocateQuery(input: string): LocateQuery {
	const q: LocateQuery = { pathTerms: [], contentTerms: [], mandatory: [] };
	let pivoted = false;
	for (const tok of tokenize(input)) {
		let text = tok.text;
		const plus = text.startsWith("+") && text.length > 1;
		if (plus) text = text.slice(1);
		const lower = text.toLowerCase();
		if (!tok.quoted && !plus) {
			if ((CONNECTORS as readonly string[]).includes(lower)) {
				q.connector = lower;
				// A connector only pivots once path terms exist; "for" after fillers is a lead-in.
				if (q.pathTerms.length) pivoted = true;
				continue;
			}
			if (FILLERS.has(lower)) continue;
		}
		if (plus) q.mandatory.push(text);
		(pivoted && !plus ? q.contentTerms : q.pathTerms).push(text);
	}
	return q;
}
