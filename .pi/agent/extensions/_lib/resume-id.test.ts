// Run: bun test ~/.pi/agent/extensions/_lib/resume-id.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isSessionId, resolveSessionId } from "./resume-id.ts";

const ID = "01a1b678-81a8-723f-93c5-971831f9e8b6";
let root: string;
const touch = (rel: string) => {
	const p = join(root, rel);
	mkdirSync(join(p, ".."), { recursive: true });
	writeFileSync(p, "{}\n");
	return p;
};
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "resume-id-")); });
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("isSessionId accepts a full uuid only", () => {
	expect(isSessionId(ID)).toBe(true);
	expect(isSessionId("01a1b678")).toBe(false);
	expect(isSessionId("my session name")).toBe(false);
});

test("resolves a uuid to its top-level session file in any project dir", () => {
	const f = touch(`--home-unop-.config-dotfiles--/2026-11-07T14-45-13-257Z_${ID}.jsonl`);
	expect(resolveSessionId(ID, root)).toEqual([f]);
});

test("ignores subagent run dirs and artifacts that embed the id", () => {
	const f = touch(`--p--/2026-11-07T14-45-13-257Z_${ID}.jsonl`);
	touch(`--p--/2026-11-07T14-45-13-257Z_${ID}/abc/run-0/session.jsonl`);
	touch(`--p--/subagent-artifacts/${ID}_worker_transcript.jsonl`);
	expect(resolveSessionId(ID, root)).toEqual([f]);
});

test("returns empty when unknown, and tolerates a missing root", () => {
	touch(`--p--/2026-01-01T00-00-00-000Z_${ID}.jsonl`);
	expect(resolveSessionId("01a1b678-0000-0000-0000-000000000000", root)).toEqual([]);
	expect(resolveSessionId(ID, join(root, "nope"))).toEqual([]);
});
