// Tests for sessions.ts. Run: bun test ~/.pi/agent/extensions/_lib/sessions.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { scanClaude, scanCopilot, scanGemini, scanPi, renderTable, sanitizeTime } from "./sessions";

let root: string;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "sessions-test-")); });
afterEach(() => rmSync(root, { recursive: true, force: true }));
const jl = (p: string, rows: unknown[]) => { mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, rows.map((r) => JSON.stringify(r)).join("\n") + "\n"); };

test("pi: cwd, start, first user prompt, message count", () => {
	jl(join(root, "--x--", "2026-01-02T03-04-05-000Z_abc.jsonl"), [
		{ type: "session", id: "abc", timestamp: "2026-01-02T03:04:05.000Z", cwd: "/w/x" },
		{ type: "message", message: { role: "user", content: [{ type: "text", text: "fix the bug" }] } },
		{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } },
	]);
	const [s] = scanPi(root);
	expect(s).toMatchObject({ tool: "pi", id: "abc", cwd: "/w/x", summary: "fix the bug", msgs: 2 });
	expect(s.start.toISOString()).toBe("2026-01-02T03:04:05.000Z");
});

test("claude: skips meta/system lines, uses first real user prompt and first/last timestamps", () => {
	jl(join(root, "-w-y", "u1.jsonl"), [
		{ type: "permission-mode", sessionId: "u1" },
		{ type: "user", isMeta: true, timestamp: "2026-02-01T00:00:00Z", cwd: "/w/y", sessionId: "u1", message: { content: "<caveat>" } },
		{ type: "user", timestamp: "2026-02-01T00:01:00Z", cwd: "/w/y", sessionId: "u1", message: { content: "hello claude" } },
		{ type: "assistant", timestamp: "2026-02-01T00:09:00Z", cwd: "/w/y", sessionId: "u1", message: { content: [] } },
	]);
	const [s] = scanClaude(root);
	expect(s).toMatchObject({ tool: "claude", id: "u1", cwd: "/w/y", summary: "hello claude", msgs: 2 });
	expect(s.end.toISOString()).toBe("2026-02-01T00:09:00.000Z");
});

test("copilot: jsonl timeline joined with db summary when sqlite3 db exists", () => {
	jl(join(root, "session-state", "c1.jsonl"), [
		{ type: "session.start", data: { sessionId: "c1", startTime: "2026-03-01T10:00:00Z" }, timestamp: "2026-03-01T10:00:00Z" },
		{ type: "user.message", data: { content: "do thing" }, timestamp: "2026-03-01T10:01:00Z" },
		{ type: "assistant.message", data: {}, timestamp: "2026-03-01T10:05:00Z" },
	]);
	const db = join(root, "session-store.db");
	spawnSync("sqlite3", [db, "create table sessions(id text, cwd text, summary text, created_at text); insert into sessions values('c1','/w/z','Nice Title','2026-03-01T10:00:00Z');"]);
	const [s] = scanCopilot(root);
	expect(s).toMatchObject({ tool: "copilot", id: "c1", cwd: "/w/z", summary: "Nice Title", msgs: 2 });
	expect(s.end.toISOString()).toBe("2026-03-01T10:05:00.000Z");
});

test("copilot: falls back to first user message without db", () => {
	jl(join(root, "session-state", "c2.jsonl"), [
		{ type: "session.start", data: { sessionId: "c2", startTime: "2026-03-01T10:00:00Z" }, timestamp: "2026-03-01T10:00:00Z" },
		{ type: "user.message", data: { content: "do thing" }, timestamp: "2026-03-01T10:01:00Z" },
	]);
	expect(scanCopilot(root)[0].summary).toBe("do thing");
});

test("gemini/antigravity: reads conversation_summaries", () => {
	mkdirSync(join(root, "antigravity-cli"), { recursive: true });
	const db = join(root, "antigravity-cli", "conversation_summaries.db");
	spawnSync("sqlite3", [db, `create table conversation_summaries(conversation_id text, title text, preview text, step_count int, last_modified_time text, last_user_input_time text, workspace_uris text);
	 insert into conversation_summaries values('g1','Managing PRs','',42,'2026-04-02 10:00:00+00:00','2026-04-01 09:00:00+00:00','["file:///w/g"]');`]);
	const [s] = scanGemini(root);
	expect(s).toMatchObject({ tool: "gemini", id: "g1", cwd: "/w/g", summary: "Managing PRs", msgs: 42 });
});

test("sanitizeTime replaces absurd or invalid timestamps with fallback", () => {
	const fb = new Date("2026-01-01T00:00:00Z");
	expect(sanitizeTime("2121-08-12T15:13:15Z", fb)).toEqual(fb);
	expect(sanitizeTime("0001-01-01 00:00:00+00:00", fb)).toEqual(fb);
	expect(sanitizeTime("garbage", fb)).toEqual(fb);
	expect(sanitizeTime("2026-02-01T00:00:00Z", fb).toISOString()).toBe("2026-02-01T00:00:00.000Z");
});

test("sanitizeTime clamps a future fallback (skewed mtime) to now", () => {
	const d = sanitizeTime("garbage", new Date("2121-01-01T00:00:00Z"));
	expect(Math.abs(d.getTime() - Date.now())).toBeLessThan(5000);
});

test("renderTable: newest first, aligned columns, home-shortened cwd, truncated summary", () => {
	const mk = (tool: string, d: string, summary: string) => ({ tool, id: "i", cwd: process.env.HOME + "/p", start: new Date(d), end: new Date(d), msgs: 3, summary }) as any;
	const out = renderTable([mk("pi", "2026-01-01T10:00:00Z", "old"), mk("claude", "2026-02-01T10:00:00Z", "x".repeat(200))], { width: 100, plain: true });
	const lines = out.trim().split("\n");
	expect(lines[0]).toMatch(/TOOL.*START.*DUR.*MSGS.*CWD.*SUMMARY/);
	expect(lines[1]).toContain("claude");
	expect(lines[2]).toContain("pi");
	expect(lines[1]).toContain("~/p");
	expect(Math.max(...lines.map((l) => l.length))).toBeLessThanOrEqual(100);
});

// ---- filters / subcommands / digest ----
import { applyFilters, buildDigest, parseArgs, parseSince } from "./sessions";

const S = (o: Partial<any>) => ({ tool: "pi", id: "i", cwd: "/w/a", start: new Date("2026-10-10T10:00:00Z"), end: new Date("2026-10-10T11:00:00Z"), msgs: 10, summary: "s", prompts: [], ...o }) as any;
const NOW = new Date("2026-10-17T12:00:00Z");

test("parseSince: relative (7d, 12h, 2w) and absolute dates", () => {
	expect(parseSince("7d", NOW)!.toISOString()).toBe("2026-10-10T12:00:00.000Z");
	expect(parseSince("12h", NOW)!.toISOString()).toBe("2026-10-17T00:00:00.000Z");
	expect(parseSince("2w", NOW)!.toISOString()).toBe("2026-10-03T12:00:00.000Z");
	expect(parseSince("2026-10-01", NOW)!.toISOString()).toBe("2026-10-01T00:00:00.000Z");
	expect(parseSince("nonsense", NOW)).toBeUndefined();
});

test("parseArgs: subcommand defaults to list; summarize recognised; filters parsed", () => {
	expect(parseArgs([]).cmd).toBe("list");
	const a = parseArgs(["summarize", "--tool", "pi,claude", "--since", "7d", "--cwd", "terrapyne", "--grep", "fix", "--min-msgs", "5", "--limit", "20"], NOW);
	expect(a.cmd).toBe("summarize");
	expect(a.filters).toMatchObject({ tools: ["pi", "claude"], cwd: "terrapyne", grep: "fix", minMsgs: 5, limit: 20 });
	expect(a.filters.since!.toISOString()).toBe("2026-10-10T12:00:00.000Z");
});

test("parseArgs: bare words after the subcommand become a grep; unknown flag is an error", () => {
	expect(parseArgs(["summarize", "terraform", "plan"]).filters.grep).toBe("terraform plan");
	expect(() => parseArgs(["--bogus"])).toThrow(/unknown option/i);
	expect(() => parseArgs(["--since", "zzz"])).toThrow(/since/i);
	expect(() => parseArgs(["--tool", "vim"])).toThrow(/tool/i);
});

test("applyFilters: tool, since/until, cwd substring, grep over summary+prompts, min-msgs, newest-first limit", () => {
	const all = [
		S({ id: "a", tool: "pi", cwd: "/w/terrapyne", summary: "fix plan", start: new Date("2026-10-16T00:00:00Z") }),
		S({ id: "b", tool: "claude", cwd: "/w/other", prompts: ["please refactor Terraform"], start: new Date("2026-10-15T00:00:00Z") }),
		S({ id: "c", tool: "pi", cwd: "/w/terrapyne", msgs: 1, start: new Date("2026-10-14T00:00:00Z") }),
		S({ id: "d", tool: "pi", cwd: "/w/terrapyne", start: new Date("2026-09-01T00:00:00Z") }),
	];
	const ids = (f: any) => applyFilters(all, f).map((s) => s.id);
	expect(ids({ tools: ["claude"] })).toEqual(["b"]);
	expect(ids({ since: new Date("2026-10-01T00:00:00Z") })).toEqual(["a", "b", "c"]);
	expect(ids({ until: new Date("2026-10-15T12:00:00Z"), since: new Date("2026-10-01T00:00:00Z") })).toEqual(["b", "c"]);
	expect(ids({ cwd: "TERRAPYNE" })).toEqual(["a", "c", "d"]);
	expect(ids({ grep: "terraform" })).toEqual(["b"]); // case-insensitive, matches prompts
	expect(ids({ grep: "fix plan" })).toEqual(["a"]);
	expect(ids({ minMsgs: 5 })).toEqual(["a", "b", "d"]);
	expect(ids({ limit: 2 })).toEqual(["a", "b"]);
});

test("buildDigest: chronological, includes tool/time/cwd/prompts, respects char budget and says what was dropped", () => {
	const ss = Array.from({ length: 50 }, (_, i) => S({ id: `s${i}`, summary: "x".repeat(200), prompts: ["first", "last"], start: new Date(Date.UTC(2026, 9, 1 + (i % 28), i)) }));
	const d = buildDigest(ss, 3000);
	expect(d.text.length).toBeLessThanOrEqual(3200);
	expect(d.included).toBeLessThan(50);
	expect(d.text).toMatch(/omitted/i);
	const one = buildDigest([S({ tool: "claude", cwd: process.env.HOME + "/p", summary: "title", prompts: ["do X", "then Y"] })], 3000);
	expect(one.text).toContain("claude");
	expect(one.text).toContain("~/p");
	expect(one.text).toContain("do X");
	expect(one.text).toContain("then Y");
	expect(one.included).toBe(1);
});
