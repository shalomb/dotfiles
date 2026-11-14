/**
 * Document library for /doc: rendered documents kept in the agent-skills shadow root.
 * Ported from lead-docs scripts/library.py; the on-disk layout is unchanged:
 *
 *   $XDG_CACHE_HOME/agent-skills/docs   (override: LEAD_DOCS_ROOT)
 *     index.html                        search page, one card per document
 *     index.json                        the same cards as data (the API seam)
 *     <kind>/<date>-<slug>/index.html   latest render
 *                          source.md    Markdown source (when given)
 *                          meta.json    title, kind, date, summary, tags, repo, origin
 *                          versions/    earlier renders, never deleted
 */
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { renderSearchPage } from "./doc-search.ts";

export const KINDS = ["brief", "one-pager", "report", "deck", "status", "decision", "workshop"] as const;

type Env = Record<string, string | undefined>;

export interface DocMeta {
	title: string;
	kind: string;
	date: string;
	summary: string;
	tags: string[];
	repo: string;
	origin: string;
}
export interface DocCard extends DocMeta {
	path: string;
}
export interface FileOptions {
	html: string;
	kind?: string;
	source?: string;
	title?: string;
	summary?: string;
	tags?: string[];
	date?: string;
}

const SUMMARY_LINE = /^\*\*(?:The ask in one sentence|In one sentence|The goal in one sentence):\*\*\s*(.+)$/m;

export function docRoot(env: Env = process.env): string {
	if (env.LEAD_DOCS_ROOT) return env.LEAD_DOCS_ROOT;
	return join(env.XDG_CACHE_HOME || join(homedir(), ".cache"), "agent-skills", "docs");
}

export function slugify(text: string): string {
	const s = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	return s.slice(0, 60).replace(/-+$/, "") || "untitled";
}

const unescape = (s: string) =>
	s
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, "\u00a0")
		.replace(/&amp;/g, "&");

export function findTitle(sourceText: string, page: string, htmlPath: string): string {
	for (const line of sourceText.split("\n")) if (line.startsWith("# ")) return line.slice(2).trim();
	const m = page.match(/<title>([\s\S]*?)<\/title>/i);
	if (m) return unescape(m[1]).trim();
	return htmlPath.replace(/^.*\//, "").replace(/\.[^.]*$/, "");
}

export function findSummary(sourceText: string): string {
	const m = sourceText.match(SUMMARY_LINE);
	if (m) return m[1].trim();
	for (const para of sourceText.split(/\n\s*\n/)) {
		const p = para.trim();
		if (p && !/^(#|\*\*|---|\||```|\[)/.test(p)) return p.replace(/\s+/g, " ").slice(0, 240);
	}
	return "";
}

export function findHtmlSummary(page: string): string {
	const m = page.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
	if (m) return unescape(m[1]).trim().slice(0, 240);
	const body = page.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
	for (const p of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
		const text = unescape(p[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
		if (text.length >= 40) return text.slice(0, 240);
	}
	return "";
}

export function findRepo(source?: string): string {
	if (!source) return "";
	let url = "";
	try {
		url = execFileSync("git", ["-C", dirname(resolve(source)), "remote", "get-url", "origin"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
	} catch {
		return "";
	}
	const m = url.match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?$/);
	return m ? m[1] : "";
}

/** Copy content and timestamps, but make the copy readable by the web server. */
function publish(src: string, dest: string): void {
	copyFileSync(src, dest);
	const st = statSync(src);
	utimesSync(dest, st.atime, st.mtime);
	chmodSync(dest, 0o644);
}

const stamp = (d = new Date()) => {
	const p = (n: number, w = 2) => String(n).padStart(w, "0");
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${p(d.getMilliseconds(), 3)}000`;
};
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function listDocs(opts: { kind?: string; onSkip?: (msg: string) => void } = {}, env: Env = process.env): DocCard[] {
	const root = docRoot(env);
	const out: DocCard[] = [];
	if (!existsSync(root)) return out;
	for (const kind of readdirSync(root).sort()) {
		const kdir = join(root, kind);
		if (!statSync(kdir).isDirectory()) continue;
		for (const name of readdirSync(kdir).sort()) {
			const metaPath = join(kdir, name, "meta.json");
			if (!existsSync(metaPath)) continue;
			try {
				const data = JSON.parse(readFileSync(metaPath, "utf8"));
				for (const k of ["title", "kind", "date"]) if (!(k in data)) throw new Error(`missing ${k}`);
				out.push({ ...data, path: `${kind}/${name}/index.html` });
			} catch (e) {
				(opts.onSkip ?? ((m) => console.error(m)))(`skipped ${metaPath}: ${(e as Error).message}`);
			}
		}
	}
	out.sort((a, b) => (a.date === b.date ? b.title.localeCompare(a.title) : b.date.localeCompare(a.date)));
	return opts.kind ? out.filter((d) => d.kind === opts.kind) : out;
}

export function findDocs(words: string[], env: Env = process.env): DocCard[] {
	const ws = words.map((w) => w.toLowerCase());
	return listDocs({}, env).filter((e) => {
		const hay = [e.title, e.summary ?? "", e.kind, e.repo ?? "", e.date, ...(e.tags ?? [])].join(" ").toLowerCase();
		return ws.every((w) => hay.includes(w));
	});
}

export function showDoc(e: DocCard, env: Env = process.env): string {
	return `${e.date}  ${e.kind.padEnd(10)} ${e.title}  ->  ${join(docRoot(env), e.path)}`;
}

export function writeIndex(env: Env = process.env): string {
	const root = docRoot(env);
	const cards = listDocs({}, env);
	mkdirSync(root, { recursive: true });
	writeFileSync(join(root, "index.json"), `${JSON.stringify(cards, null, 1)}\n`);
	const page = join(root, "index.html");
	writeFileSync(page, renderSearchPage(JSON.stringify(cards), KINDS));
	return page;
}

export function fileDoc(o: FileOptions, env: Env = process.env): string {
	const kind = o.kind ?? "report";
	if (!(KINDS as readonly string[]).includes(kind)) throw new Error(`unknown kind '${kind}'; use one of ${KINDS.join(", ")}`);
	if (!existsSync(o.html)) throw new Error(`no such file: ${o.html}`);
	const text = o.source ? readFileSync(o.source, "utf8") : "";
	const page = readFileSync(o.html, "utf8");
	const title = o.title || findTitle(text, page, o.html);
	const date = o.date || today();
	const entry = join(docRoot(env), kind, `${date}-${slugify(title)}`);
	mkdirSync(entry, { recursive: true });
	const current = join(entry, "index.html");
	if (existsSync(current)) {
		mkdirSync(join(entry, "versions"), { recursive: true });
		publish(current, join(entry, "versions", `${stamp()}.html`));
	}
	publish(o.html, current);
	if (o.source) publish(o.source, join(entry, "source.md"));
	const meta: DocMeta = {
		title,
		kind,
		date,
		summary: o.summary || findSummary(text) || findHtmlSummary(page),
		tags: o.tags ?? [],
		repo: findRepo(o.source),
		origin: resolve(o.source || o.html),
	};
	const metaPath = join(entry, "meta.json");
	writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
	chmodSync(metaPath, 0o644);
	writeIndex(env);
	return current;
}
