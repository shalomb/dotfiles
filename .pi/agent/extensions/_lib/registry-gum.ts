/** Read-only enrichment of registry rows from gum's project db (~/.cache/gum/gum.db). */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface GumInfo { name: string; remote_url: string | null }

export function defaultGumDb(): string {
	return join(process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"), "gum", "gum.db");
}

function openReadOnly(path: string): { get(sql: string, ...a: any[]): any; close(): void } {
	if (process.versions.bun) {
		const { Database } = require("bun:sqlite");
		const db = new Database(path, { readonly: true });
		return { get: (sql, ...a) => db.query(sql).get(...a), close: () => db.close() };
	}
	const { DatabaseSync } = require("node:sqlite");
	const db = new DatabaseSync(path, { readOnly: true });
	return { get: (sql, ...a) => db.prepare(sql).get(...a), close: () => db.close() };
}

/** Look up a project by repo path. Never throws; null when gum.db is missing, unreadable or has no match. */
export function gumLookup(repoPath: string, dbPath: string = defaultGumDb()): GumInfo | null {
	if (!existsSync(dbPath)) return null;
	try {
		const db = openReadOnly(dbPath);
		try {
			const r = db.get("SELECT name, remote_url FROM projects WHERE path=?", repoPath);
			return r ? { name: r.name, remote_url: r.remote_url ?? null } : null;
		} finally { db.close(); }
	} catch { return null; }
}

export function enrichRows<T extends { repo: string }>(rows: T[], dbPath?: string): (T & { repo_name: string | null; remote_url: string | null })[] {
	const cache = new Map<string, GumInfo | null>();
	return rows.map((r) => {
		if (!cache.has(r.repo)) cache.set(r.repo, gumLookup(r.repo, dbPath));
		const g = cache.get(r.repo);
		return { ...r, repo_name: g?.name ?? null, remote_url: g?.remote_url ?? null };
	});
}
