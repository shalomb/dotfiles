/**
 * Dossier ("hopping-board") for /doc (spec: docs/specs/doc-system/vision-and-roadmap.md section 4).
 * Pure: a dossier is a synthesis plus hop-points into other artifacts. This module slices it for a meeting,
 * renders the hub page, plans a portable bundle (every entry sanitised, no absolute or traversal paths) and
 * writes it as a stored zip. It reads no files and no clock; callers pass file contents in.
 */
import { sanitizeText } from "./doc-provenance.ts";

export interface DossierHop {
	id: string;
	title: string;
	kind: string;
	/** Relative path inside the bundle, or a public URL. Absolute local paths are never bundled or linked. */
	ref: string;
	summary?: string;
	tags?: string[];
}
export interface Dossier {
	title: string;
	synthesis: string;
	hops: DossierHop[];
}
export interface SubsetOptions {
	ids?: string[];
	tags?: string[];
	limit?: number;
	audience?: string;
}
export interface BundleEntry {
	path: string;
	content: string;
}
export interface DossierBundle {
	entries: BundleEntry[];
	/** Relative refs that were wanted but not supplied. */
	missing: string[];
	/** Refs refused (absolute, home-relative or traversal paths). */
	skipped: string[];
}

/** Slice a dossier for a 30-minute sync: filter by ids and/or tags, cap the count, keep order. */
export function subsetDossier(d: Dossier, o: SubsetOptions): Dossier {
	let hops = d.hops;
	if (o.ids) hops = hops.filter((h) => o.ids!.includes(h.id));
	if (o.tags?.length) hops = hops.filter((h) => h.tags?.some((t) => o.tags!.includes(t)));
	if (o.limit !== undefined) hops = hops.slice(0, o.limit);
	return { ...d, title: o.audience ? `${d.title} (${o.audience})` : d.title, hops: hops.map((h) => ({ ...h })) };
}

const URL_REF = /^https?:\/\//i;
const isUrl = (ref: string) => URL_REF.test(ref);
/** A relative in-bundle path: not a URL, not absolute, not home-relative, no traversal, no drive letter. */
const isBundlable = (ref: string) => !isUrl(ref) && !/^(?:[/~\\]|[A-Za-z]:)/.test(ref) && !ref.split(/[\\/]/).includes("..");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function hopItem(h: DossierHop): string {
	const ref = sanitizeText(h.ref);
	const label = esc(sanitizeText(h.title));
	const link = isUrl(ref) || isBundlable(ref) ? `<a href="${esc(ref)}">${label}</a>` : label;
	const tags = h.tags?.length ? ` <span class="tags">${h.tags.map((t) => esc(sanitizeText(t))).join(", ")}</span>` : "";
	const summary = h.summary ? `<p>${esc(sanitizeText(h.summary))}</p>` : "";
	return `<li data-kind="${esc(h.kind)}">${link} <em>${esc(h.kind)}</em>${tags}${summary}</li>`;
}

/** Hub page: executive synthesis first, then the curated hop-points. */
export function renderDossier(d: Dossier): string {
	return (
		`<!doctype html><html><head><meta charset="utf-8"><title>${esc(sanitizeText(d.title))}</title></head><body>` +
		`<h1>${esc(sanitizeText(d.title))}</h1>` +
		`<section class="synthesis"><p>${esc(sanitizeText(d.synthesis))}</p></section>` +
		`<section class="hops"><h2>Hop-points</h2><ol>${d.hops.map(hopItem).join("")}</ol></section>` +
		`</body></html>\n`
	);
}

/** Plan a portable bundle: hub page, manifest, and every supplied local file, all sanitised. */
export function bundleDossier(d: Dossier, files: Record<string, string>): DossierBundle {
	const entries: BundleEntry[] = [];
	const missing: string[] = [];
	const skipped: string[] = [];
	const seen = new Set<string>();
	for (const h of d.hops) {
		if (isUrl(h.ref) || seen.has(h.ref)) continue;
		seen.add(h.ref);
		if (!isBundlable(h.ref)) {
			skipped.push(sanitizeText(h.ref));
			continue;
		}
		if (h.ref in files) entries.push({ path: h.ref, content: sanitizeText(files[h.ref]) });
		else missing.push(h.ref);
	}
	const manifest = {
		title: sanitizeText(d.title),
		hops: d.hops.map((h) => ({ id: h.id, title: sanitizeText(h.title), kind: h.kind, ref: sanitizeText(h.ref), tags: h.tags ?? [] })),
		files: entries.map((e) => e.path).sort(),
	};
	return {
		entries: [{ path: "index.html", content: renderDossier(d) }, { path: "manifest.json", content: JSON.stringify(manifest, null, 2) + "\n" }, ...entries],
		missing,
		skipped,
	};
}

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
function crc32(b: Uint8Array): number {
	let c = 0xffffffff;
	for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

/** Stored (uncompressed) zip, fixed DOS timestamp so output is deterministic. */
export function zipStore(entries: BundleEntry[]): Uint8Array {
	const enc = new TextEncoder();
	const DOS_TIME = 0;
	const DOS_DATE = (46 << 9) | (1 << 5) | 1; // 2026-01-01
	const parts: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;
	for (const e of entries) {
		const name = enc.encode(e.path);
		const data = enc.encode(e.content);
		const crc = crc32(data);
		const local = new Uint8Array(30 + name.length);
		const lv = new DataView(local.buffer);
		lv.setUint32(0, 0x04034b50, true);
		lv.setUint16(4, 20, true);
		lv.setUint16(6, 0x0800, true);
		lv.setUint16(10, DOS_TIME, true);
		lv.setUint16(12, DOS_DATE, true);
		lv.setUint32(14, crc, true);
		lv.setUint32(18, data.length, true);
		lv.setUint32(22, data.length, true);
		lv.setUint16(26, name.length, true);
		local.set(name, 30);
		const cd = new Uint8Array(46 + name.length);
		const cv = new DataView(cd.buffer);
		cv.setUint32(0, 0x02014b50, true);
		cv.setUint16(4, 20, true);
		cv.setUint16(6, 20, true);
		cv.setUint16(8, 0x0800, true);
		cv.setUint16(12, DOS_TIME, true);
		cv.setUint16(14, DOS_DATE, true);
		cv.setUint32(16, crc, true);
		cv.setUint32(20, data.length, true);
		cv.setUint32(24, data.length, true);
		cv.setUint16(28, name.length, true);
		cv.setUint32(42, offset, true);
		cd.set(name, 46);
		parts.push(local, data);
		central.push(cd);
		offset += local.length + data.length;
	}
	const cdSize = central.reduce((n, c) => n + c.length, 0);
	const end = new Uint8Array(22);
	const ev = new DataView(end.buffer);
	ev.setUint32(0, 0x06054b50, true);
	ev.setUint16(8, entries.length, true);
	ev.setUint16(10, entries.length, true);
	ev.setUint32(12, cdSize, true);
	ev.setUint32(16, offset, true);
	const all = [...parts, ...central, end];
	const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of all) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}
