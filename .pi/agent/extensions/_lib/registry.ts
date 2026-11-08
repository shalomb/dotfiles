// Session registry: SQLite (WAL) kept OUTSIDE the repo; backfilled from pi JSONL metadata.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

// Runtime adapter for Bun vs Node sqlite
interface DbAdapter {
	exec(sql: string): void;
	query(sql: string): { get(...args: any[]): any; all(...args: any[]): any[]; run(...args: any[]): void };
}

function createDbAdapter(path: string): DbAdapter {
	if (process.versions.bun) {
		// Use bun:sqlite (native Bun API)
		const { Database } = require("bun:sqlite");
		return new Database(path) as DbAdapter;
	} else {
		// Use node:sqlite (Node v24+ API)
		const { DatabaseSync } = require("node:sqlite");
		const db = new DatabaseSync(path);
		// Node's sqlite doesn't accept undefined - convert to null
		const normalizeArgs = (args: any[]) => args.map(v => v === undefined ? null : v);
		return {
			exec: (sql: string) => db.exec(sql),
			query: (sql: string) => {
				const stmt = db.prepare(sql);
				return {
					get: (...args: any[]) => stmt.get(...normalizeArgs(args)),
					all: (...args: any[]) => stmt.all(...normalizeArgs(args)),
					run: (...args: any[]) => stmt.run(...normalizeArgs(args))
				};
			}
		};
	}
}

export type Registry = DbAdapter;
export interface GitFacts { branch?: string }
export interface Row { id: string; file: string; cwd: string; repo: string; worktree: string | null; branch: string | null; profile: string | null; model: string | null; started: string; ended: string | null; status: string; last_activity: string | null; digest: string }
export interface Criteria { id?: string; cwd?: string; worktree?: string; branch?: string; repo?: string; status?: string; since?: string; keyword?: string; pid?: number; tmuxSession?: string; tmuxWindow?: string; tmuxPane?: string }

export const defaultDbPath = () => join(process.env.XDG_STATE_HOME ?? join(homedir(), ".local/state"), "pi-registry/registry.db");

export function openRegistry(path = defaultDbPath()): Registry {
	if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
	const db = createDbAdapter(path);
	db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;");
	db.exec(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, file TEXT, cwd TEXT, repo TEXT, worktree TEXT, branch TEXT, profile TEXT, model TEXT, started TEXT, ended TEXT, status TEXT, last_activity TEXT, digest TEXT DEFAULT '', mtime_ms REAL, size INTEGER);
CREATE TABLE IF NOT EXISTS instances (session_id TEXT, pid INTEGER, tmux_session TEXT, tmux_window TEXT, tmux_pane TEXT, scope TEXT, started TEXT, ended TEXT);
CREATE INDEX IF NOT EXISTS idx_inst_sid ON instances(session_id);`);
	return db;
}

const TAIL = 256 * 1024;
const safe = (l: string): any => { try { return JSON.parse(l); } catch { return undefined; } };
const clip = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);
const textOf = (c: any): string => typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p?.type === "text" ? p.text : "")).join(" ") : "";

/** Classify the last JSONL line (regex: the line may hold huge thinking blobs). */
export function classifyTail(last: string): string {
	if (!last) return "unknown";
	const role = /"role":"(\w+)"/.exec(last)?.[1];
	const stop = /"stopReason":"(\w+)"/.exec(last)?.[1];
	if (role === "assistant" && stop === "stop") return "ended";
	if (role === "assistant" && (stop === "error" || stop === "aborted")) return stop === "error" ? "errored" : "aborted";
	if (role === "assistant" || role === "user" || role === "toolResult") return "died-mid-turn";
	return "ended";
}

function tailLine(file: string, size: number): string {
	const buf = readFileSync(file);
	const s = buf.subarray(Math.max(0, size - TAIL)).toString("utf8").trimEnd();
	return s.slice(s.lastIndexOf("\n") + 1);
}

export function deriveRepo(cwd: string): { repo: string; worktree: string | null } {
	const m = /^(.*?)\/\.worktrees\/([^/]+)/.exec(cwd);
	return m ? { repo: m[1], worktree: m[2] } : { repo: cwd, worktree: null };
}

export function gitFacts(cwd: string): GitFacts {
	if (!existsSync(cwd)) return {};
	const r = spawnSync("git", ["-C", cwd, "branch", "--show-current"], { encoding: "utf8" });
	return r.status === 0 && r.stdout.trim() ? { branch: r.stdout.trim() } : {};
}

function listFiles(root: string): string[] {
	const out: string[] = [];
	if (!existsSync(root)) return out;
	for (const d of readdirSync(root, { withFileTypes: true })) {
		if (!d.isDirectory()) continue;
		for (const f of readdirSync(join(root, d.name), { withFileTypes: true }))
			if (f.isFile() && f.name.endsWith(".jsonl") && /_[0-9a-f-]{36}\.jsonl$/.test(f.name)) out.push(join(root, d.name, f.name));
	}
	return out;
}

export function backfill(db: Registry, root: string, opts: { git?: (cwd: string) => GitFacts; profile?: string; isAlive?: (pid: number) => boolean } = {}): { scanned: number; skipped: number } {
	const git = opts.git ?? gitFacts;
	const isAlive = opts.isAlive ?? ((pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } });
	const known = db.query("SELECT mtime_ms, size FROM sessions WHERE file=?");
	const ins = db.query(`INSERT OR REPLACE INTO sessions (id,file,cwd,repo,worktree,branch,profile,model,started,ended,status,last_activity,digest,mtime_ms,size) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
	let scanned = 0, skipped = 0;
	for (const file of listFiles(root)) {
		const st = statSync(file);
		const k = known.get(file) as any;
		if (k && k.mtime_ms === st.mtimeMs && k.size === st.size) { skipped++; continue; }
		const lines = readFileSync(file, "utf8").split("\n");
		const head = safe(lines[0]);
		if (head?.type !== "session" || !head.id) continue;
		let model: string | null = null, firstA = "", lastA = "";
		const prompts: string[] = [];
		for (const l of lines) {
			if (l.includes('"type":"model_change"')) { const o = safe(l); if (o?.modelId) model = o.modelId; }
			else if (l.includes('"role":"user"')) { const t = clip(textOf(safe(l)?.message?.content), 300); if (t) prompts.push(t); }
			else if (l.includes('"role":"assistant"')) { const t = clip(textOf(safe(l)?.message?.content), 300); if (t) { firstA ||= t; lastA = t; } }
		}
		const { repo, worktree } = deriveRepo(head.cwd ?? "");
		const last = tailLine(file, st.size);
		const lastTs = /"timestamp":"([^"]+)"/.exec(last)?.[1] ?? new Date(st.mtimeMs).toISOString();
		let status = classifyTail(last);
		const liveInst = db.query("SELECT pid FROM instances WHERE session_id=? AND ended IS NULL").get(head.id) as any;
		if (liveInst && isAlive(liveInst.pid)) status = "running";
		const digest = [...prompts, firstA, lastA].filter(Boolean).join("\n");
		ins.run(head.id, file, head.cwd ?? "", repo, worktree, git(head.cwd ?? "").branch ?? null, opts.profile ?? null, model, head.timestamp, status === "ended" ? lastTs : null, status, lastTs, digest, st.mtimeMs, st.size);
		scanned++;
	}
	return { scanned, skipped };
}

export function search(db: Registry, c: Criteria): Row[] {
	const w: string[] = [], a: any[] = [];
	const eq = (col: string, v: unknown) => { if (v !== undefined) { w.push(`s.${col}=?`); a.push(v); } };
	eq("id", c.id); eq("cwd", c.cwd); eq("worktree", c.worktree); eq("branch", c.branch); eq("repo", c.repo); eq("status", c.status);
	if (c.since) { w.push("s.last_activity>=?"); a.push(c.since); }
	if (c.keyword) { w.push("s.digest LIKE ? ESCAPE '\\'"); a.push(`%${c.keyword.replace(/[\\%_]/g, "\\$&")}%`); }
	const ic: string[] = [];
	if (c.pid !== undefined) { ic.push("pid=?"); a.push(c.pid); }
	if (c.tmuxSession) { ic.push("tmux_session=?"); a.push(c.tmuxSession); }
	if (c.tmuxWindow) { ic.push("tmux_window=?"); a.push(c.tmuxWindow); }
	if (c.tmuxPane) { ic.push("tmux_pane=?"); a.push(c.tmuxPane); }
	if (ic.length) w.push(`s.id IN (SELECT session_id FROM instances WHERE ${ic.join(" AND ")})`);
	const sql = `SELECT s.id,s.file,s.cwd,s.repo,s.worktree,s.branch,s.profile,s.model,s.started,s.ended,s.status,s.last_activity,s.digest FROM sessions s ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY s.last_activity DESC`;
	return db.query(sql).all(...a) as Row[];
}

export interface InstanceData {
	sessionId: string;
	file: string;
	cwd: string;
	pid: number;
	tmuxSession?: string;
	tmuxWindow?: string;
	tmuxPane?: string;
	scope?: string;
	branch?: string | null;
	worktree?: string | null;
	profile?: string | null;
	model?: string | null;
	started: string;
}

export function registerInstance(db: Registry, data: InstanceData): void {
	const { repo, worktree } = deriveRepo(data.cwd);
	db.query(`INSERT OR REPLACE INTO sessions (id,file,cwd,repo,worktree,branch,profile,model,started,ended,status,last_activity,digest,mtime_ms,size) VALUES (?,?,?,?,?,?,?,?,?,NULL,'running',?,'',-1,-1)`)
		.run(data.sessionId, data.file, data.cwd, repo, data.worktree ?? worktree, data.branch, data.profile, data.model, data.started, data.started);
	db.query(`INSERT INTO instances (session_id,pid,tmux_session,tmux_window,tmux_pane,scope,started,ended) VALUES (?,?,?,?,?,?,?,NULL)`)
		.run(data.sessionId, data.pid, data.tmuxSession ?? null, data.tmuxWindow ?? null, data.tmuxPane ?? null, data.scope ?? null, data.started);
}

export function touchActivity(db: Registry, sessionId: string, ts: string): void {
	db.query("UPDATE sessions SET last_activity=? WHERE id=?").run(ts, sessionId);
}

export function closeInstance(db: Registry, sessionId: string, pid: number, ts: string): void {
	db.query("UPDATE instances SET ended=? WHERE session_id=? AND pid=?").run(ts, sessionId, pid);
	db.query("UPDATE sessions SET ended=?, status='ended', last_activity=? WHERE id=?").run(ts, ts, sessionId);
}

const defaultIsAlive = (pid: number): boolean => {
	try { process.kill(pid, 0); return true; } catch { return false; }
};

export function reapLost(db: Registry, isAlive: (pid: number) => boolean = defaultIsAlive): void {
	const running = db.query("SELECT s.id, i.pid FROM sessions s JOIN instances i ON s.id=i.session_id WHERE s.status='running' AND i.ended IS NULL").all() as any[];
	const now = new Date().toISOString();
	for (const row of running) {
		if (!isAlive(row.pid)) {
			db.query("UPDATE instances SET ended=? WHERE session_id=? AND pid=?").run(now, row.id, row.pid);
			db.query("UPDATE sessions SET status='lost', ended=? WHERE id=?").run(now, row.id);
		}
	}
}
void basename;
