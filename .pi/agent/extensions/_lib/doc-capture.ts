/**
 * Live meeting capture for /doc (spec: docs/specs/doc-system/vision-and-roadmap.md section 7).
 * Pure: plans where annotation notes go (the shadow store, outside any git tree) and how to hide
 * artifacts using only git excludes / refs/doc/* names. Performs no I/O, reads no clock, no network.
 */

export interface Note {
	section: string;
	text: string;
	kind: string;
	at: string;
}

const slug = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

/** Private ref name for a document under refs/doc/*. */
export function docRef(docId: string): string {
	const s = slug(docId);
	if (!s) throw new Error("doc-capture: empty doc id");
	return `refs/doc/${s}`;
}

/** Notes file inside the shadow store: <shadowRoot>/<repoKey>/<doc>.notes.jsonl. */
export function captureFile(shadowRoot: string, repoKey: string, docId: string): string {
	if (!repoKey || /[\\/]|^\.+$/.test(repoKey)) throw new Error("doc-capture: bad repo key");
	const root = shadowRoot.replace(/\/+$/, "");
	return `${root}/${repoKey}/${docRef(docId).slice("refs/doc/".length)}.notes.jsonl`;
}

/** Throw when path is a git root or lies inside one (capture must never taint a tree). */
export function assertOutsideGitTree(path: string, gitRoots: string[]): void {
	for (const r of gitRoots) {
		const root = r.replace(/\/+$/, "");
		if (root && (path === root || path.startsWith(`${root}/`))) {
			throw new Error(`doc-capture: refusing to write inside git tree ${root}`);
		}
	}
}

export function makeNote(i: { section: string; text: string; kind?: string; at: string }): Note {
	const text = i.text.trim();
	if (!text) throw new Error("doc-capture: empty note");
	return { section: i.section.trim(), text, kind: i.kind ?? "note", at: i.at };
}

export const formatNote = (n: Note): string => JSON.stringify(n);

/** Parse JSONL notes, skipping malformed or non-note lines. */
export function parseNotes(raw: string): Note[] {
	const out: Note[] = [];
	for (const line of raw.split("\n")) {
		if (!line.trim()) continue;
		try {
			const o = JSON.parse(line);
			if (o && typeof o.section === "string" && typeof o.text === "string" && typeof o.kind === "string" && typeof o.at === "string") {
				out.push(o as Note);
			}
		} catch {
			/* skip */
		}
	}
	return out;
}

/** Return .git/info/exclude content with pattern present exactly once. */
export function addExclude(content: string, pattern: string): string {
	if (content.split("\n").some((l) => l.trim() === pattern)) return content;
	const base = content === "" || content.endsWith("\n") ? content : `${content}\n`;
	return `${base}${pattern}\n`;
}

export interface CaptureInput {
	shadowRoot: string;
	repoKey: string;
	docId: string;
	gitRoots: string[];
	note: { section: string; text: string; kind?: string; at: string };
}
export interface CapturePlan {
	file: string;
	ref: string;
	/** JSONL line (newline-terminated) to append to file. */
	line: string;
}

export function planCapture(i: CaptureInput): CapturePlan {
	const file = captureFile(i.shadowRoot, i.repoKey, i.docId);
	assertOutsideGitTree(file, i.gitRoots);
	return { file, ref: docRef(i.docId), line: `${formatNote(makeNote(i.note))}\n` };
}
