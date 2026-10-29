// Run: bun test ~/.pi/agent/extensions/_lib/help.test.ts
import { expect, test } from "bun:test";
import { categoryOf, commandRules, skillRules, renderHelp, stripAnsi } from "./help";

test("categoryOf: first matching rule wins, unknown falls to Other", () => {
	expect(categoryOf("since", commandRules)).toBe("Git & changes");
	expect(categoryOf("todo", commandRules)).toBe("Planning & backlog");
	expect(categoryOf("zzz-new", commandRules)).toBe("Other");
	expect(categoryOf("test-driven-development", skillRules)).toBe("Testing & quality");
	expect(categoryOf("git-commit-formatter", skillRules)).toBe("Git & release");
});

const input = {
	builtins: [{ name: "model", description: "Select model" }],
	commands: [
		{ name: "since", description: "Diff since baseline", source: "extension" },
		{ name: "skill:foo", description: "skill cmd", source: "skill" },
		{ name: "todo", description: "Navigate tasks", source: "extension" },
	],
	globalSkills: [{ name: "uv", description: "Python via uv" }],
	repoSkills: [{ name: "local-thing", description: "Repo skill", source: ".claude/skills" }],
	todo: "Progress: 0/3",
	cwd: "/r",
};

test("renderHelp: sections in order, grouped, skill: commands excluded from commands", () => {
	const t = stripAnsi(renderHelp(input));
	const idx = ["Built-in commands", "Slash commands", "Skills — repo-local", "Skills — global", "Todo — /r"].map((h) => t.indexOf(h));
	expect(idx.every((i) => i >= 0)).toBe(true);
	expect([...idx].sort((a, b) => a - b)).toEqual(idx);
	expect(t).toContain("/since");
	expect(t).toContain("Git & changes");
	expect(t).not.toContain("/skill:foo");
	expect(t).toContain("local-thing");
	expect(t).toContain("Progress: 0/3");
});

test("renderHelp: empty repo skills / todo degrade gracefully", () => {
	const t = stripAnsi(renderHelp({ ...input, repoSkills: [], todo: "" }));
	expect(t).toContain("(none)");
	expect(t).toContain("(no backlog for this directory)");
});
