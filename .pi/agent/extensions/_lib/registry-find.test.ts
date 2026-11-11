import { describe, expect, test, beforeEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseFindArgs, runFind } from "./registry-find";
import { openRegistry, registerInstance } from "./registry";

const A = "01a1baf3-6ea3-7482-a108-a7ff027dcec6";
const B = "01a1bbbb-0000-7000-8000-000000000002";
const line = (o: object) => JSON.stringify(o) + "\n";
const msg = (role: string, stopReason?: string, text = "hi") =>
	line({ type: "message", timestamp: "2026-11-08T11:40:00.000Z", message: { role, stopReason, content: [{ type: "text", text }] } });

function put(dir: string, cwdDir: string, ts: string, id: string, cwd: string, body: string) {
	const d = join(dir, cwdDir); mkdirSync(d, { recursive: true });
	const f = join(d, `${ts}_${id}.jsonl`);
	writeFileSync(f, line({ type: "session", id, timestamp: "2026-11-08T11:37:58.180Z", cwd }) + body);
	return f;
}

describe("parseFindArgs", () => {
	test("empty argv returns empty criteria", () => {
		const r = parseFindArgs([]);
		expect(r.criteria).toEqual({});
		expect(r.options.json).toBe(false);
		expect(r.options.limit).toBeUndefined();
	});

	test("--id flag", () => {
		const r = parseFindArgs(["--id", A]);
		expect(r.criteria.id).toBe(A);
	});

	test("--pid flag", () => {
		const r = parseFindArgs(["--pid", "12345"]);
		expect(r.criteria.pid).toBe(12345);
	});

	test("--tmux-session flag", () => {
		const r = parseFindArgs(["--tmux-session", "my-session"]);
		expect(r.criteria.tmuxSession).toBe("my-session");
	});

	test("--tmux-window flag", () => {
		const r = parseFindArgs(["--tmux-window", "2"]);
		expect(r.criteria.tmuxWindow).toBe("2");
	});

	test("--tmux-pane flag", () => {
		const r = parseFindArgs(["--tmux-pane", "0"]);
		expect(r.criteria.tmuxPane).toBe("0");
	});

	test("--branch flag", () => {
		const r = parseFindArgs(["--branch", "feat/x"]);
		expect(r.criteria.branch).toBe("feat/x");
	});

	test("--worktree flag", () => {
		const r = parseFindArgs(["--worktree", "wt-a"]);
		expect(r.criteria.worktree).toBe("wt-a");
	});

	test("--cwd flag", () => {
		const r = parseFindArgs(["--cwd", "/r"]);
		expect(r.criteria.cwd).toBe("/r");
	});

	test("--repo flag", () => {
		const r = parseFindArgs(["--repo", "/r"]);
		expect(r.criteria.repo).toBe("/r");
	});

	test("--status flag", () => {
		const r = parseFindArgs(["--status", "lost"]);
		expect(r.criteria.status).toBe("lost");
	});

	test("--since with ISO date", () => {
		const r = parseFindArgs(["--since", "2026-11-08"]);
		expect(r.criteria.since).toBe("2026-11-08T00:00:00.000Z");
	});

	test("--since with relative time (7d)", () => {
		const now = new Date("2026-11-15T12:00:00.000Z");
		const r = parseFindArgs(["--since", "7d"], now);
		expect(r.criteria.since).toBe("2026-11-08T12:00:00.000Z");
	});

	test("--since with relative time (12h)", () => {
		const now = new Date("2026-11-15T12:00:00.000Z");
		const r = parseFindArgs(["--since", "12h"], now);
		expect(r.criteria.since).toBe("2026-11-15T00:00:00.000Z");
	});

	test("--keyword flag", () => {
		const r = parseFindArgs(["--keyword", "flux"]);
		expect(r.criteria.keyword).toBe("flux");
	});

	test("positional words become keyword", () => {
		const r = parseFindArgs(["hello", "world"]);
		expect(r.criteria.keyword).toBe("hello world");
	});

	test("--json flag", () => {
		const r = parseFindArgs(["--json"]);
		expect(r.options.json).toBe(true);
	});

	test("--limit flag", () => {
		const r = parseFindArgs(["--limit", "10"]);
		expect(r.options.limit).toBe(10);
	});

	test("--no-scan flag", () => {
		const r = parseFindArgs(["--no-scan"]);
		expect(r.options.noScan).toBe(true);
	});

	test("--db flag", () => {
		const r = parseFindArgs(["--db", "/tmp/test.db"]);
		expect(r.options.db).toBe("/tmp/test.db");
	});

	test("--root flag", () => {
		const r = parseFindArgs(["--root", "/custom/sessions"]);
		expect(r.options.sessionsRoot).toBe("/custom/sessions");
	});

	test("multiple flags combined", () => {
		const r = parseFindArgs(["--status", "lost", "--branch", "main", "--json", "--limit", "5"]);
		expect(r.criteria.status).toBe("lost");
		expect(r.criteria.branch).toBe("main");
		expect(r.options.json).toBe(true);
		expect(r.options.limit).toBe(5);
	});
});

describe("runFind", () => {
	let root: string;
	let dbPath: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "find-"));
		dbPath = join(tmpdir(), `find-${Date.now()}.db`);
		put(root, "--r-.worktrees-wt-a--", "2026-11-08T11-37-58-180Z", A, "/r/.worktrees/wt-a",
			msg("user", undefined, "fix the flux capacitor") + msg("assistant", "stop", "done"));
		put(root, "--r--", "2026-11-08T12-00-00-000Z", B, "/r",
			msg("user", undefined, "hello world") + msg("assistant", "stop", "hello back"));
	});

	test("table output shows sessions", () => {
		const output = runFind(["--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		expect(output).toContain(A.slice(0, 8));
		expect(output).toContain(B.slice(0, 8));
		expect(output).toContain("/resume");
	});

	test("JSON output format", () => {
		const output = runFind(["--json", "--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		const parsed = JSON.parse(output);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed.length).toBe(2);
		expect(parsed[0].id).toBeDefined();
		expect(parsed[0].status).toBeDefined();
	});

	test("--status filter (died-mid-turn)", () => {
		const lostId = "01a1cccc-0000-7000-8000-000000000003";
		put(root, "--r--", "2026-11-08T13-00-00-000Z", lostId, "/r", msg("user"));
		const output = runFind(["--status", "died-mid-turn", "--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		expect(output).toContain(lostId.slice(0, 8));
		expect(output).not.toContain(A.slice(0, 8));
	});

	test("--keyword search", () => {
		const output = runFind(["--keyword", "flux", "--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		expect(output).toContain(A.slice(0, 8));
		expect(output).not.toContain(B.slice(0, 8));
	});

	test("positional keywords work", () => {
		const output = runFind(["hello", "--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		expect(output).toContain(B.slice(0, 8));
		expect(output).not.toContain(A.slice(0, 8));
	});

	test("--limit restricts results", () => {
		const output = runFind(["--limit", "1", "--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		const lines = output.split("\n").filter(l => l.includes("/resume"));
		expect(lines.length).toBe(1);
	});

	test("pid lookup via instances", () => {
		const db = openRegistry(dbPath);
		registerInstance(db, {
			sessionId: A, file: join(root, "--r-.worktrees-wt-a--", `2026-11-08T11-37-58-180Z_${A}.jsonl`),
			cwd: "/r/.worktrees/wt-a", pid: 99999, started: "2026-11-08T11:37:58.180Z"
		});
		const output = runFind(["--pid", "99999", "--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		expect(output).toContain(A.slice(0, 8));
		expect(output).not.toContain(B.slice(0, 8));
	});

	test("tmux-session lookup via instances", () => {
		const db = openRegistry(dbPath);
		registerInstance(db, {
			sessionId: A, file: join(root, "--r-.worktrees-wt-a--", `2026-11-08T11-37-58-180Z_${A}.jsonl`),
			cwd: "/r/.worktrees/wt-a", pid: 99998, tmuxSession: "test-session", started: "2026-11-08T11:37:58.180Z"
		});
		const output = runFind(["--tmux-session", "test-session", "--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		expect(output).toContain(A.slice(0, 8));
		expect(output).not.toContain(B.slice(0, 8));
	});

	test("--no-scan skips backfill", () => {
		// First run without --no-scan to populate
		runFind(["--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		// Add a new file but use --no-scan
		const newId = "01a1dddd-0000-7000-8000-000000000004";
		put(root, "--r--", "2026-11-08T14-00-00-000Z", newId, "/r", msg("user") + msg("assistant", "stop"));
		const output = runFind(["--no-scan", "--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		expect(output).not.toContain(newId.slice(0, 8));
	});

	test("nothing written inside repo", () => {
		const repoPath = process.cwd();
		const beforeFiles = new Set(require("child_process").execSync("git ls-files", { cwd: repoPath, encoding: "utf8" }).split("\n"));
		runFind(["--db", dbPath, "--root", root], { write: () => {}, error: () => {} });
		const afterFiles = new Set(require("child_process").execSync("git ls-files", { cwd: repoPath, encoding: "utf8" }).split("\n"));
		expect(beforeFiles).toEqual(afterFiles);
	});
});

describe("runFind limit and help", () => {
	let root: string, dbPath: string;
	const io = { write: () => {}, error: () => {} };
	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "find-lim-"));
		dbPath = join(tmpdir(), `find-lim-${Date.now()}-${Math.random()}.db`);
		for (let i = 0; i < 25; i++) {
			const id = `01a1cccc-0000-7000-8000-${String(i).padStart(12, "0")}`;
			put(root, `--r${i}--`, `2026-11-08T12-00-${String(i).padStart(2, "0")}-000Z`, id, `/r${i}`, msg("user") + msg("assistant", "stop"));
		}
	});

	test("default caps at 20 rows with 'N more' footer", () => {
		const out = runFind(["--db", dbPath, "--root", root], io);
		expect(out.match(/\/resume /g)!.length).toBe(20);
		expect(out).toContain("5 more");
		expect(out).toContain("--all");
	});

	test("--all removes the cap and the footer", () => {
		const out = runFind(["--all", "--db", dbPath, "--root", root], io);
		expect(out.match(/\/resume /g)!.length).toBe(25);
		expect(out).not.toContain("more");
	});

	test("explicit --limit shows footer for the remainder", () => {
		const out = runFind(["--limit", "3", "--db", dbPath, "--root", root], io);
		expect(out.match(/\/resume /g)!.length).toBe(3);
		expect(out).toContain("22 more");
	});

	test("--json is capped at 20 by default, all with --all", () => {
		expect(JSON.parse(runFind(["--json", "--db", dbPath, "--root", root], io)).length).toBe(20);
		expect(JSON.parse(runFind(["--json", "--all", "--db", dbPath, "--root", root], io)).length).toBe(25);
	});

	test("--help prints usage with every flag and examples, without scanning", () => {
		for (const f of ["--help", "-h"]) {
			const out = runFind([f, "--db", "/nonexistent/x.db"], io);
			expect(out).toContain("Usage: pi-find");
			for (const flag of ["--id", "--pid", "--tmux-session", "--tmux-window", "--tmux-pane", "--branch", "--worktree", "--worktree-path", "--cwd", "--repo", "--status", "--since", "--keyword", "--json", "--limit", "--all", "--no-scan", "--db", "--root"])
				expect(out).toContain(flag);
			expect(out).toContain("Examples");
		}
	});
});
