import { describe, expect, test, beforeEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRegistry, search } from "./registry";
import { discoverRoots, profileOf, backfillAll, ensureProfileColumn } from "./registry-roots";

const line = (o: object) => JSON.stringify(o) + "\n";
const git = () => ({ branch: "main" });
function put(root: string, id: string) {
	const d = join(root, "--r--"); mkdirSync(d, { recursive: true });
	const f = join(d, `2026-11-08T12-00-00-000Z_${id}.jsonl`);
	writeFileSync(f, line({ type: "session", id, timestamp: "2026-11-08T11:37:58.180Z", cwd: "/r" }) +
		line({ type: "message", timestamp: "2026-11-08T11:40:00.000Z", message: { role: "user", content: [{ type: "text", text: "hello" }] } }));
	return f;
}

let home: string;
beforeEach(() => { home = mkdtempSync(join(tmpdir(), "roots-")); });
const mk = (p: string) => { mkdirSync(join(home, p), { recursive: true }); return join(home, p); };

describe("discoverRoots", () => {
	test("finds default and profile roots, skips nonexistent", () => {
		const d = mk(".pi/agent/sessions"), a = mk(".pi/profiles/work/sessions"), b = mk(".pi/profiles/personal/sessions");
		mk(".pi/profiles/empty"); // no sessions dir
		const roots = discoverRoots({ home, env: {} });
		expect(roots).toEqual([{ path: d, profile: "default" }, { path: b, profile: "personal" }, { path: a, profile: "work" }].map((r) => ({ ...r, path: require("node:fs").realpathSync(r.path) })));
	});
	test("includes PI_CODING_AGENT_DIR/sessions and dedupes by realpath", () => {
		const a = mk(".pi/profiles/work/sessions");
		const link = join(home, "link"); symlinkSync(join(home, ".pi/profiles/work"), link);
		const roots = discoverRoots({ home, env: { PI_CODING_AGENT_DIR: link } });
		expect(roots).toHaveLength(1);
		expect(roots[0].profile).toBe("work");
		expect(roots[0].path).toBe(require("node:fs").realpathSync(a));
	});
	test("env root with no profile dir is included; missing is skipped", () => {
		const e = mk("elsewhere/sessions");
		expect(discoverRoots({ home, env: { PI_CODING_AGENT_DIR: join(home, "elsewhere") } }).map((r) => r.path)).toEqual([require("node:fs").realpathSync(e)]);
		expect(discoverRoots({ home, env: { PI_CODING_AGENT_DIR: join(home, "nope") } })).toEqual([]);
	});
	test("config file adds roots via XDG_CONFIG_HOME or explicit configPath; bad config ignored", () => {
		const x = mk("extra/sessions");
		mk(".cfg/pi-find");
		writeFileSync(join(home, ".cfg/pi-find/roots.json"), JSON.stringify({ roots: [{ path: x, profile: "extra" }, { path: join(home, "gone"), profile: "gone" }, { nope: 1 }] }));
		const real = require("node:fs").realpathSync(x);
		expect(discoverRoots({ home, env: { XDG_CONFIG_HOME: join(home, ".cfg") } })).toEqual([{ path: real, profile: "extra" }]);
		expect(discoverRoots({ home, env: {}, configPath: join(home, ".cfg/pi-find/roots.json") })).toEqual([{ path: real, profile: "extra" }]);
		writeFileSync(join(home, "bad.json"), "{not json");
		expect(discoverRoots({ home, env: {}, configPath: join(home, "bad.json") })).toEqual([]);
	});
});

describe("profileOf", () => {
	test("maps file path to profile; null outside roots; nested root prefers longest", () => {
		const a = mk("a/sessions"), b = mk("a/sessions/inner");
		const roots = [{ path: a, profile: "A" }, { path: b, profile: "B" }];
		expect(profileOf(join(a, "x/f.jsonl"), roots)).toBe("A");
		expect(profileOf(join(b, "f.jsonl"), roots)).toBe("B");
		expect(profileOf(join(home, "other/f.jsonl"), roots)).toBeNull();
		expect(profileOf(join(home, "a/sessions-evil/f.jsonl"), roots)).toBeNull();
	});
});

describe("backfillAll", () => {
	test("indexes every root with its profile and leaves session files untouched", () => {
		const r1 = mk(".pi/agent/sessions"), r2 = mk(".pi/profiles/work/sessions");
		const f1 = put(r1, "01a1baf3-0000-7000-8000-000000000001"), f2 = put(r2, "01a1baf3-0000-7000-8000-000000000002");
		const before = readFileSync(f1, "utf8") + readFileSync(f2, "utf8");
		const db = openRegistry(join(home, "reg.db"));
		const roots = discoverRoots({ home, env: {} });
		expect(backfillAll(db, roots, { git }).scanned).toBe(2);
		const rows = search(db, {});
		expect(Object.fromEntries(rows.map((r) => [r.id.slice(-1), r.profile]))).toEqual({ "1": "default", "2": "work" });
		expect(readFileSync(f1, "utf8") + readFileSync(f2, "utf8")).toBe(before);
	});
	test("re-run is idempotent, restamps unchanged rows, and ensureProfileColumn is a no-op", () => {
		const r1 = mk(".pi/agent/sessions");
		put(r1, "01a1baf3-0000-7000-8000-000000000001");
		const db = openRegistry(join(home, "reg.db"));
		const roots = discoverRoots({ home, env: {} });
		backfillAll(db, roots, { git });
		db.exec("UPDATE sessions SET profile=NULL");
		const again = backfillAll(db, roots, { git });
		expect(again).toEqual({ scanned: 0, skipped: 1 });
		expect(search(db, {})[0].profile).toBe("default");
		ensureProfileColumn(db); ensureProfileColumn(db);
	});
	test("adds profile column to a legacy table without it", () => {
		const db = openRegistry(":memory:");
		db.exec("DROP TABLE sessions; CREATE TABLE sessions (id TEXT PRIMARY KEY, file TEXT)");
		ensureProfileColumn(db);
		expect((db.query("PRAGMA table_info(sessions)").all() as any[]).some((c) => c.name === "profile")).toBe(true);
	});
});
