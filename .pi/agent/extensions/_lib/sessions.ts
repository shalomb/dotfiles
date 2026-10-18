/**
 * Scan agent session stores (pi, claude, copilot, gemini/antigravity) into one
 * normalised list and render it as a table.
 * CLI: bun sessions.ts [--width N] [--limit N] [--tool pi,claude,...] [--plain]
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export interface Session {
	tool: "pi" | "claude" | "copilot" | "gemini";
	id: string;
	cwd: string;
	start: Date;
	end: Date;
	msgs: number;
	summary: string;
	/** First few user prompts plus the last one (for grep + digest). */
	prompts?: string[];
}

const HOME = homedir();
const MIN_YEAR = 2000;

/** Parse a timestamp; fall back when invalid, ancient (0001-01-01) or in the far future. */
export function sanitizeTime(v: unknown, fallback: Date): Date {
	const now = new Date();
	if (fallback.getTime() > now.getTime() + 864e5) fallback = now; // mtime itself can be skewed
	if (typeof v !== "string" && typeof v !== "number") return fallback;
	const s = typeof v === "string" ? v.trim().replace(" ", "T").replace(/(\.\d{3})\d+/, "$1") : v;
	const d = new Date(s);
	if (isNaN(d.getTime()) || d.getFullYear() < MIN_YEAR || d.getTime() > Date.now() + 864e5) return fallback;
	return d;
}

const MAX_PROMPT = 300;
/** Keep first 3 user prompts and the most recent one. */
function pushPrompt(list: string[], p: string, state: { last: string }) {
	p = clean(p).slice(0, MAX_PROMPT);
	if (!p) return;
	if (list.length < 3) list.push(p); else state.last = p;
}
const withLast = (list: string[], st: { last: string }) => (st.last ? [...list, st.last] : list);
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const safeParse = (l: string): any => { try { return JSON.parse(l); } catch { return undefined; } };
const subdirs = (p: string) => (existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(p, e.name)) : []);
const jsonlIn = (p: string) => (existsSync(p) ? readdirSync(p).filter((f) => f.endsWith(".jsonl")).map((f) => join(p, f)) : []);
const text = (c: any): string =>
	typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p?.type === "text" ? p.text : "")).join(" ") : "";

function lastTimestamp(lines: string[]): unknown {
	for (let i = lines.length - 1; i >= 0 && i >= lines.length - 20; i--) {
		if (!lines[i]) continue;
		const ts = safeParse(lines[i])?.timestamp;
		if (ts) return ts;
	}
}

function sqlite(db: string, sql: string): any[] {
	if (!existsSync(db)) return [];
	const r = spawnSync("sqlite3", ["-json", "-readonly", db, sql], { encoding: "utf8", maxBuffer: 64 << 20 });
	if (r.status !== 0 || !r.stdout.trim()) return [];
	return safeParse(r.stdout) ?? [];
}

export function scanPi(root = join(HOME, ".pi/agent/sessions")): Session[] {
	const out: Session[] = [];
	for (const dir of subdirs(root)) {
		for (const f of jsonlIn(dir)) {
			const lines = readFileSync(f, "utf8").split("\n");
			const head = safeParse(lines[0]);
			if (head?.type !== "session") continue;
			const mtime = statSync(f).mtime;
			let summary = "";
			let msgs = 0;
			const pl: string[] = [], st = { last: "" };
			for (const l of lines) {
				if (!l.includes('"type":"message"')) continue;
				msgs++;
				if (l.includes('"role":"user"')) {
					const t = text(safeParse(l)?.message?.content);
					if (!summary) summary = clean(t);
					pushPrompt(pl, t, st);
				}
			}
			const start = sanitizeTime(head.timestamp, mtime);
			out.push({ tool: "pi", id: head.id, cwd: head.cwd ?? "", start, end: sanitizeTime(lastTimestamp(lines), mtime), msgs, summary, prompts: withLast(pl, st) });
		}
	}
	return out;
}

export function scanClaude(root = join(HOME, ".claude/projects")): Session[] {
	const out: Session[] = [];
	for (const dir of subdirs(root)) {
		for (const f of jsonlIn(dir)) {
			const lines = readFileSync(f, "utf8").split("\n");
			const mtime = statSync(f).mtime;
			let msgs = 0, summary = "", cwd = "", id = "", firstTs: unknown;
			const pl: string[] = [], st = { last: "" };
			for (const l of lines) {
				if (!l) continue;
				const turn = /"type":"(user|assistant)"/.test(l) && !l.includes('"isMeta":true');
				if (turn) msgs++;
				const isUser = turn && l.includes('"type":"user"');
				if (firstTs && summary && cwd && !isUser) continue;
				const o = safeParse(l);
				if (!o) continue;
				firstTs ??= o.timestamp;
				cwd ||= o.cwd ?? "";
				id ||= o.sessionId ?? "";
				if (o.type === "user" && !o.isMeta) {
					const t = text(o.message?.content);
					if (!summary) summary = clean(t);
					pushPrompt(pl, t, st);
				}
			}
			if (!msgs && !summary) continue;
			const fid = f.split("/").pop()!.replace(/\.jsonl$/, "");
			out.push({ tool: "claude", id: id || fid, cwd, start: sanitizeTime(firstTs, mtime), end: sanitizeTime(lastTimestamp(lines), mtime), msgs, summary, prompts: withLast(pl, st) });
		}
	}
	return out;
}

export function scanCopilot(root = join(HOME, ".copilot")): Session[] {
	const db = new Map<string, any>(sqlite(join(root, "session-store.db"), "select id,cwd,summary from sessions").map((r) => [r.id, r]));
	const out: Session[] = [];
	for (const f of jsonlIn(join(root, "session-state"))) {
		const lines = readFileSync(f, "utf8").split("\n");
		const mtime = statSync(f).mtime;
		const head = safeParse(lines[0]);
		const id = head?.data?.sessionId ?? f.split("/").pop()!.replace(/\.jsonl$/, "");
		let msgs = 0, first = "";
		const pl: string[] = [], st = { last: "" };
		for (const l of lines) {
			if (l.includes('"type":"user.message"')) {
				msgs++;
				const t = safeParse(l)?.data?.content ?? "";
				if (!first) first = clean(t);
				pushPrompt(pl, t, st);
			} else if (l.includes('"type":"assistant.message"')) msgs++;
		}
		const row = db.get(id);
		out.push({
			tool: "copilot", id, cwd: row?.cwd ?? "",
			start: sanitizeTime(head?.data?.startTime ?? head?.timestamp, mtime),
			end: sanitizeTime(lastTimestamp(lines), mtime),
			msgs, summary: clean(row?.summary || first), prompts: withLast(pl, st),
		});
	}
	return out;
}

/** Gemini CLI keeps no on-disk sessions here; Antigravity's conversation summaries DB is the source. */
export function scanGemini(root = join(HOME, ".gemini")): Session[] {
	const rows = sqlite(
		join(root, "antigravity-cli", "conversation_summaries.db"),
		"select conversation_id,title,preview,step_count,last_modified_time,last_user_input_time,workspace_uris from conversation_summaries",
	);
	return rows.map((r) => {
		const end = sanitizeTime(r.last_modified_time, new Date(0));
		const start = sanitizeTime(r.last_user_input_time, end);
		const uri = (safeParse(r.workspace_uris ?? "[]") ?? [])[0] ?? "";
		return {
			tool: "gemini" as const, id: r.conversation_id, cwd: String(uri).replace(/^file:\/\//, ""),
			start: start > end ? end : start, end, msgs: r.step_count ?? 0, summary: clean(r.title || r.preview || ""),
			prompts: r.preview ? [clean(r.preview).slice(0, MAX_PROMPT)] : [],
		};
	});
}


// ---------------------------------------------------------------- filters / args
export const TOOLS = ["pi", "claude", "copilot", "gemini"] as const;

export interface Filters {
	tools?: string[];
	since?: Date;
	until?: Date;
	cwd?: string;
	grep?: string;
	minMsgs?: number;
	limit?: number;
}

/** `7d`, `12h`, `2w` (relative to now) or an ISO date. */
export function parseSince(v: string, now = new Date()): Date | undefined {
	const m = /^(\d+)([hdw])$/.exec(v);
	if (m) return new Date(now.getTime() - Number(m[1]) * { h: 36e5, d: 864e5, w: 6048e5 }[m[2] as "h" | "d" | "w"]);
	if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return undefined;
	const d = new Date(v.length === 10 ? `${v}T00:00:00Z` : v);
	return isNaN(d.getTime()) ? undefined : d;
}

export interface Args { cmd: "list" | "summarize"; filters: Filters; plain: boolean; width?: number; dryRun: boolean; model?: string }

export function parseArgs(argv: string[], now = new Date()): Args {
	const a = [...argv];
	let cmd: Args["cmd"] = "list";
	if (a[0] === "list" || a[0] === "summarize") cmd = a.shift() as Args["cmd"];
	const f: Filters = {};
	const bare: string[] = [];
	const out: Args = { cmd, filters: f, plain: false, dryRun: false };
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
	const date = (flag: string) => {
		const d = parseSince(val(flag), now);
		if (!d) throw new Error(`${flag}: expected 7d, 12h, 2w or YYYY-MM-DD`);
		return d;
	};
	while (a.length) {
		const t = a.shift()!;
		switch (t) {
			case "--tool": {
				f.tools = val(t).split(",").filter(Boolean);
				const bad = f.tools.find((x) => !(TOOLS as readonly string[]).includes(x));
				if (bad) throw new Error(`--tool: unknown tool "${bad}" (one of ${TOOLS.join(", ")})`);
				break;
			}
			case "--since": f.since = date(t); break;
			case "--until": f.until = date(t); break;
			case "--cwd": case "--project": f.cwd = val(t); break;
			case "--grep": f.grep = val(t); break;
			case "--min-msgs": f.minMsgs = num(t); break;
			case "--limit": f.limit = num(t) || undefined; break;
			case "--width": out.width = num(t); break;
			case "--model": out.model = val(t); break;
			case "--plain": out.plain = true; break;
			case "--dry-run": out.dryRun = true; break;
			default:
				if (t.startsWith("--")) throw new Error(`unknown option ${t}`);
				bare.push(t);
		}
	}
	if (bare.length) f.grep = f.grep ? `${f.grep} ${bare.join(" ")}` : bare.join(" ");
	return out;
}

/** Filter, then newest-first and limited. */
export function applyFilters(all: Session[], f: Filters): Session[] {
	const cwd = f.cwd?.toLowerCase(), grep = f.grep?.toLowerCase();
	const rows = all.filter((s) => {
		if (f.tools && !f.tools.includes(s.tool)) return false;
		if (f.since && s.start < f.since) return false;
		if (f.until && s.start > f.until) return false;
		if (cwd && !s.cwd.toLowerCase().includes(cwd)) return false;
		if (f.minMsgs !== undefined && s.msgs < f.minMsgs) return false;
		if (grep && !`${s.summary}\n${(s.prompts ?? []).join("\n")}\n${s.cwd}`.toLowerCase().includes(grep)) return false;
		return true;
	});
	rows.sort((a, b) => b.start.getTime() - a.start.getTime());
	return f.limit ? rows.slice(0, f.limit) : rows;
}

/**
 * Compact text of sessions for an LLM, oldest first. Newest sessions are kept when
 * the budget is exceeded; the omission is stated explicitly so the model does not guess.
 */
export function buildDigest(sessions: Session[], maxChars = 60_000): { text: string; included: number; omitted: number } {
	const entry = (s: Session) => {
		const head = `## ${fmtStart(s.start)} ${s.tool} ${shortCwd(s.cwd) || "?"} (${fmtDur(s.end.getTime() - s.start.getTime())}, ${s.msgs} msgs)`;
		const body = [`title: ${s.summary.slice(0, 160)}`, ...(s.prompts ?? []).map((p) => `- ${p.slice(0, 220)}`)];
		return [head, ...body].join("\n") + "\n";
	};
	const newestFirst = [...sessions].sort((a, b) => b.start.getTime() - a.start.getTime());
	const kept: string[] = [];
	let used = 0;
	for (const s of newestFirst) {
		const e = entry(s);
		if (used + e.length > maxChars) break;
		kept.push(e);
		used += e.length;
	}
	const omitted = sessions.length - kept.length;
	let text = kept.reverse().join("\n");
	if (omitted > 0) text += `\n[${omitted} older session(s) omitted to fit the size budget]\n`;
	return { text, included: kept.length, omitted };
}

export const SUMMARY_PROMPT =
	"You are summarising a developer's past AI-coding-agent sessions (tools: pi, claude, copilot, gemini). " +
	"From the digest below write a concise report in Markdown: (1) a 2-3 sentence overview; (2) a timeline grouped by day, " +
	"one line per theme with the project (cwd) and tool; (3) recurring themes / unfinished threads. " +
	"Use only what the digest says; do not invent details. Be brief.";

/** Run a one-shot, tool-less Haiku call via the pi CLI. */
export function runSummary(digest: string, model = "anthropic/claude-haiku-4-5"): { ok: boolean; text: string } {
	const r = spawnSync("pi", ["-p", "--no-session", "--no-tools", "-ne", "-ns", "-np", "-nc", "--thinking", "off", "--model", model, SUMMARY_PROMPT], {
		input: digest, encoding: "utf8", timeout: 180_000, maxBuffer: 16 << 20,
	});
	if (r.status !== 0) return { ok: false, text: (r.stderr || r.error?.message || `pi exited ${r.status}`).trim() };
	return { ok: true, text: r.stdout.trim() };
}

export function scanAll(tools?: string[]): Session[] {
	const all: Record<string, () => Session[]> = { pi: scanPi, claude: scanClaude, copilot: scanCopilot, gemini: scanGemini };
	return Object.entries(all).filter(([k]) => !tools || tools.includes(k)).flatMap(([k, fn]) => {
		try { return fn(); } catch (e) { console.error(`${k}: scan failed: ${(e as Error).message}`); return []; }
	});
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmtStart = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
export function fmtDur(ms: number): string {
	const m = Math.round(ms / 6e4);
	if (m < 1) return "<1m";
	if (m < 60) return `${m}m`;
	if (m < 1440) return `${Math.floor(m / 60)}h${pad(m % 60)}m`;
	return `${Math.floor(m / 1440)}d${pad(Math.floor((m % 1440) / 60))}h`;
}
const shortCwd = (c: string) => (c.startsWith(HOME) ? "~" + c.slice(HOME.length) : c);
const fit = (s: string, n: number, left = false) =>
	s.length <= n ? s.padEnd(n) : left ? "…" + s.slice(s.length - n + 1) : s.slice(0, n - 1) + "…";

const COLOR: Record<string, string> = { pi: "35", claude: "33", copilot: "36", gemini: "32" };

export function renderTable(sessions: Session[], opts: { width?: number; plain?: boolean; limit?: number } = {}): string {
	const width = opts.width ?? 120;
	const rows = [...sessions].sort((a, b) => b.start.getTime() - a.start.getTime()).slice(0, opts.limit ?? Infinity);
	const W = { tool: 7, start: 16, dur: 6, msgs: 5, cwd: Math.min(34, Math.max(16, Math.floor(width * 0.3))) };
	const fixed = W.tool + W.start + W.dur + W.msgs + W.cwd + 5; // 5 single-space gutters
	const sumW = Math.max(10, width - fixed);
	const line = (t: string, s: string, d: string, m: string, c: string, sum: string, color?: string) => {
		const tool = color && !opts.plain ? `\x1b[${color}m${t}\x1b[0m` : t;
		return [tool, s, d, m, c, sum].join(" ").trimEnd();
	};
	const lines = [line(fit("TOOL", W.tool), fit("START", W.start), fit("DUR", W.dur), "MSGS".padStart(W.msgs), fit("CWD", W.cwd), "SUMMARY")];
	for (const r of rows) {
		lines.push(line(
			fit(r.tool, W.tool), fmtStart(r.start), fit(fmtDur(r.end.getTime() - r.start.getTime()), W.dur),
			String(r.msgs).padStart(W.msgs), fit(shortCwd(r.cwd), W.cwd, true), fit(r.summary, sumW).trimEnd(), COLOR[r.tool],
		));
	}
	return lines.join("\n") + "\n";
}

if (import.meta.main) {
	process.stdout.on("error", (e: NodeJS.ErrnoException) => process.exit(e.code === "EPIPE" ? 0 : 1)); // `less` quit early
	let args: Args;
	try { args = parseArgs(process.argv.slice(2)); } catch (e) { console.error(`sessions: ${(e as Error).message}`); process.exit(2); }
	const rows = applyFilters(scanAll(args.filters.tools), args.filters);
	if (args.cmd === "list") {
		process.stdout.write(renderTable(rows, { width: args.width || process.stdout.columns || 120, plain: args.plain }) + `${rows.length} sessions\n`);
	} else if (!rows.length) {
		console.log("No sessions match those filters.");
	} else {
		const d = buildDigest(rows);
		if (args.dryRun) { console.log(d.text); process.exit(0); }
		console.error(`Summarising ${d.included} session(s)${d.omitted ? ` (${d.omitted} older omitted)` : ""} with haiku…`);
		const r = runSummary(d.text, args.model);
		if (!r.ok) { console.error(`summary failed: ${r.text}`); process.exit(1); }
		console.log(`# Sessions summary — ${rows.length} matched, ${d.included} summarised\n\n${r.text}`);
	}
}
