import { describe, expect, test, beforeEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRegistry, backfill, search } from "./registry";

const A = "01a1baf3-6ea3-7482-a108-a7ff027dcec6", B = "01a1bbbb-0000-7000-8000-000000000002", C = "01a1bbbb-0000-7000-8000-000000000003";
const line = (o: object) => JSON.stringify(o) + "\n";
const msg = (role: string, stopReason?: string, text = "hi") =>
	line({ type: "message", timestamp: "2026-11-08T11:40:00.000Z", message: { role, stopReason, content: [{ type: "text", text }] } });

function put(dir: string, cwdDir: string, ts: string, id: string, cwd: string, body: string) {
	const d = join(dir, cwdDir); mkdirSync(d, { recursive: true });
	const f = join(d, `${ts}_${id}.jsonl`);
	writeFileSync(f, line({ type: "session", id, timestamp: "2026-11-08T11:37:58.180Z", cwd }) + body);
	return f;
}

let root: string, db: ReturnType<typeof openRegistry>;
const git = (cwd: string) => ({ A: { branch: "feat/x" } } as any)[cwd.includes("wt-a") ? "A" : "Z"] ?? { branch: "develop" };
beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "reg-"));
	put(root, "--r-.worktrees-wt-a--", "2026-11-08T11-37-58-180Z", A, "/r/.worktrees/wt-a",
		line({ type: "model_change", provider: "anthropic", modelId: "m1" }) + msg("user", undefined, "fix the flux capacitor") + msg("assistant", "toolUse"));
	put(root, "--r--", "2026-11-08T12-00-00-000Z", B, "/r", msg("user", undefined, "hello") + msg("assistant", "stop", "done"));
	put(root, "--r--", "2026-11-08T13-00-00-000Z", C, "/r", msg("user"));
	put(root, "--r--/subagent-artifacts", "x", "ignored", "/r", msg("user"));
	db = openRegistry(":memory:");
});

describe("registry", () => {
	test("backfill finds by uuid, cwd, worktree, branch, status", () => {
		backfill(db, root, { git });
		expect(search(db, { id: A })[0].file).toContain(A);
		expect(search(db, { cwd: "/r" }).map((s) => s.id).sort()).toEqual([B, C].sort());
		expect(search(db, { worktree: "wt-a" })[0].id).toBe(A);
		expect(search(db, { branch: "feat/x" })[0].id).toBe(A);
		expect(search(db, { status: "ended" }).map((s) => s.id)).toEqual([B]);
		expect(search(db, {})).toHaveLength(3); // subagent-artifacts ignored
	});
	test("tail toolUse/user classified died-mid-turn", () => {
		backfill(db, root, { git });
		expect(search(db, { status: "died-mid-turn" }).map((s) => s.id).sort()).toEqual([A, C].sort());
		expect(search(db, { id: A })[0].model).toBe("m1");
	});
	test("digest holds prompts, keyword search works", () => {
		backfill(db, root, { git });
		expect(search(db, { keyword: "flux" })[0].id).toBe(A);
	});
	test("multi-word keyword matches each word separately, in any order", () => {
		backfill(db, root, { git });
		expect(search(db, { keyword: "capacitor flux" })[0].id).toBe(A);
		expect(search(db, { keyword: "flux nonexistentword" })).toEqual([]);
	});
	test("incremental rescan skips unchanged files", () => {
		expect(backfill(db, root, { git })).toEqual({ scanned: 3, skipped: 0 });
		expect(backfill(db, root, { git })).toEqual({ scanned: 0, skipped: 3 });
		const f = put(root, "--r--", "2026-11-08T12-00-00-000Z", B, "/r", msg("user") + msg("assistant", "stop") + msg("user") + msg("assistant", "toolUse"));
		utimesSync(f, new Date(), new Date(Date.now() + 5000));
		expect(backfill(db, root, { git })).toEqual({ scanned: 1, skipped: 2 });
		expect(search(db, { id: B })[0].status).toBe("died-mid-turn");
	});
});
