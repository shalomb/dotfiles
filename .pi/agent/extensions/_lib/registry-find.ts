/** pi-find CLI: search the session registry with filters and render table/JSON. */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { openRegistry, backfill, search, reapLost, defaultDbPath, type Criteria, type Row } from "./registry";

export interface FindOptions {
	json: boolean;
	limit?: number;
	noScan?: boolean;
	db?: string;
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
	return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Resolve sessions root: PI_CODING_AGENT_DIR/sessions if exists, else ~/.pi/profiles/personal/sessions */
function defaultSessionsRoot(): string {
	const piDir = process.env.PI_CODING_AGENT_DIR;
	if (piDir) {
		const sessionsDir = join(piDir, "sessions");
		if (existsSync(sessionsDir)) return sessionsDir;
	}
	return join(homedir(), ".pi/profiles/personal/sessions");
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
			case "--no-scan": options.noScan = true; break;
			case "--db": options.db = val(t); break;
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

function renderTable(rows: Row[], limit?: number): string {
	const display = limit ? rows.slice(0, limit) : rows;
	const lines: string[] = [];
	lines.push("ID        STATUS          LAST ACTIVITY     BRANCH/WORKTREE      CWD");
	lines.push("─".repeat(100));

	for (const r of display) {
		const id = r.id.slice(0, 8);
		const status = (r.status || "?").padEnd(15);
		const activity = formatTimestamp(r.last_activity).padEnd(17);
		const branchWt = (r.branch || r.worktree || "—").slice(0, 20).padEnd(20);
		const cwd = shortCwd(r.cwd).slice(0, 40);
		lines.push(`${id}  ${status} ${activity} ${branchWt} ${cwd}`);
		lines.push(`         /resume ${r.id}`);
	}

	return lines.join("\n");
}

export function runFind(argv: string[], io: IO): string {
	const { criteria, options } = parseFindArgs(argv);
	const dbPath = options.db ?? defaultDbPath();
	const sessionsRoot = options.sessionsRoot ?? defaultSessionsRoot();

	const db = openRegistry(dbPath);

	if (!options.noScan) {
		reapLost(db);
		backfill(db, sessionsRoot);
	}

	const results = search(db, criteria);
	const limited = options.limit ? results.slice(0, options.limit) : results;

	if (options.json) {
		return JSON.stringify(limited, null, 2);
	}

	return renderTable(results, options.limit);
}
