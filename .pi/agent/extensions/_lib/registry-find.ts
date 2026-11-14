/** pi-find CLI: search the session registry with filters and render table/JSON. */
import { homedir } from "node:os";
import { enrichRows } from "./registry-gum";
import { gitFacts, openRegistry, search, reapLost, defaultDbPath, type Criteria, type Registry, type Row } from "./registry";
import { ftsSearch, refreshFts } from "./registry-fts";
import { backfillAll, discoverRoots, type Root } from "./registry-roots";

export interface FindOptions {
	json: boolean;
	limit?: number;
	all?: boolean;
	everywhere?: boolean;
	help?: boolean;
	noScan?: boolean;
	noPick?: boolean;
	db?: string;
	gumDb?: string;
	sessionsRoot?: string;
}

export interface FindArgs {
	criteria: Criteria;
	options: FindOptions;
}

/** Parse relative time like 7d, 12h, 2w to ISO timestamp. */
function parseSince(v: string, now = new Date()): string | undefined {
	const m = /^(\d+)([hdw])$/.exec(v);
	if (m) {
		const offset = Number(m[1]) * { h: 36e5, d: 864e5, w: 6048e5 }[m[2] as "h" | "d" | "w"];
		return new Date(now.getTime() - offset).toISOString();
	}
	// ISO date
	if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return undefined;
	const d = new Date(v.length === 10 ? `${v}T00:00:00.000Z` : v);
	return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function parseFindArgs(argv: string[], now = new Date()): FindArgs {
	const a = [...argv];
	const criteria: Criteria = {};
	const options: FindOptions = { json: false };
	const bare: string[] = [];

	const val = (flag: string) => {
		const v = a.shift();
		if (v === undefined) throw new Error(`${flag} needs a value`);
		return v;
	};

	const num = (flag: string) => {
		const n = Number(val(flag));
		if (!Number.isFinite(n) || n < 0) throw new Error(`${flag} needs a non-negative number`);
		return n;
	};

	while (a.length) {
		const t = a.shift()!;
		switch (t) {
			case "--id": criteria.id = val(t); break;
			case "--pid": criteria.pid = num(t); break;
			case "--tmux-session": criteria.tmuxSession = val(t); break;
			case "--tmux-window": criteria.tmuxWindow = val(t); break;
			case "--tmux-pane": criteria.tmuxPane = val(t); break;
			case "--branch": criteria.branch = val(t); break;
			case "--worktree": criteria.worktree = val(t); break;
			case "--worktree-path": criteria.worktreePath = val(t); break;
			case "--cwd": criteria.cwd = val(t); break;
			case "--repo": criteria.repo = val(t); break;
			case "--status": criteria.status = val(t); break;
			case "--since": {
				const s = parseSince(val(t), now);
				if (!s) throw new Error(`--since: expected 7d, 12h, 2w or ISO date`);
				criteria.since = s;
				break;
			}
			case "--keyword": criteria.keyword = val(t); break;
			case "--json": options.json = true; break;
			case "--limit": options.limit = num(t) || undefined; break;
			case "--all": options.all = true; break;
			case "--everywhere": case "-g": options.everywhere = true; break;
			case "--help": case "-h": options.help = true; break;
			case "--no-scan": options.noScan = true; break;
			case "--no-pick": options.noPick = true; break;
			case "--db": options.db = val(t); break;
			case "--gum-db": options.gumDb = val(t); break;
			case "--root": options.sessionsRoot = val(t); break;
			default:
				if (t.startsWith("--")) throw new Error(`unknown option ${t}`);
				bare.push(t);
		}
	}

	if (bare.length) {
		criteria.keyword = criteria.keyword ? `${criteria.keyword} ${bare.join(" ")}` : bare.join(" ");
	}

	return { criteria, options };
}

export interface Where { repoPath: string; worktreePath: string }

export interface Ladder { rows: Row[]; note?: string }

const ZONE_SAME_WORKTREE = 1;
const ZONE_SAME_REPO = 0.9;
const ZONE_ELSEWHERE = 0.5;

/**
 * Keyword search as a ladder of rungs, like /locate: exhaust the current repo
 * (all words, then some words) before looking elsewhere, then fall back to recent
 * sessions in this repo. The first rung with results wins; later rungs carry a note.
 * When no rung matches exactly, a fuzzy rung (FTS5 trigram, ADR-015) catches typos and one wrong word.
 * Results rank by (match) x (zone: this worktree > this repo > elsewhere), ADR-014.
 */
export function ladderSearch(db: Registry, c: Criteria, o: FindOptions, here: Where): Ladder {
	const words = (c.keyword ?? "").split(/\s+/).filter(Boolean);
	if (!words.length) return { rows: search(db, c) };
	const others = Object.entries(c).some(([k, v]) => k !== "keyword" && v !== undefined);
	const scoped = !o.everywhere && !others;
	const kw = words.join(" ");
	const inRepo: Criteria = scoped ? { ...c, repo: here.repoPath } : c;
	const rungs: { c: Criteria; note?: string; fuzzy?: boolean }[] = [{ c: inRepo }];
	if (words.length > 1) rungs.push({ c: { ...inRepo, anyWords: true }, note: `no session has all of "${kw}"; showing sessions matching some of the words` });
	if (scoped) {
		rungs.push({ c, note: `nothing for "${kw}" in this repo; showing other repos` });
		if (words.length > 1) rungs.push({ c: { ...c, anyWords: true }, note: `nothing for "${kw}" in this repo; showing other repos matching some of the words` });
	}
	rungs.push({ c, fuzzy: true, note: `no exact match for "${kw}"; showing closest fuzzy matches` });
	if (scoped) {
		const { keyword: _k, ...bare } = c;
		rungs.push({ c: { ...bare, repo: here.repoPath }, note: `nothing matched "${kw}" anywhere; showing recent sessions in this repo` });
	}
	for (const r of rungs) {
		const rows = r.fuzzy ? fuzzyRows(db, c, words) : search(db, r.c);
		if (!rows.length) continue;
		const zone = (x: Row) => ((x.worktree_path ?? x.repo) === here.worktreePath ? ZONE_SAME_WORKTREE : x.repo === here.repoPath ? ZONE_SAME_REPO : ZONE_ELSEWHERE);
		const match = (x: Row, i: number) => (r.fuzzy ? (rows.length - i) / rows.length : x.hits !== undefined ? Math.min(1, x.hits / words.length) : 1);
		const score = (x: Row, i: number) => match(x, i) * zone(x);
		const ranked = rows.map((x, i) => ({ x, i, s: score(x, i) })).sort((p, q) => q.s - p.s || p.i - q.i).map((p) => p.x);
		return { rows: ranked, note: r.note };
	}
	return { rows: [] };
}

const FUZZY_LIMIT = 50;

/** Fuzzy matches in FTS rank order, restricted to the non-keyword filters. [] when the index is unavailable. */
function fuzzyRows(db: Registry, c: Criteria, words: string[]): Row[] {
	try {
		const ids = ftsSearch(db, words, FUZZY_LIMIT);
		const { keyword: _k, ...filters } = c;
		const allowed = Object.values(filters).some((v) => v !== undefined) ? new Set(search(db, filters).map((r) => r.id)) : null;
		const out: Row[] = [];
		for (const id of ids) {
			if (allowed && !allowed.has(id)) continue;
			const [row] = search(db, { id });
			if (row) out.push(row);
		}
		return out;
	} catch { return []; }
}

export interface IO {
	write: (s: string) => void;
	error: (s: string) => void;
}

function formatTimestamp(ts: string | null): string {
	if (!ts) return "—";
	const d = new Date(ts);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function shortCwd(c: string): string {
	const home = homedir();
	return c.startsWith(home) ? "~" + c.slice(home.length) : c;
}

export const DEFAULT_LIMIT = 20;

export const USAGE = `Usage: pi-find [filters] [options] [keyword...]

Find pi sessions in the registry (live, lost, died-mid-turn and backfilled history).

Filters:
  --id <uuid>             session id (prefix ok)
  --pid <n>               process id
  --tmux-session <name>   tmux session
  --tmux-window <id>      tmux window
  --tmux-pane <id>        tmux pane
  --branch <name>         git branch
  --worktree <name>       git worktree name
  --worktree-path <path>  git worktree path
  --cwd <path>            working directory
  --repo <name>           repository
  --status <s>            running | ended | lost | died-mid-turn ...
  --since <when>          7d, 12h, 2w or ISO date
  --keyword <text>        search prompts/digest (bare words work too)

Keyword search widens in rungs, stopping at the first with results (a note says which):
  all words in this repo -> some words in this repo -> other repos -> recent in this repo.
Results rank this worktree > this repo > elsewhere. Use -g/--everywhere to skip the repo rungs;
any other filter also disables them.

Options:
  --json                  JSON output
  --limit <n>             show at most n rows (default ${DEFAULT_LIMIT})
  --all                   no row cap
  -g, --everywhere        don't scope a bare keyword search to the current repo
  --no-scan               skip reap/backfill, query the registry as is
  --no-pick               never open fzf, print the table
  --db <path>             registry database
  --gum-db <path>         gum project db for repo name/remote (default ~/.cache/gum/gum.db)
  --root <path>           one sessions root to backfill from (default: all known pi session roots)
  -h, --help              this text

Examples:
  pi-find --status lost --since 7d
  pi-find --branch feat/session-registry --json
  pi-find --tmux-pane %12
  pi-find flux capacitor --all
`;

function renderTable(rows: Row[], limit?: number, note?: string): string {
	const display = limit ? rows.slice(0, limit) : rows;
	const lines: string[] = [];
	if (note) lines.push(`note: ${note}`);
	lines.push("ID        STATUS          PROFILE      LAST ACTIVITY     BRANCH/WORKTREE      CWD");
	lines.push("─".repeat(100));

	for (const r of display) {
		const id = r.id.slice(0, 8);
		const status = (r.status || "?").padEnd(15);
		const profile = (r.profile || "—").slice(0, 12).padEnd(12);
		const activity = formatTimestamp(r.last_activity).padEnd(17);
		// Show worktree name if present, otherwise branch
		const branchWt = (r.worktree || r.branch || "—").slice(0, 20).padEnd(20);
		const cwd = shortCwd(r.cwd).slice(0, 40);
		lines.push(`${id}  ${status} ${profile} ${activity} ${branchWt} ${cwd}`);
		lines.push(`         /resume ${r.id}`);
	}

	if (display.length < rows.length) {
		lines.push(`… ${rows.length - display.length} more (use --all or --limit <n>)`);
	}

	return lines.join("\n");
}

export interface FindResult { rows: Row[]; note?: string; options: FindOptions; cap?: number }

/** Scan roots, refresh the index and run the ladder. Rows are not capped; `cap` is the display cap. */
export function findSessions(argv: string[], cwd = process.cwd()): FindResult {
	const { criteria, options } = parseFindArgs(argv);
	const cap = options.all ? undefined : (options.limit ?? DEFAULT_LIMIT);
	const db = openRegistry(options.db ?? defaultDbPath());

	if (!options.noScan) {
		const roots: Root[] = options.sessionsRoot ? [{ path: options.sessionsRoot, profile: "custom" }] : discoverRoots({ home: homedir(), env: process.env });
		reapLost(db);
		backfillAll(db, roots);
	}
	try { refreshFts(db); } catch { /* fuzzy rung degrades to exact search */ }

	const facts = gitFacts(cwd);
	const repoPath = facts.repo ?? cwd;
	const { rows, note } = ladderSearch(db, criteria, options, { repoPath, worktreePath: facts.worktreePath ?? repoPath });
	return { rows, note, options, cap };
}

/** Stable output for pipes and --json: table, or JSON array with the note on stderr. */
export function formatFind({ rows, note, options, cap }: FindResult, io?: IO): string {
	if (options.json) {
		if (note) io?.error(`note: ${note}\n`);
		return JSON.stringify(enrichRows(cap ? rows.slice(0, cap) : rows, options.gumDb), null, 2);
	}
	return renderTable(rows, cap, note);
}

export function runFind(argv: string[], io?: IO, cwd = process.cwd()): string {
	const { options } = parseFindArgs(argv);
	if (options.help) return USAGE;
	return formatFind(findSessions(argv, cwd), io);
}
