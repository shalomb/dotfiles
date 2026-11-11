import { describe, expect, test, beforeEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRegistry, backfill, search } from "./registry";

const line = (o: object) => JSON.stringify(o) + "\n";
const msg = (role: string, stopReason: string | undefined, ts: string, text = "hi") =>
	line({ type: "message", timestamp: ts, message: { role, stopReason, content: [{ type: "text", text }] } });

function put(dir: string, cwdDir: string, ts: string, id: string, cwd: string, headerTs: string, body: string) {
	const d = join(dir, cwdDir);
	mkdirSync(d, { recursive: true });
	const f = join(d, `${ts}_${id}.jsonl`);
	writeFileSync(f, line({ type: "session", id, timestamp: headerTs, cwd }) + body);
	return f;
}

function setMtime(file: string, mtime: Date): void {
	utimesSync(file, mtime, mtime);
}

let root: string, db: ReturnType<typeof openRegistry>;
beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "reg-ts-"));
	db = openRegistry(":memory:");
});

describe("registry timestamp clamping", () => {
	test("bogus timestamps (2121, unparseable, pre-2000) fall back to mtime", () => {
		// Session A: future timestamp (2121) in last line
		const futureId = "01a1baf3-0000-0000-0000-000000000001";
		const futureFile = put(
			root,
			"--future--",
			"2026-11-08T11-00-00-000Z",
			futureId,
			"/future",
			"2026-11-08T11:00:00.000Z",
			msg("user", undefined, "2026-11-08T11:05:00.000Z") +
				msg("assistant", "stop", "2121-12-31T23:59:59.000Z", "bogus future")
		);
		const futureMtime = new Date("2024-12-01T10:00:00.000Z");
		setMtime(futureFile, futureMtime);

		// Session B: unparseable timestamp in last line
		const badId = "01a1baf3-0000-0000-0000-000000000002";
		const badFile = put(
			root,
			"--bad--",
			"2026-11-08T12-00-00-000Z",
			badId,
			"/bad",
			"not-a-date",
			msg("user", undefined, "2026-11-08T12:05:00.000Z") +
				line({ type: "message", timestamp: "invalid-date-format", message: { role: "assistant" } })
		);
		const badMtime = new Date("2024-12-01T11:00:00.000Z");
		setMtime(badFile, badMtime);

		// Session C: pre-2000 timestamp
		const oldId = "01a1baf3-0000-0000-0000-000000000003";
		const oldFile = put(
			root,
			"--old--",
			"2026-11-08T13-00-00-000Z",
			oldId,
			"/old",
			"1999-01-01T00:00:00.000Z",
			msg("user", undefined, "1999-01-01T00:05:00.000Z") +
				msg("assistant", "stop", "1999-01-01T00:10:00.000Z")
		);
		const oldMtime = new Date("2024-12-01T12:00:00.000Z");
		setMtime(oldFile, oldMtime);

		// Session D: normal timestamps (control)
		const normalId = "01a1baf3-0000-0000-0000-000000000004";
		const normalFile = put(
			root,
			"--normal--",
			"2026-11-08T14-00-00-000Z",
			normalId,
			"/normal",
			"2024-11-08T14:00:00.000Z",
			msg("user", undefined, "2024-11-08T14:05:00.000Z") +
				msg("assistant", "stop", "2024-11-08T14:10:00.000Z")
		);
		const normalMtime = new Date("2024-11-08T14:15:00.000Z");
		setMtime(normalFile, normalMtime);

		backfill(db, root);

		// Verify timestamps were clamped to mtime-derived values
		const futureRow = search(db, { id: futureId })[0];
		expect(futureRow.started).toBe("2026-11-08T11:00:00.000Z"); // valid header kept
		expect(futureRow.last_activity).toBe(futureMtime.toISOString());

		const badRow = search(db, { id: badId })[0];
		expect(badRow.started).toBe(badMtime.toISOString());
		expect(badRow.last_activity).toBe(badMtime.toISOString());

		const oldRow = search(db, { id: oldId })[0];
		expect(oldRow.started).toBe(oldMtime.toISOString());
		expect(oldRow.last_activity).toBe(oldMtime.toISOString());

		const normalRow = search(db, { id: normalId })[0];
		expect(normalRow.started).toBe("2024-11-08T14:00:00.000Z");
		expect(normalRow.last_activity).toBe("2024-11-08T14:10:00.000Z");

		// Verify search({}) ordering: newest last_activity first
		// After clamping, order should be: old (Dec 1 12:00), bad (11:00), future (10:00), normal (Nov 8)
		const allRows = search(db, {});
		expect(allRows.map((r) => r.id)).toEqual([oldId, badId, futureId, normalId]);
	});
});
