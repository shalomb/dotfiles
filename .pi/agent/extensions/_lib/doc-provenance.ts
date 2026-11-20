/**
 * Embedded provenance for /doc (spec: docs/specs/doc-system/vision-and-roadmap.md section 6).
 * Pure: builds a folded <details> recipe block (prompt, parameters, dated sources, execution contract,
 * audience preferences) and embeds it in a rendered page. Everything that enters the block or an export
 * is passed through sanitizeText first, so a shared document carries no private path and no secret.
 * Also the shared sanitiser for doc-dossier exports.
 */

export interface ProvenanceSource {
	ref: string;
	at: string;
}
export interface AudienceProfile {
	persona: string;
	prefers: string[];
}
export interface ProvenanceRecipe {
	prompt: string;
	params: Record<string, string | number | boolean>;
	sources: ProvenanceSource[];
	/** ISO timestamp supplied by the caller; this module reads no clock. */
	generatedAt: string;
	audience?: AudienceProfile[];
	/** Commands a reader runs to rebuild the document from their own copy of the sources. */
	contract: string[];
}

const PRIVATE = "<private-path>";
const SECRET = "<secret>";
const BODY = String.raw`[^\s"'<>()\[\],;]*[^\s"'<>()\[\],;.:]`;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replace home-directory style paths (/home, /Users, /root, ~/, C:\Users, and given homes) with <private-path>. */
export function redactPrivatePaths(text: string, opts: { homes?: string[] } = {}): string {
	let out = text;
	for (const home of opts.homes ?? []) {
		const h = home.replace(/\/+$/, "");
		if (h) out = out.replace(new RegExp(`${escapeRe(h)}(?:/${BODY})?`, "g"), PRIVATE);
	}
	return out
		.replace(new RegExp(`(?<![\\w])/(?:home|Users)/${BODY}`, "g"), PRIVATE)
		.replace(new RegExp(`(?<![\\w/])/root(?:/${BODY}|(?!\\w))`, "g"), PRIVATE)
		.replace(new RegExp(`(?<![\\w])~/${BODY}`, "g"), PRIVATE)
		.replace(new RegExp(`[A-Za-z]:\\\\Users\\\\${BODY}`, "g"), PRIVATE);
}

const SECRET_QUERY = /([?&](?:token|access_token|api[_-]?key|key|secret|password|sig|signature|auth)=)[^&\s#"']+/gi;
const SECRET_PAIR = /\b(password|passwd|secret|token|api[_-]?key|apikey)(\s*[=:]\s*)[^\s"',;&]+/gi;
const TOKENS = [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, /\bAKIA[0-9A-Z]{16}\b/g, /\bsk-[A-Za-z0-9_-]{20,}/g, /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g];

/** Mask URL credentials, secret query parameters, key=value secrets, bearer tokens and well-known token shapes. */
export function redactSecrets(text: string): string {
	let out = text
		.replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]*@/gi, "$1")
		.replace(SECRET_QUERY, `$1${SECRET}`)
		.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/g, `Bearer ${SECRET}`)
		.replace(SECRET_PAIR, `$1$2${SECRET}`);
	for (const re of TOKENS) out = out.replace(re, SECRET);
	return out;
}

export function sanitizeText(text: string, opts: { homes?: string[] } = {}): string {
	return redactSecrets(redactPrivatePaths(text, opts));
}

export function sanitizeRecipe(r: ProvenanceRecipe, opts: { homes?: string[] } = {}): ProvenanceRecipe {
	const s = (t: string) => sanitizeText(t, opts);
	return {
		prompt: s(r.prompt),
		params: Object.fromEntries(Object.entries(r.params).map(([k, v]) => [k, typeof v === "string" ? s(v) : v])),
		sources: r.sources.map((x) => ({ ref: s(x.ref), at: x.at })),
		generatedAt: r.generatedAt,
		audience: r.audience?.map((a) => ({ persona: s(a.persona), prefers: a.prefers.map(s) })),
		contract: r.contract.map(s),
	};
}

/** One prompt rule per audience persona, so a refresh enforces the declared preferences. */
export function audiencePromptRules(profiles: AudienceProfile[]): string {
	return profiles.map((p) => `- ${p.persona}: ${p.prefers.join("; ")}`).join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BLOCK = /<details class="doc-provenance">[\s\S]*?<\/details>/;
const DATA = /<script type="application\/json" id="doc-provenance-data">([\s\S]*?)<\/script>/;

export function renderProvenanceBlock(recipe: ProvenanceRecipe, opts: { homes?: string[] } = {}): string {
	const r = sanitizeRecipe(recipe, opts);
	const params = Object.entries(r.params).map(([k, v]) => `<li><code>${esc(k)}</code> = ${esc(String(v))}</li>`).join("");
	const sources = r.sources.map((x) => `<li>${esc(x.ref)} <time>${esc(x.at)}</time></li>`).join("");
	const audience = r.audience?.length ? `<h3>Audience preferences</h3><pre>${esc(audiencePromptRules(r.audience))}</pre>` : "";
	const data = JSON.stringify(r).replace(/</g, "\\u003c");
	return (
		`<details class="doc-provenance"><summary>How this document was made</summary>` +
		`<h3>Prompt</h3><pre>${esc(r.prompt)}</pre>` +
		`<h3>Parameters</h3><ul>${params}</ul>` +
		`<h3>Sources</h3><ul>${sources}</ul>` +
		audience +
		`<h3>Rebuild it</h3><pre>${esc(r.contract.join("\n"))}</pre>` +
		`<p>Generated <time>${esc(r.generatedAt)}</time>. Source references are relative or public; use your own copies.</p>` +
		`<script type="application/json" id="doc-provenance-data">${data}</script></details>`
	);
}

/** Put the block before </body> (or at the end), replacing any earlier block. */
export function embedProvenance(page: string, recipe: ProvenanceRecipe, opts: { homes?: string[] } = {}): string {
	const block = renderProvenanceBlock(recipe, opts);
	const base = page.replace(BLOCK, "");
	const i = base.lastIndexOf("</body>");
	return i < 0 ? base + block : base.slice(0, i) + block + base.slice(i);
}

export function extractProvenance(page: string): ProvenanceRecipe | undefined {
	const m = page.match(DATA);
	if (!m) return undefined;
	try {
		return JSON.parse(m[1]) as ProvenanceRecipe;
	} catch {
		return undefined;
	}
}
