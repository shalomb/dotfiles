// AGENT_CONTEXT: parse "- **KR-n.m** sentence — check: `cmd`" lines of the end-state doc and hash them for approval.
import { createHash } from "node:crypto";

export interface KeyResult {
	id: string;
	sentence: string;
	check: string;
}

const KR_LINE = /^- \*\*KR-\d+\.\d+\*\*/;
const KR_FULL = /^- \*\*(KR-\d+\.\d+)\*\* (.+?) — check: `(.+)`\s*$/;

function krLines(markdown: string): string[] {
	let fenced = false;
	const out: string[] = [];
	for (const line of markdown.split("\n")) {
		if (line.startsWith("```")) fenced = !fenced;
		else if (!fenced && KR_LINE.test(line)) out.push(line);
	}
	return out;
}

export function parseKeyResults(markdown: string): KeyResult[] {
	const out: KeyResult[] = [];
	for (const line of krLines(markdown)) {
		const m = KR_FULL.exec(line);
		if (m) out.push({ id: m[1], sentence: m[2], check: m[3] });
	}
	return out;
}

export function keyResultsHash(markdown: string): string {
	const body = krLines(markdown).map((l) => `${l}\n`).join("");
	return createHash("sha256").update(body).digest("hex").slice(0, 16);
}
