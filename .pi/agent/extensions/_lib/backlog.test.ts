// Run: bun test ~/.pi/agent/extensions/_lib/backlog.test.ts
import { expect, test } from "bun:test";
import { backlogSection, commitNudge, isGitCommit, ownerFor } from "./backlog.ts";

test("owner is pi plus a short session id", () => {
	expect(ownerFor("0198f3a2-7c1e-7abc-9def-001122334455")).toBe("pi:0198f3a2");
});

test("git commit is recognised in a compound shell command but not git commit-tree or log", () => {
	expect(isGitCommit("git add -A && git commit -m 'x'")).toBe(true);
	expect(isGitCommit("GIT_EDITOR=true git -C repo commit -q -F msg")).toBe(true);
	expect(isGitCommit("git commit-tree abc")).toBe(false);
	expect(isGitCommit("git log --grep commit")).toBe(false);
});

test("no backlog means no prompt section", () => {
	expect(backlogSection(null, "pi:a")).toBeUndefined();
});

test("section names the owner, your claims, others' claims and the next ready task", () => {
	const s = backlogSection(
		{
			todo: "/r/TODO.md",
			open: 3,
			mine: [{ id: "add-export", title: "Add export" }],
			claimed: [{ id: "fix-crash", owner: "pi:b", since: "2026-10-18T09:00Z" }],
			next: { id: "export-docs", title: "Export docs", priority: "P2" },
		},
		"pi:a",
	)!;
	expect(s).toContain("/r/TODO.md: 3 open");
	expect(s).toContain("You (TODO_OWNER=pi:a) hold: add-export (Add export)");
	expect(s).toContain("fix-crash by pi:b");
	expect(s).toContain("Next ready: export-docs");
	expect(s).toContain("todo done <id> --commit HEAD");
});
test("after a commit, holding claims yields a nudge naming each task and the sha, without touching git", () => {
	const n = commitNudge([{ id: "add-export", title: "Add export" }], "fe80929")!;
	expect(n).toContain("todo done add-export --commit fe80929");
	expect(n).toContain("todo release add-export");
	expect(n).not.toContain("Refs:");
});

test("no held claims means no nudge", () => {
	expect(commitNudge([], "fe80929")).toBeUndefined();
});

test("the prompt section never asks for commit-message trailers", () => {
	const s = backlogSection({ todo: "/r/TODO.md", open: 1, mine: [], claimed: [], next: null }, "pi:a")!;
	expect(s).not.toContain("Refs:");
	expect(s).toContain("commit messages");
});
