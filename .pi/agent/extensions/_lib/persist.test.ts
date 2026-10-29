// Run: bun test ~/.pi/agent/extensions/_lib/persist.test.ts
import { expect, test } from "bun:test";
import { type Facts, NARRATIVE_MARK, handoffDir, handoffName, parseBranches, parseWorktrees, renderHandoff, repoSlug } from "./persist";

test("slug matches todo-navigator's get_repo_slug", () => {
	expect(repoSlug("/home/u/src/my repo")).toBe("home-u-src-my repo");
	expect(repoSlug("/home/u//x/")).toBe("home-u-x");
	expect(repoSlug("/")).toBe("default-repo");
});

test("hand-offs live in the XDG cache, else ~/.cache", () => {
	expect(handoffDir({}, "/h", "s")).toBe("/h/.cache/agent-skills/handoffs/s");
	expect(handoffDir({ XDG_CACHE_HOME: "/c" }, "/h", "s")).toBe("/c/agent-skills/handoffs/s");
	expect(handoffDir({ XDG_CACHE_HOME: "rel" }, "/h", "s")).toBe("/h/.cache/agent-skills/handoffs/s");
});

test("file names sort by time and carry the session prefix", () => {
	expect(handoffName(new Date(2026, 9, 25, 14, 3, 5), "1a2b3c4d-ffff")).toBe("20261025-140305-1a2b3c4d.md");
	expect(handoffName(new Date(2026, 0, 1), "")).toBe("20260101-000000-nosession.md");
});

test("worktree porcelain: branch, detached, bare, locked", () => {
	const w = parseWorktrees(
		"worktree /r\nHEAD 1234567890abcdef\nbranch refs/heads/main\n\n" +
			"worktree /r-wt\nHEAD abcdef1234567890\ndetached\nlocked reason here\n\n" +
			"worktree /r.git\nbare\n",
	);
	expect(w).toHaveLength(3);
	expect(w[0]).toMatchObject({ path: "/r", head: "1234567", branch: "main", detached: false });
	expect(w[1]).toMatchObject({ path: "/r-wt", detached: true, locked: true });
	expect(w[2]).toMatchObject({ path: "/r.git", bare: true });
});

test("branch lines split on tabs; the subject keeps its own tabs", () => {
	const [b] = parseBranches("feat/x\torigin/feat/x\t[ahead 2]\t2026-10-24\tabc1234\tfix: a\tb\n");
	expect(b).toEqual({ name: "feat/x", upstream: "origin/feat/x", track: "[ahead 2]", date: "2026-10-24", sha: "abc1234", subject: "fix: a\tb" });
});

const facts = (over: Partial<Facts> = {}): Facts => ({
	at: new Date("2026-10-25T13:00:00Z"),
	cwd: "/r/sub",
	root: "/r",
	branch: "feat/x",
	upstream: "origin/feat/x",
	aheadBehind: "ahead 2, behind 0",
	head: "abc1234 fix: a",
	worktrees: parseWorktrees("worktree /r\nHEAD abc1234\nbranch refs/heads/feat/x\n\nworktree /r-wt\nHEAD def5678\nbranch refs/heads/main\n"),
	branches: parseBranches("feat/x\torigin/feat/x\t[ahead 2]\t2026-10-24\tabc1234\tfix: a | b\n"),
	status: [" M a.ts", "?? b.ts"],
	stash: [],
	commits: ["abc1234 fix: a"],
	session: { id: "1a2b3c4d-0000-1111", file: "/s/1a2b.jsonl", provider: "anthropic", model: "claude", thinking: "high" },
	...over,
});

test("the hand-off has front matter, resume commands, and narrative placeholders", () => {
	const d = renderHandoff(facts({ note: "stopped mid-refactor" }));
	expect(d.startsWith("---\ntype: handoff\n")).toBe(true);
	expect(d).toContain("pi_session_id: 1a2b3c4d-0000-1111");
	expect(d).toContain("pi_session_file: /s/1a2b.jsonl");
	expect(d).toContain("# Hand-off: r (feat/x)");
	expect(d).toContain("`pi --session 1a2b3c4d-0000-1111`");
	expect(d).toContain("## Note from the user\n\nstopped mid-refactor");
	expect(d.split(NARRATIVE_MARK).length - 1).toBe(5);
	expect(d).toContain("| Model | `anthropic/claude` (thinking: high) |");
});

test("the current worktree is marked; pipes in subjects are escaped", () => {
	const d = renderHandoff(facts());
	expect(d).toContain("| ▶ | `/r` | `feat/x` | `abc1234` | - |");
	expect(d).toContain("| `/r-wt` | `main`");
	expect(d).toContain("fix: a \\| b");
	expect(d).toContain("```\n M a.ts\n?? b.ts\n```");
	expect(d).toContain("## Stash\n\nEmpty.");
});

test("long status lists are cut; a non-git directory has no git sections", () => {
	const many = Array.from({ length: 45 }, (_, i) => `?? f${i}`);
	expect(renderHandoff(facts({ status: many }))).toContain("… 5 more");
	const plain = renderHandoff(facts({ root: undefined, branch: undefined, upstream: undefined, head: undefined, worktrees: [], branches: [], status: [], commits: [] }));
	expect(plain).toContain("# Hand-off: sub");
	expect(plain).not.toContain("## Working tree");
	expect(plain).not.toContain("repo_root:");
});

// ---- parse (read back by /sessions) ----
import { parseHandoff } from "./persist";

test("parseHandoff reads the front matter; unwritten narrative reads as empty", () => {
	const h = parseHandoff(renderHandoff(facts()))!;
	expect(h).toMatchObject({ sessionId: "1a2b3c4d-0000-1111", directory: "/r/sub", branch: "feat/x", goal: "", next: "" });
	expect(h.created.toISOString()).toBe("2026-10-25T13:00:00.000Z");
});
test("parseHandoff reads the written Goal and Next steps, and rejects other documents", () => {
	const written = renderHandoff(facts())
		.replace(`### Goal\n\n${NARRATIVE_MARK}`, "### Goal\n\nShip /persist.\nWith tests.")
		.replace(`### Next steps\n\n${NARRATIVE_MARK}`, "### Next steps\n\n- wire /sessions");
	const h = parseHandoff(written)!;
	expect(h.goal).toBe("Ship /persist. With tests.");
	expect(h.next).toBe("- wire /sessions");
	expect(parseHandoff("---\ntype: spec\n---\n# x")).toBeUndefined();
	expect(parseHandoff("# no front matter")).toBeUndefined();
});
