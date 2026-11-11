import { describe, expect, test, beforeEach } from "bun:test";
import { openRegistry, registerInstance, touchActivity, closeInstance, reapLost, search } from "./registry";

let db: ReturnType<typeof openRegistry>;
const alive = new Set<number>();
const isAlive = (pid: number) => alive.has(pid);

beforeEach(() => {
	db = openRegistry(":memory:");
	alive.clear();
});

describe("registry live", () => {
	test("registerInstance upserts session and inserts instance", () => {
		const ts = "2026-11-09T10:00:00.000Z";
		registerInstance(db, {
			sessionId: "sid1", file: "/tmp/sid1.jsonl", cwd: "/r/.worktrees/wt", pid: 1234,
			tmuxSession: "work", tmuxWindow: "0", tmuxPane: "%5", scope: "scope", branch: "main", worktree: "wt", profile: "dev", model: "m1", started: ts
		});
		const rows = search(db, { id: "sid1" });
		expect(rows).toHaveLength(1);
		expect(rows[0].status).toBe("running");
		expect(rows[0].cwd).toBe("/r/.worktrees/wt");
		const inst = db.query("SELECT * FROM instances WHERE session_id=?").get("sid1") as any;
		expect(inst.pid).toBe(1234);
		expect(inst.tmux_session).toBe("work");
		expect(inst.tmux_pane).toBe("%5");
	});

	test("touchActivity updates last_activity", () => {
		const ts1 = "2026-11-09T10:00:00.000Z";
		const ts2 = "2026-11-09T10:05:00.000Z";
		registerInstance(db, { sessionId: "sid2", file: "/tmp/sid2.jsonl", cwd: "/r", pid: 2000, started: ts1 });
		touchActivity(db, "sid2", ts2);
		const row = search(db, { id: "sid2" })[0];
		expect(row.last_activity).toBe(ts2);
	});

	test("closeInstance sets ended and session status ended", () => {
		const ts1 = "2026-11-09T10:00:00.000Z";
		const ts2 = "2026-11-09T10:10:00.000Z";
		registerInstance(db, { sessionId: "sid3", file: "/tmp/sid3.jsonl", cwd: "/r", pid: 3000, started: ts1 });
		closeInstance(db, "sid3", 3000, ts2);
		const inst = db.query("SELECT ended FROM instances WHERE session_id=? AND pid=?").get("sid3", 3000) as any;
		expect(inst.ended).toBe(ts2);
		const row = search(db, { id: "sid3" })[0];
		expect(row.status).toBe("ended");
		expect(row.ended).toBe(ts2);
	});

	test("reapLost marks dead running sessions as lost", () => {
		const ts = "2026-11-09T10:00:00.000Z";
		registerInstance(db, { sessionId: "alive1", file: "/tmp/alive1.jsonl", cwd: "/r", pid: 100, started: ts });
		registerInstance(db, { sessionId: "dead1", file: "/tmp/dead1.jsonl", cwd: "/r", pid: 200, started: ts });
		alive.add(100);
		reapLost(db, isAlive);
		const a = search(db, { id: "alive1" })[0];
		const d = search(db, { id: "dead1" })[0];
		expect(a.status).toBe("running");
		expect(d.status).toBe("lost");
		const inst = db.query("SELECT ended FROM instances WHERE session_id=?").get("dead1") as any;
		expect(inst.ended).not.toBeNull();
	});

	test("search finds by pid", () => {
		registerInstance(db, { sessionId: "p1", file: "/tmp/p1.jsonl", cwd: "/r", pid: 777, started: "2026-11-09T10:00:00.000Z" });
		registerInstance(db, { sessionId: "p2", file: "/tmp/p2.jsonl", cwd: "/r", pid: 888, started: "2026-11-09T10:00:00.000Z" });
		const rows = search(db, { pid: 777 });
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe("p1");
	});

	test("search finds by tmux identifiers", () => {
		registerInstance(db, { sessionId: "t1", file: "/tmp/t1.jsonl", cwd: "/r", pid: 111, tmuxSession: "work", tmuxWindow: "0", tmuxPane: "%5", started: "2026-11-09T10:00:00.000Z" });
		registerInstance(db, { sessionId: "t2", file: "/tmp/t2.jsonl", cwd: "/r", pid: 222, tmuxSession: "dev", tmuxWindow: "1", tmuxPane: "%7", started: "2026-11-09T10:00:00.000Z" });
		expect(search(db, { tmuxSession: "work" })[0].id).toBe("t1");
		expect(search(db, { tmuxWindow: "1" })[0].id).toBe("t2");
		expect(search(db, { tmuxPane: "%5" })[0].id).toBe("t1");
	});

	test("search finds lost sessions by status", () => {
		registerInstance(db, { sessionId: "lost1", file: "/tmp/lost1.jsonl", cwd: "/r", pid: 999, started: "2026-11-09T10:00:00.000Z" });
		reapLost(db, isAlive);
		const rows = search(db, { status: "lost" });
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe("lost1");
	});

	test("backfill preserves running status for live instances", () => {
		const { backfill } = require("./registry");
		const { mkdtempSync, mkdirSync, writeFileSync } = require("node:fs");
		const { tmpdir } = require("node:os");
		const { join } = require("node:path");
		const root = mkdtempSync(join(tmpdir(), "reg-live-"));
		const id = "live-session-01";
		const dir = join(root, "--r--");
		mkdirSync(dir, { recursive: true });
		const file = join(dir, `2026-11-09T10-00-00-000Z_${id}.jsonl`);
		const session = JSON.stringify({ type: "session", id, timestamp: "2026-11-09T10:00:00.000Z", cwd: "/r" }) + "\n";
		const msg = JSON.stringify({ type: "message", timestamp: "2026-11-09T10:05:00.000Z", message: { role: "user", content: [{ type: "text", text: "hi" }] } }) + "\n";
		writeFileSync(file, session + msg);
		
		registerInstance(db, { sessionId: id, file, cwd: "/r", pid: 5000, started: "2026-11-09T10:00:00.000Z" });
		alive.add(5000);
		
		backfill(db, root);
		const row = search(db, { id })[0];
		expect(row.status).toBe("running");
	});
});
