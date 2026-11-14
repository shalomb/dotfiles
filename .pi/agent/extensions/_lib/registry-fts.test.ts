import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRegistry, type Registry } from "./registry";
import { FTS_MIN_DOCS, ftsSearch, refreshFts } from "./registry-fts";

let seq = 0;
function put(db: Registry, id: string, digest: string, o: { terms?: string; last?: string; mtime?: number } = {}) {
	db.query(`INSERT OR REPLACE INTO sessions (id,file,cwd,repo,started,status,last_activity,digest,terms,mtime_ms,size) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
		.run(id, `/f/${id}.jsonl`, "/r", "/r", "2026-01-01T00:00:00.000Z", "ended", o.last ?? `2026-01-01T00:00:${String(seq++ % 60).padStart(2, "0")}.000Z`, digest, o.terms ?? "", o.mtime ?? 1, digest.length);
}
const fill = (db: Registry, n: number) => { for (let i = 0; i < n; i++) put(db, `filler-${i}`, `unrelated filler words number${i} lorem ipsum`); };

describe("registry fts migration", () => {
	test("openRegistry adds fts tables without touching an existing registry.db", () => {
		const path = join(mkdtempSync(join(tmpdir(), "fts-mig-")), "registry.db");
		const first = openRegistry(path);
		put(first, "keep", "kubernetes upgrade notes");
		first.exec("DROP TABLE IF EXISTS session_fts; DROP TABLE IF EXISTS session_fts_state;");
		const again = openRegistry(path);
		expect((again.query("SELECT name FROM sqlite_master WHERE name IN ('session_fts','session_fts_state') ORDER BY name").all() as any[]).map((r) => r.name)).toEqual(["session_fts", "session_fts_state"]);
		expect((again.query("SELECT digest FROM sessions WHERE id='keep'").get() as any).digest).toBe("kubernetes upgrade notes");
		expect(() => openRegistry(path)).not.toThrow();
	});

	test("refreshFts indexes every session once and reports counts", () => {
		const db = openRegistry(":memory:");
		fill(db, 12);
		expect(refreshFts(db)).toEqual({ indexed: 12, removed: 0 });
		expect(refreshFts(db)).toEqual({ indexed: 0, removed: 0 });
	});
});

describe("registry fts incremental update", () => {
	test("only changed or new sessions are reindexed; deleted sessions are dropped", () => {
		const db = openRegistry(":memory:");
		fill(db, 12);
		refreshFts(db);
		put(db, "filler-3", "now mentions postgres vacuum", { mtime: 2 });
		put(db, "fresh", "brand new session");
		db.query("DELETE FROM sessions WHERE id='filler-0'").run();
		expect(refreshFts(db)).toEqual({ indexed: 2, removed: 1 });
		expect(ftsSearch(db, ["postgres"], 5)).toEqual(["filler-3"]);
		expect(ftsSearch(db, ["number0"], 40)).not.toContain("filler-0");
		expect(ftsSearch(db, ["brand"], 5)).toEqual(["fresh"]);
	});

	test("a reindexed session no longer matches its old text", () => {
		const db = openRegistry(":memory:");
		fill(db, 12);
		put(db, "x", "alpha bravo charlie");
		refreshFts(db);
		put(db, "x", "delta echo foxtrot", { mtime: 5 });
		refreshFts(db);
		expect(ftsSearch(db, ["bravo"], 5)).toEqual([]);
		expect(ftsSearch(db, ["echo"], 5)).toEqual(["x"]);
	});
});

describe("registry fts fuzzy match", () => {
	const build = () => {
		const db = openRegistry(":memory:");
		fill(db, 30);
		put(db, "target", "debug the kubernetes ingress controller", { terms: "helm chart" });
		put(db, "decoy1", "kubernetes dashboard theme");
		put(db, "decoy2", "ingress nginx annotations only");
		put(db, "decoy3", "controller refactor in rust");
		refreshFts(db);
		return db;
	};

	test("one wrong term of three still returns the target first", () => {
		const db = build();
		expect(ftsSearch(db, ["kubernetes", "ingress", "zebra"], 5)[0]).toBe("target");
	});

	test("a typo inside a term still returns the target", () => {
		const db = build();
		expect(ftsSearch(db, ["kubernets", "ingres", "controler"], 5)[0]).toBe("target");
	});

	test("matches identifier terms as well as the digest", () => {
		const db = build();
		expect(ftsSearch(db, ["helm", "chart"], 3)[0]).toBe("target");
	});

	test("limit caps the result", () => {
		const db = build();
		expect(ftsSearch(db, ["kubernetes", "ingress", "controller"], 2)).toHaveLength(2);
	});
});

describe("registry fts OR fallback at small N", () => {
	for (let n = 1; n <= FTS_MIN_DOCS - 1 && n <= 5; n++) {
		test(`N=${n}: any matching term returns the session, more matches rank first`, () => {
			const db = openRegistry(":memory:");
			for (let i = 0; i < n - 1; i++) put(db, `other-${i}`, "nothing relevant here");
			put(db, "best", "alpha bravo charlie");
			if (n > 1) put(db, "partial", "alpha only");
			refreshFts(db);
			const ids = ftsSearch(db, ["alpha", "bravo", "zulu"], 10);
			expect(ids[0]).toBe("best");
			expect(ids).toContain("best");
			expect(ids.includes("partial")).toBe(n > 1);
			expect(ids.some((i) => i.startsWith("other-"))).toBe(false);
		});
	}
});

describe("registry fts empty term", () => {
	test("empty terms return recent sessions newest first", () => {
		const db = openRegistry(":memory:");
		put(db, "old", "a", { last: "2026-01-01T00:00:00.000Z" });
		put(db, "new", "b", { last: "2026-03-01T00:00:00.000Z" });
		put(db, "mid", "c", { last: "2026-02-01T00:00:00.000Z" });
		refreshFts(db);
		expect(ftsSearch(db, [], 2)).toEqual(["new", "mid"]);
		expect(ftsSearch(db, ["  ", ""], 5)).toEqual(["new", "mid", "old"]);
	});

	test("empty registry returns nothing", () => {
		expect(ftsSearch(openRegistry(":memory:"), [], 5)).toEqual([]);
	});
});
