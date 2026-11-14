/** Multi-root pi session discovery: known roots + optional config, profile per root. Read-only on session files. */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { backfill, type Registry } from "./registry";

export interface Root { path: string; profile: string }
export interface DiscoverOptions { home: string; env: Record<string, string | undefined>; configPath?: string }

const isDir = (p: string): boolean => { try { return statSync(p).isDirectory(); } catch { return false; } };
const real = (p: string): string | null => { try { return realpathSync(p); } catch { return null; } };

export const defaultRootsConfigPath = (home: string, env: Record<string, string | undefined>): string =>
	join(env.XDG_CONFIG_HOME || join(home, ".config"), "pi-find/roots.json");

function configRoots(configPath: string): Root[] {
	if (!existsSync(configPath)) return [];
	try {
		const roots = JSON.parse(readFileSync(configPath, "utf8"))?.roots;
		if (!Array.isArray(roots)) return [];
		return roots.filter((r: any) => typeof r?.path === "string" && typeof r?.profile === "string" && r.path && r.profile)
			.map((r: any) => ({ path: r.path, profile: r.profile }));
	} catch { return []; }
}

/** Known roots only (no fs-wide scan): default, profiles/*, PI_CODING_AGENT_DIR, config. Deduped by realpath, first wins. */
export function discoverRoots({ home, env, configPath }: DiscoverOptions): Root[] {
	const candidates: Root[] = [{ path: join(home, ".pi/agent/sessions"), profile: "default" }];
	const profiles = join(home, ".pi/profiles");
	if (isDir(profiles)) {
		for (const name of readdirSync(profiles).sort()) candidates.push({ path: join(profiles, name, "sessions"), profile: name });
	}
	if (env.PI_CODING_AGENT_DIR) candidates.push({ path: join(env.PI_CODING_AGENT_DIR, "sessions"), profile: "env" });
	candidates.push(...configRoots(configPath ?? defaultRootsConfigPath(home, env)));

	const seen = new Set<string>(), out: Root[] = [];
	for (const c of candidates) {
		const rp = real(c.path);
		if (!rp || !isDir(rp) || seen.has(rp)) continue;
		seen.add(rp);
		out.push({ path: rp, profile: c.profile });
	}
	return out;
}

/** Profile of the root containing the session file (longest matching root wins); null if none. */
export function profileOf(sessionFilePath: string, roots: Root[]): string | null {
	const file = real(sessionFilePath) ?? sessionFilePath;
	let best: Root | null = null;
	for (const r of roots) {
		const rp = real(r.path) ?? r.path;
		if (file.startsWith(rp.endsWith(sep) ? rp : rp + sep) && (!best || r.path.length > best.path.length)) best = r;
	}
	return best?.profile ?? null;
}

/** Additive, idempotent: ensure sessions.profile exists (pragma-guarded ALTER). */
export function ensureProfileColumn(db: Registry): void {
	const cols = db.query("PRAGMA table_info(sessions)").all() as any[];
	if (!cols.some((c) => c.name === "profile")) db.exec("ALTER TABLE sessions ADD COLUMN profile TEXT");
}

/** Backfill every root and stamp each root's sessions with its profile (also for unchanged, skipped rows). */
export function backfillAll(db: Registry, roots: Root[], opts: Parameters<typeof backfill>[2] = {}): { scanned: number; skipped: number } {
	ensureProfileColumn(db);
	const total = { scanned: 0, skipped: 0 };
	const stamp = db.query("UPDATE sessions SET profile=? WHERE substr(file,1,?)=?");
	for (const r of roots) {
		const res = backfill(db, r.path, { ...opts, profile: r.profile });
		total.scanned += res.scanned;
		total.skipped += res.skipped;
		const prefix = r.path.endsWith(sep) ? r.path : r.path + sep;
		stamp.run(r.profile, prefix.length, prefix);
	}
	return total;
}
