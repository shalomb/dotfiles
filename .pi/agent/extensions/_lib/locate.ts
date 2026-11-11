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

// ---- zones, noise, scoring ----

export interface ZoneEnv {
	cwd: string;
	repoRoot: string;
	parent: string;
	home: string;
}

export const ZONE_WEIGHTS: Record<number, number> = { 0: 1, 1: 0.9, 2: 0.75, 3: 0.5, 4: 0.25 };

const under = (p: string, dir: string) => p === dir || p.startsWith(dir.endsWith("/") ? dir : `${dir}/`);

export function classifyZone(p: string, env: ZoneEnv): number {
	if (under(p, env.cwd)) return 0;
	if (under(p, env.repoRoot)) return 1;
	if (under(p, env.parent)) return 2;
	if (under(p, env.home)) return 3;
	return 4;
}

/** Directory names that never hold substance: deps, caches, build output, tool state. */
const NOISE_DIRS = new Set([
	".git", "node_modules", "dist", "target", "build", "coverage", "bower_components",
	".venv", "venv", "site-packages", "__pycache__", ".tox", ".mypy_cache", ".pytest_cache", ".ruff_cache",
	".terraform", ".next", ".gradle", ".m2", ".npm", ".idea", ".direnv",
]);
const NOISE_HOME_DIRS = [".cache", ".claude", ".gemini"];

export function isNoise(p: string, home: string): boolean {
	if (p.split("/").some((s) => NOISE_DIRS.has(s))) return true;
	return NOISE_HOME_DIRS.some((d) => under(p, `${home}/${d}`));
}

const WORKTREE_PENALTY = 0.5;

/** Match quality in [0,1]: fraction of terms found, bonus for hits in the basename. */
export function scoreCandidate(p: string, terms: string[]): number {
	if (!terms.length) return 0;
	const lower = p.toLowerCase();
	const base = lower.slice(lower.lastIndexOf("/") + 1);
	let sum = 0;
	for (const t of terms) {
		const tl = t.toLowerCase();
		if (base.includes(tl)) sum += 1;
		else if (lower.includes(tl)) sum += 0.6;
	}
	return sum / terms.length;
}

export interface Ranked {
	path: string;
	zone: number;
	score: number;
}

export function rankCandidates(paths: string[], terms: string[], env: ZoneEnv, mandatory: string[] = []): Ranked[] {
	const out: Ranked[] = [];
	for (const path of paths) {
		const low = path.toLowerCase();
		if (mandatory.some((m) => !low.includes(m.toLowerCase()))) continue;
		const match = scoreCandidate(path, terms);
		if (match <= 0) continue;
		const zone = classifyZone(path, env);
		out.push({ path, zone, score: match * ZONE_WEIGHTS[zone] * (path.includes("/.worktrees/") ? WORKTREE_PENALTY : 1) });
	}
	return out.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
}

export function collapseToAnchors(paths: string[], anchorOf: (p: string) => string): string[] {
	return [...new Set(paths.map(anchorOf))];
}

export interface Hit {
	path: string;
	line?: number;
	col?: number;
	snippet?: string;
}

export const MAX_RECEIPT_LINES = 25;

export function formatReceipt(hits: Hit[], total: number): string {
	const room = MAX_RECEIPT_LINES - 2;
	const lines = [`**locate**: ${total} candidate(s)`];
	for (const h of hits.slice(0, room)) {
		const loc = h.line ? `:${h.line}:${h.col ?? 1}` : "";
		lines.push(`- ${h.path}${loc}${h.snippet ? ` — ${h.snippet.trim().slice(0, 100)}` : ""}`);
	}
	if (hits.length > room) lines.push(`… ${hits.length - room} more`);
	return lines.join("\n");
}

// ---- harvesting + orchestration ----

import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";

const sh = promisify(execFile);

async function run(cmd: string, args: string[], cwd?: string): Promise<string> {
	try {
		const { stdout } = await sh(cmd, args, { cwd, maxBuffer: 64 * 1024 * 1024 });
		return stdout;
	} catch (e: any) {
		return typeof e?.stdout === "string" ? e.stdout : ""; // rg exits 1 on no match
	}
}

export interface LocateOptions {
	cwd: string;
	plocate?: boolean;
	/** Alternate plocate database (tests). */
	plocateDb?: string;
	home?: string;
}

const COLLAPSE_THRESHOLD = 5;
const TOP_ANCHORS = 15;

async function harvest(terms: string[], repoRoot: string, home: string, plocateDb: string | undefined, usePlocate: boolean): Promise<string[]> {
	const pool = new Set<string>();
	for (const rel of (await run("git", ["ls-files", "-co", "--exclude-standard"], repoRoot)).split("\n"))
		if (rel) pool.add(join(repoRoot, rel));
	if (usePlocate) {
		const out = await run("plocate", ["-i", "-l", "20000", "--all", ...(plocateDb ? ["-d", plocateDb] : []), ...terms]);
		for (const p of out.split("\n")) if (p) pool.add(p);
	}
	return [...pool].filter((p) => !isNoise(p, home));
}

/** Directories holding many hits become one anchor entry; the rest stay as files. */
export function collapseRanked(ranked: Ranked[]): { path: string; count: number }[] {
	const perDir = new Map<string, number>();
	for (const r of ranked) perDir.set(dirname(r.path), (perDir.get(dirname(r.path)) ?? 0) + 1);
	const anchorOf = (p: string) => ((perDir.get(dirname(p)) ?? 0) >= COLLAPSE_THRESHOLD ? `${dirname(p)}/` : p);
	return collapseToAnchors(ranked.map((r) => r.path), anchorOf).map((path) => ({
		path,
		count: path.endsWith("/") ? (perDir.get(path.slice(0, -1)) ?? 1) : 1,
	}));
}

async function inspect(anchors: { path: string; count: number }[], contentTerms: string[]): Promise<Hit[]> {
	const pattern = contentTerms.join("|");
	const hits: Hit[] = [];
	for (const a of anchors.slice(0, TOP_ANCHORS)) {
		if (!pattern) {
			hits.push({ path: a.count > 1 ? `${a.path} (${a.count} files)` : a.path });
			continue;
		}
		const out = await run("rg", ["-i", "--no-heading", "--line-number", "--column", "--max-count", "1", "-e", pattern, a.path]);
		const m = /^(?:[^:]*:)?(\d+):(\d+):(.*)$/.exec(out.split("\n")[0] ?? "");
		hits.push(m ? { path: a.path, line: +m[1], col: +m[2], snippet: m[3] } : { path: a.path });
	}
	return hits;
}

export async function findCandidates(input: string, opts: LocateOptions): Promise<Ranked[]> {
	const q = parseLocateQuery(input);
	if (!q.pathTerms.length) return [];
	const home = opts.home ?? homedir();
	const repoRoot = (await run("git", ["rev-parse", "--show-toplevel"], opts.cwd)).trim() || opts.cwd;
	const env: ZoneEnv = { cwd: opts.cwd, repoRoot, parent: dirname(repoRoot), home };
	const paths = await harvest(q.pathTerms, repoRoot, home, opts.plocateDb, opts.plocate !== false);
	return rankCandidates(paths, q.pathTerms, env, q.mandatory);
}

export async function runLocate(input: string, opts: LocateOptions): Promise<string> {
	const q = parseLocateQuery(input);
	if (!q.pathTerms.length) return "Usage: /locate <path terms> [in|within|containing <content terms>]";
	const ranked = await findCandidates(input, opts);
	const hits = await inspect(collapseRanked(ranked), q.contentTerms);
	return formatReceipt(hits, ranked.length);
}

// ---- picker / prompt integration ----

export function parseLocateArgs(args: string): { query: string; list: boolean } {
	let list = false;
	const rest = args.split(/\s+/).filter((w) => {
		if (w === "--list" || w === "-l") return (list = true), false;
		return w !== "";
	});
	return { query: rest.join(" "), list };
}

const displayPath = (p: string, cwd: string): string => {
	const rel = relative(cwd, p);
	return rel && !rel.startsWith("..") ? rel : p;
};

/** `display<TAB>absolute` rows for fzf (--with-nth=1, result = field 2). */
export function pickerRows(ranked: Ranked[], cwd: string): string {
	return ranked.map((r) => `${displayPath(r.path, cwd)}\t${r.path}`).join("\n");
}

/** Pi `@path` references; cwd-relative where possible, quoted if they contain spaces. */
export function toMentions(paths: string[], cwd: string): string {
	return paths
		.map((p) => {
			const rel = relative(cwd, p);
			const shown = rel && !rel.startsWith("../..") ? rel : p;
			return `@${/\s/.test(shown) ? `"${shown}"` : shown}`;
		})
		.join(" ");
}
