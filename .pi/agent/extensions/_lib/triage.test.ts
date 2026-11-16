// Run: cd _lib && bun test triage
import { expect, test } from "bun:test";
import { triagePrompt } from "./triage.ts";

const ctx = { cwd: "/r/wt", branch: "feat-x", brief: "Backlog: 3 open", subject: "" };

test("explicit subject is named as the input", () => {
	const p = triagePrompt({ ...ctx, subject: "docs/reports/r.md" });
	expect(p).toContain("Input to triage: docs/reports/r.md");
});

test("no subject falls back to the recent conversation", () => {
	expect(triagePrompt(ctx)).toContain("most recent artifact in this conversation");
});

test("prompt carries branch, backlog brief and the todo commands to use", () => {
	const p = triagePrompt(ctx);
	expect(p).toContain("feat-x");
	expect(p).toContain("Backlog: 3 open");
	for (const c of ["todo list", "todo view", "todo add", "--depends", "--scope"]) expect(p).toContain(c);
});

test("prompt forbids writing before confirmation and claiming cards", () => {
	const p = triagePrompt(ctx);
	expect(p).toContain("Do not run `todo add`");
	expect(p).toContain("never claim");
});

test("prompt lists every disposition", () => {
	const p = triagePrompt(ctx);
	for (const d of ["dup", "new", "merge", "upstream", "defer", "drop", "goal"]) expect(p).toContain(`\`${d}\``);
});
