import { describe, expect, test } from "bun:test";
import { parseWorktreeList, profileAgentDir, resolveTargetWorktree, resumeCommand, type ResumeSession, type Worktree } from "./registry-resume";

const MAIN = "/r/repo";
const WT = "/r/repo/.worktrees/feat-a";
const OTHER = "/r/repo/.worktrees/feat-b";
const session = (o: Partial<ResumeSession> = {}): ResumeSession => ({ id: "11111111-2222-3333-4444-555555555555", cwd: WT, repo: MAIN, worktree: "feat-a", worktree_path: WT, branch: "feat/a", profile: "work", ...o });
const deps = (wts: string[], present: string[] = wts) => ({
	listWorktrees: (): Worktree[] => wts.map((path) => ({ path, branch: null })),
	exists: (p: string) => present.includes(p),
});

describe("resolveTargetWorktree", () => {
	test("original worktree exists", () => {
		expect(resolveTargetWorktree(session(), deps([MAIN, WT, OTHER]))).toEqual({ kind: "worktree", path: WT });
	});
	test("session cwd in a subdirectory of the worktree", () => {
		expect(resolveTargetWorktree(session({ cwd: `${WT}/src`, worktree_path: null }), deps([MAIN, WT]))).toEqual({ kind: "worktree", path: WT });
	});
	test("original worktree deleted, others exist -> pick", () => {
		expect(resolveTargetWorktree(session(), deps([MAIN, WT, OTHER], [MAIN, OTHER]))).toEqual({ kind: "pick", candidates: [{ path: OTHER, branch: null }] });
	});
	test("session ran at top level but worktrees exist -> pick, never top level", () => {
		const r = resolveTargetWorktree(session({ cwd: MAIN, worktree: null, worktree_path: null }), deps([MAIN, WT, OTHER]));
		expect(r.kind).toBe("pick");
		if (r.kind === "pick") expect(r.candidates.map((c) => c.path)).toEqual([WT, OTHER]);
	});
	test("worktree_path pointing at the top level is ignored", () => {
		expect(resolveTargetWorktree(session({ worktree_path: MAIN, cwd: MAIN }), deps([MAIN, WT])).kind).toBe("pick");
	});
	test("no linked worktrees -> create with a sanitized name", () => {
		expect(resolveTargetWorktree(session({ worktree: null, branch: "feat/a b" }), deps([MAIN]))).toEqual({ kind: "create", repo: MAIN, suggestedName: "feat-a-b" });
	});
	test("git unavailable -> create, not top level", () => {
		expect(resolveTargetWorktree(session({ worktree: null, branch: null }), deps([])).kind).toBe("create");
	});
});

describe("parseWorktreeList", () => {
	test("main first, branch stripped", () => {
		const out = parseWorktreeList("worktree /r/repo\nHEAD abc\nbranch refs/heads/main\n\nworktree /r/repo/.worktrees/x\nHEAD def\nbranch refs/heads/feat/x\n");
		expect(out).toEqual([{ path: "/r/repo", branch: "main" }, { path: "/r/repo/.worktrees/x", branch: "feat/x" }]);
	});
});

describe("resumeCommand", () => {
	test("runs pi --session in the worktree with the profile agent dir", () => {
		const env = { PI_CODING_AGENT_DIR: profileAgentDir("work", "/home/u") };
		expect(resumeCommand(session(), { kind: "worktree", path: WT }, env)).toEqual({ cwd: WT, env: { PI_CODING_AGENT_DIR: "/home/u/.pi/profiles/work" }, argv: ["pi", "--session", session().id] });
	});
	test("default profile uses ~/.pi/agent", () => {
		expect(profileAgentDir("default", "/home/u")).toBe("/home/u/.pi/agent");
		expect(profileAgentDir(null, "/home/u")).toBe("/home/u/.pi/agent");
	});
});
