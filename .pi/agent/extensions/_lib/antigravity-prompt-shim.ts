/**
 * Pure core of the antigravity-prompt-shim extension.
 *
 * Google's Antigravity backend false-rejects (generic 429 "Resource has been
 * exhausted") any request whose system prompt opens with pi's default sentence
 * group. Phrase-level sanitising inside pi-antigravity 0.14.0 is not enough, so
 * we rewrite the whole opener on the final payload. See
 * https://github.com/Rahularya01/pi-antigravity/issues/137 and PR #147.
 *
 * Retire this once pi-antigravity ships #147 (or the backend drops the rule):
 * the shim is a no-op when no opener matches.
 */

export const OPENER_REPLACEMENT = "You are a coding agent helping the user with their project.";

/** Each rule matches an opener at the very start of a system-instruction part. */
export const OPENER_RULES: RegExp[] = [
	// Pi default, raw, and what pi-antigravity 0.14.0's sanitizer turns it into.
	/^You are a coding assistant running inside [^.]*\.\s*Help users inspect files, run commands, and modify code\./i,
	// Variants where only the first sentence survived.
	/^You are a coding assistant (?:running|operating) inside [^.]*\./i,
];

const FALSE_429 = /resource has been exhausted/i;

export function isFalse429(errorMessage: unknown): boolean {
	return typeof errorMessage === "string" && FALSE_429.test(errorMessage);
}

function rewriteText(text: string): string | undefined {
	for (const rule of OPENER_RULES) {
		if (rule.test(text)) return text.replace(rule, OPENER_REPLACEMENT);
	}
	return undefined;
}

/**
 * Returns a new payload with the opener rewritten, or undefined when the payload
 * is not an Antigravity request or nothing needs changing. Never mutates input.
 */
export function rewriteAntigravityPayload(payload: unknown): unknown | undefined {
	if (!payload || typeof payload !== "object") return undefined;
	const request = (payload as { request?: { systemInstruction?: { parts?: unknown } } }).request;
	const parts = request?.systemInstruction?.parts;
	if (!Array.isArray(parts)) return undefined;

	let changed = false;
	const newParts = parts.map((part) => {
		if (!part || typeof part.text !== "string") return part;
		const next = rewriteText(part.text);
		if (next === undefined) return part;
		changed = true;
		return { ...part, text: next };
	});
	if (!changed) return undefined;

	const req = request as Record<string, unknown> & { systemInstruction: Record<string, unknown> };
	return {
		...(payload as Record<string, unknown>),
		request: { ...req, systemInstruction: { ...req.systemInstruction, parts: newParts } },
	};
}
