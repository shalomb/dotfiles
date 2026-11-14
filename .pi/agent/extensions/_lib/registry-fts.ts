// FTS5 trigram index over session digest + terms (ADR-015). Additive: two new tables in registry.db.
import type { Registry } from "./registry";

/** Below this many indexed sessions bm25 has no usable statistics, so use plain OR substring match. */
export const FTS_MIN_DOCS = 8;

const FTS_TABLE = "session_fts";
const STATE_TABLE = "session_fts_state";

/** Create the index tables if missing. Safe to call on every open; never alters existing tables. */
export function ensureFts(db: Registry): void {
	db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ${FTS_TABLE} USING fts5(body, tokenize='trigram');
CREATE TABLE IF NOT EXISTS ${STATE_TABLE} (fts_rowid INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, mtime_ms REAL, size INTEGER, len INTEGER);`);
}

const bodyLen = "length(s.digest) + length(coalesce(s.terms, ''))";

/** Bring the index in line with sessions: reindex rows whose mtime/size/text length changed, drop rows that vanished. */
export function refreshFts(db: Registry): { indexed: number; removed: number } {
	ensureFts(db);
	const stale = db.query(`SELECT s.id, s.digest || ' ' || coalesce(s.terms, '') AS body, s.mtime_ms, s.size, ${bodyLen} AS len, st.fts_rowid
		FROM sessions s LEFT JOIN ${STATE_TABLE} st ON st.id = s.id
		WHERE st.id IS NULL OR st.mtime_ms IS NOT s.mtime_ms OR st.size IS NOT s.size OR st.len IS NOT ${bodyLen}`).all() as any[];
	const gone = db.query(`SELECT fts_rowid FROM ${STATE_TABLE} WHERE id NOT IN (SELECT id FROM sessions)`).all() as any[];
	if (!stale.length && !gone.length) return { indexed: 0, removed: 0 };

	const delFts = db.query(`DELETE FROM ${FTS_TABLE} WHERE rowid = ?`);
	const insFts = db.query(`INSERT INTO ${FTS_TABLE} (rowid, body) VALUES (?, ?)`);
	const insState = db.query(`INSERT INTO ${STATE_TABLE} (id, mtime_ms, size, len) VALUES (?, ?, ?, ?)`);
	const updState = db.query(`UPDATE ${STATE_TABLE} SET mtime_ms = ?, size = ?, len = ? WHERE fts_rowid = ?`);
	const rowidOf = db.query(`SELECT fts_rowid FROM ${STATE_TABLE} WHERE id = ?`);
	const delState = db.query(`DELETE FROM ${STATE_TABLE} WHERE fts_rowid = ?`);

	db.exec("BEGIN");
	try {
		for (const g of gone) { delFts.run(g.fts_rowid); delState.run(g.fts_rowid); }
		for (const r of stale) {
			let rowid = r.fts_rowid as number | null;
			if (rowid != null) { delFts.run(rowid); updState.run(r.mtime_ms, r.size, r.len, rowid); }
			else { insState.run(r.id, r.mtime_ms, r.size, r.len); rowid = (rowidOf.get(r.id) as any).fts_rowid; }
			insFts.run(rowid, r.body.toLowerCase());
		}
		db.exec("COMMIT");
	} catch (e) { db.exec("ROLLBACK"); throw e; }
	return { indexed: stale.length, removed: gone.length };
}

const words = (terms: string[]): string[] => [...new Set(terms.join(" ").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1))];

function trigrams(word: string): string[] {
	const out = new Set<string>();
	for (let i = 0; i + 3 <= word.length; i++) out.add(word.slice(i, i + 3));
	return [...out];
}

/** Plain OR substring match over sessions, most matched terms first, then newest. */
function orSearch(db: Registry, ws: string[], limit: number): string[] {
	const hit = "(instr(lower(s.digest || ' ' || coalesce(s.terms, '')), ?) > 0)";
	const hits = ws.map(() => hit).join(" + ");
	const rows = db.query(`SELECT s.id FROM sessions s WHERE ${hits} > 0 ORDER BY ${hits} DESC, s.last_activity DESC LIMIT ?`).all(...ws, ...ws, limit) as any[];
	return rows.map((r) => r.id);
}

/**
 * Ranked session ids for the given terms. Does not refresh the index (call refreshFts after backfill).
 * No terms -> most recent sessions. Few indexed sessions or only 2-char terms -> plain OR match.
 * Otherwise each term is split into trigrams and OR-matched, ranked by bm25, so a typo or a wrong term still finds the target.
 */
export function ftsSearch(db: Registry, terms: string[], limit = 20): string[] {
	const ws = words(terms);
	if (!ws.length) return (db.query("SELECT id FROM sessions ORDER BY last_activity DESC LIMIT ?").all(limit) as any[]).map((r) => r.id);
	const grams = [...new Set(ws.flatMap(trigrams))];
	const docs = (db.query(`SELECT count(*) AS n FROM ${STATE_TABLE}`).get() as any)?.n ?? 0;
	if (docs < FTS_MIN_DOCS || !grams.length) return orSearch(db, ws, limit);
	const match = grams.map((g) => `"${g}"`).join(" OR ");
	const rows = db.query(`SELECT st.id FROM ${FTS_TABLE} f JOIN ${STATE_TABLE} st ON st.fts_rowid = f.rowid JOIN sessions s ON s.id = st.id
		WHERE ${FTS_TABLE} MATCH ? ORDER BY bm25(${FTS_TABLE}), s.last_activity DESC LIMIT ?`).all(match, limit) as any[];
	return rows.map((r) => r.id);
}
