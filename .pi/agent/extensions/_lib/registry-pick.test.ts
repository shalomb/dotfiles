import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Row } from "./registry";
import { ageOf, fzfArgs, fzfNotice, onEnter, pickerRows, pickSession, runPicker, shouldUseFzf, NEW_WORKTREE_LABEL, type EnterDeps, type FzfRunner, type InteractiveDeps } from "./registry-pick";
import type { ResumeCommand, ResumeDeps, Worktree } from "./registry-resume";
import { runFind } from "./registry-find";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const MAIN = "/r/repo";
const WT = "/r/repo/.worktrees/feat-a";
const OTHER = "/r/repo/.worktrees/feat-b";
const row = (o: Partial<Row> = {}): Row => ({
	id: "11111111-2222-3333-4444-555555555555", file: "/f", cwd: WT, repo: MAIN, worktree: "feat-a", worktree_path: WT, branch: "feat/a", profile: "work",
	model: null, started: "2026-11-08T09:00:00.000Z", ended: null, status: "ended", last_activity: "2026-11-08T09:00:00.000Z",
	digest: "fix the flux capacitor\nsecond prompt\nlast prompt\nassistant done", ...o,
});
const resume = (wts: string[], present: string[] = wts): ResumeDeps => ({ listWorktrees: (): Worktree[] => wts.map((path) => ({ path, branch: null })), exists: (p) => present.includes(p) });
const runner = (reply: { status: number | null; stdout: string }, calls: { args: string[]; input: string }[] = []): FzfRunner => (args, input) => { calls.push({ args, input }); return reply; };

describe("pickerRows", () => {
	test("one line per row: visible columns then hidden preview and id as the last field", () => {
		const [line] = pickerRows([row()], NOW, "/home/x");
		const f = line.split("\t");
		expect(f.length).toBe(8);
		expect(f[0].trim()).toBe("3h");
		expect(f[1].trim()).toBe("ended");
		expect(f[2].trim()).toBe("work");
		expect(f[3].trim()).toBe("feat-a");
		expect(f[4].trim()).toBe(WT);
		expect(f[5]).toBe("fix the flux capacitor");
		expect(f[7]).toBe("11111111-2222-3333-4444-555555555555");
	});
	test("preview holds first and last prompts with no raw newline or tab", () => {
		const f = pickerRows([row()], NOW)[0].split("\t");
		expect(f[6]).toContain("first: fix the flux capacitor");
		expect(f[6]).toContain("last prompt");
		expect(f[6]).not.toContain("\n");
	});
	test("home is shortened, missing fields get placeholders, tabs in prompts are flattened", () => {
		const f = pickerRows([row({ cwd: "/home/x/code/p", profile: null, worktree: null, branch: null, digest: "a\tb\nc" })], NOW, "/home/x")[0].split("\t");
		expect(f[4].trim()).toBe("~/code/p");
		expect(f[2].trim()).toBe("-");
		expect(f[3].trim()).toBe("-");
		expect(f[5]).toBe("a b");
		expect(f.length).toBe(8);
	});
	test("ageOf buckets", () => {
		expect(ageOf("2026-11-08T11:55:00.000Z", NOW)).toBe("5m");
		expect(ageOf("2026-11-06T12:00:00.000Z", NOW)).toBe("2d");
		expect(ageOf("2026-10-01T12:00:00.000Z", NOW)).toBe("5w");
		expect(ageOf(null, NOW)).toBe("?");
	});
});

describe("shouldUseFzf", () => {
	test("true only on a TTY, no --json, fzf present", () => {
		expect(shouldUseFzf({ isTTY: true, json: false, fzfAvailable: true })).toBe(true);
		expect(shouldUseFzf({ isTTY: false, json: false, fzfAvailable: true })).toBe(false);
		expect(shouldUseFzf({ isTTY: true, json: true, fzfAvailable: true })).toBe(false);
		expect(shouldUseFzf({ isTTY: true, json: false, fzfAvailable: false })).toBe(false);
	});
	test("notice only for a TTY user without fzf", () => {
		expect(fzfNotice({ isTTY: true, json: false, fzfAvailable: false })).toContain("fzf");
		expect(fzfNotice({ isTTY: false, json: false, fzfAvailable: false })).toBeNull();
		expect(fzfNotice({ isTTY: true, json: true, fzfAvailable: false })).toBeNull();
		expect(fzfNotice({ isTTY: true, json: false, fzfAvailable: true })).toBeNull();
	});
});

describe("pickSession", () => {
	test("spawns fzf with tab delimiter, with-nth and a preview, returns the chosen id", () => {
		const calls: { args: string[]; input: string }[] = [];
		const id = pickSession([row(), row({ id: "other" })], { run: runner({ status: 0, stdout: pickerRows([row({ id: "other" })], NOW)[0] + "\n" }, calls), now: NOW });
		expect(id).toBe("other");
		expect(calls.length).toBe(1);
		expect(calls[0].args).toContain("--with-nth");
		expect(calls[0].args).toContain("--preview");
		expect(calls[0].args[calls[0].args.indexOf("--delimiter") + 1]).toBe("\t");
		expect(calls[0].input.trimEnd().split("\n").length).toBe(2);
		expect(fzfArgs("h")).toContain("--no-sort");
	});
	test("cancel (esc / ctrl-c) and empty input give null without spawning", () => {
		expect(pickSession([row()], { run: runner({ status: 130, stdout: "" }), now: NOW })).toBeNull();
		expect(pickSession([row()], { run: runner({ status: 1, stdout: "" }), now: NOW })).toBeNull();
		let spawned = 0;
		expect(pickSession([], { run: (() => { spawned++; return { status: 0, stdout: "x" }; }) as FzfRunner })).toBeNull();
		expect(spawned).toBe(0);
	});
});

describe("onEnter", () => {
	const deps = (o: Partial<EnterDeps> = {}): EnterDeps => ({ run: runner({ status: 1, stdout: "" }), prompt: (_q, s) => s, createWorktree: (_r, n) => `${MAIN}/.worktrees/${n}`, warn: () => {}, home: "/home/x", ...o });

	test("original worktree exists -> pi --session in that worktree with the profile env", () => {
		const r = onEnter(row(), deps({ resume: resume([MAIN, WT]) }))!;
		expect(r.command).toEqual({ cwd: WT, env: { PI_CODING_AGENT_DIR: "/home/x/.pi/profiles/work" }, argv: ["pi", "--session", "11111111-2222-3333-4444-555555555555"] });
		expect(r.warning).toBeUndefined();
	});
	test("default profile resumes under ~/.pi/agent", () => {
		expect(onEnter(row({ profile: "default" }), deps({ resume: resume([MAIN, WT]) }))!.command.env.PI_CODING_AGENT_DIR).toBe("/home/x/.pi/agent");
	});
	test("original gone -> second fzf lists candidates plus 'create'; choosing one resumes there, never at the top level", () => {
		const calls: { args: string[]; input: string }[] = [];
		const r = onEnter(row(), deps({ resume: resume([MAIN, WT, OTHER], [MAIN, OTHER]), run: runner({ status: 0, stdout: `${OTHER}\t\n` }, calls) }))!;
		expect(r.command.cwd).toBe(OTHER);
		expect(calls[0].input).toContain(OTHER);
		expect(calls[0].input).toContain(NEW_WORKTREE_LABEL);
		expect(calls[0].input).not.toContain(`${MAIN}\t`);
	});
	test("pick then 'create' prompts for a name and runs git worktree add through deps", () => {
		const made: string[][] = [];
		const r = onEnter(row(), deps({
			resume: resume([MAIN, WT, OTHER], [MAIN, OTHER]), run: runner({ status: 0, stdout: `${NEW_WORKTREE_LABEL}\n` }),
			prompt: () => "brand-new", createWorktree: (repo, n) => { made.push([repo, n]); return `${repo}/.worktrees/${n}`; },
		}))!;
		expect(made).toEqual([[MAIN, "brand-new"]]);
		expect(r.command.cwd).toBe(`${MAIN}/.worktrees/brand-new`);
	});
	test("no worktree at all -> create with the suggested name", () => {
		const prompts: string[] = [];
		const r = onEnter(row({ worktree: "feat-a", worktree_path: null, cwd: MAIN }), deps({ resume: resume([MAIN]), prompt: (_q, s) => { prompts.push(s); return s; } }))!;
		expect(prompts).toEqual(["feat-a"]);
		expect(r.command.cwd).toBe(`${MAIN}/.worktrees/feat-a`);
	});
	test("cancelled pick or prompt resumes nothing", () => {
		expect(onEnter(row(), deps({ resume: resume([MAIN, WT, OTHER], [MAIN, OTHER]) }))).toBeNull();
		expect(onEnter(row({ worktree_path: null, cwd: MAIN }), deps({ resume: resume([MAIN]), prompt: () => null }))).toBeNull();
	});
	test("create failure warns and falls back to the repo (degrade)", () => {
		const warns: string[] = [];
		const r = onEnter(row({ worktree_path: null, cwd: MAIN }), deps({ resume: resume([MAIN]), createWorktree: () => { throw new Error("boom"); }, warn: (m) => warns.push(m) }))!;
		expect(r.command.cwd).toBe(MAIN);
		expect(r.command.argv).toEqual(["pi", "--session", "11111111-2222-3333-4444-555555555555"]);
		expect(r.warning).toContain("boom");
		expect(warns.length).toBe(1);
	});
});

describe("runPicker", () => {
	const A = "01a1baf3-6ea3-7482-a108-a7ff027dcec6";
	const B = "01a1bbbb-0000-7000-8000-000000000002";
	const line = (o: object) => JSON.stringify(o) + "\n";
	const msg = (role: string, text: string) => line({ type: "message", timestamp: "2026-11-08T11:40:00.000Z", message: { role, stopReason: role === "assistant" ? "stop" : undefined, content: [{ type: "text", text }] } });
	function put(dir: string, sub: string, id: string, cwd: string, body: string) {
		const d = join(dir, sub); mkdirSync(d, { recursive: true });
		writeFileSync(join(d, `2026-11-08T11-37-58-180Z_${id}.jsonl`), line({ type: "session", id, timestamp: "2026-11-08T11:37:58.180Z", cwd }) + body);
	}
	function fixture() {
		const root = mkdtempSync(join(tmpdir(), "pick-"));
		put(root, "--r-wt--", A, "/r/.worktrees/wt-a", msg("user", "fix the flux capacitor") + msg("assistant", "done"));
		put(root, "--r--", B, "/r", msg("user", "hello world") + msg("assistant", "hello back"));
		return { root, db: join(root, "reg.db") };
	}
	const base = (o: Partial<InteractiveDeps> = {}): InteractiveDeps => ({
		isTTY: true, fzfAvailable: true, now: NOW, io: { write: () => {}, error: () => {} },
		run: runner({ status: 1, stdout: "" }), prompt: (_q, s) => s, createWorktree: (_r, n) => `/x/${n}`, warn: () => {}, launch: () => 0, home: "/home/x",
		resume: { listWorktrees: () => [], exists: () => false }, ...o,
	});

	test("piped output stays the plain table, no fzf", () => {
		const { root, db } = fixture();
		let spawned = 0;
		const out = runPicker(["--db", db, "--root", root], "/r", base({ isTTY: false, run: () => { spawned++; return { status: 0, stdout: "" }; } }));
		expect(spawned).toBe(0);
		expect(out.output).toBe(runFind(["--db", db, "--root", root], undefined, "/r"));
		expect(out.output).toContain("PROFILE");
	});
	test("--json and --no-pick skip fzf even on a TTY", () => {
		const { root, db } = fixture();
		let spawned = 0;
		const run = () => { spawned++; return { status: 0, stdout: "" }; };
		expect(Array.isArray(JSON.parse(runPicker(["--json", "--db", db, "--root", root], "/r", base({ run })).output!))).toBe(true);
		expect(runPicker(["--no-pick", "--db", db, "--root", root], "/r", base({ run })).output).toContain("/resume");
		expect(spawned).toBe(0);
	});
	test("TTY without fzf prints the table and a notice", () => {
		const { root, db } = fixture();
		let err = "";
		const out = runPicker(["--db", db, "--root", root], "/r", base({ fzfAvailable: false, io: { write: () => {}, error: (m) => { err += m; } } }));
		expect(out.output).toContain("/resume");
		expect(err).toContain("fzf");
	});
	test("TTY + fzf: pick then Enter launches pi --session in the target worktree", () => {
		const { root, db } = fixture();
		const launched: ResumeCommand[] = [];
		const out = runPicker(["--db", db, "--root", root], "/r", base({
			run: (_a, input) => ({ status: 0, stdout: input.split("\n").find((l) => l.endsWith(A))! + "\n" }),
			resume: resume(["/r", "/r/.worktrees/wt-a"]),
			launch: (c) => { launched.push(c); return 7; },
		}));
		expect(out).toEqual({ exitCode: 7 });
		expect(launched.length).toBe(1);
		expect(launched[0].argv).toEqual(["pi", "--session", A]);
		expect(launched[0].cwd).toBe("/r/.worktrees/wt-a");
		expect(launched[0].env.PI_CODING_AGENT_DIR).toBe("/home/x/.pi/profiles/custom");
	});
	test("cancelling fzf launches nothing", () => {
		const { root, db } = fixture();
		let launched = 0;
		expect(runPicker(["--db", db, "--root", root], "/r", base({ launch: () => { launched++; return 0; } }))).toEqual({ exitCode: 0 });
		expect(launched).toBe(0);
	});
});

describe("pi-find ranking, profile and fuzzy fallback", () => {
	const A = "01a1baf3-6ea3-7482-a108-a7ff027dcec6";
	const B = "01a1bbbb-0000-7000-8000-000000000002";
	const line = (o: object) => JSON.stringify(o) + "\n";
	const msg = (role: string, text: string) => line({ type: "message", timestamp: "2026-11-08T11:40:00.000Z", message: { role, stopReason: role === "assistant" ? "stop" : undefined, content: [{ type: "text", text }] } });
	function put(dir: string, sub: string, id: string, cwd: string, text: string) {
		const d = join(dir, sub); mkdirSync(d, { recursive: true });
		writeFileSync(join(d, `2026-11-08T11-37-58-180Z_${id}.jsonl`), line({ type: "session", id, timestamp: "2026-11-08T11:37:58.180Z", cwd }) + msg("user", text) + msg("assistant", "ok"));
	}
	function run(args: string[], cwd: string, ...bodies: [string, string, string, string][]) {
		const root = mkdtempSync(join(tmpdir(), "rank-"));
		for (const [sub, id, c, text] of bodies) put(root, sub, id, c, text);
		// the trigram index needs a few sessions before bm25 is meaningful (cold start uses plain substring match)
		for (let i = 0; i < 8; i++) put(root, "--f--", `0000000${i}-0000-7000-8000-000000000000`, "/f", `filler ${i} zebra`);
		return runFind([...args, "--db", join(root, "r.db"), "--root", root], { write: () => {}, error: () => {} }, cwd);
	}

	test("a wrong word still finds the session", () => {
		const out = run(["-g", "github", "runner", "epik"], "/q", ["--r--", A, "/r", "github runners epic planning"]);
		expect(out).toContain(A.slice(0, 8));
	});
	test("a typo finds the session when no exact word matches", () => {
		const out = run(["-g", "capacitr"], "/q", ["--r--", A, "/r", "fix the flux capacitor"]);
		expect(out).toContain(A.slice(0, 8));
		expect(out).toContain("fuzzy");
	});
	test("near ranks above far for an equal match", () => {
		const out = run(["-g", "flux"], "/r", ["--r--", A, "/r", "flux capacitor"], ["--q--", B, "/q", "flux capacitor"]);
		expect(out.indexOf(A.slice(0, 8))).toBeLessThan(out.indexOf(B.slice(0, 8)));
	});
	test("profile is a column in the table and a field in --json", () => {
		const out = run([], "/r", ["--r--", A, "/r", "flux"]);
		expect(out).toContain("PROFILE");
		expect(out).toContain("custom");
		const json = JSON.parse(run(["--json"], "/r", ["--r--", A, "/r", "flux"]));
		expect(json[0].profile).toBe("custom");
	});
});
