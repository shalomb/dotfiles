// Run: bun test _lib/goal-help.test.ts
import { expect, test } from "bun:test";
import { SUBCOMMANDS } from "./goal-flow.ts";
import { GOAL_HELP } from "./goal-help.ts";

test("the man page documents every subcommand, so help cannot drift from the command list", () => {
	for (const c of SUBCOMMANDS) expect(GOAL_HELP).toContain(`/goal ${c}`);
});

test("the man page fits one popup page and follows the inverted order", () => {
	expect(GOAL_HELP.split("\n").length).toBeLessThanOrEqual(70);
	const order = ["## NAME", "## SYNOPSIS", "## COMMANDS", "## DESCRIPTION", "## EXPLICATION"].map((h) => GOAL_HELP.indexOf(h));
	expect(order.every((i, n) => i >= 0 && (n === 0 || i > order[n - 1]))).toBe(true);
});

test("the state diagram comes above the man page and names every state and the commands that move between them", () => {
	const at = GOAL_HELP.indexOf("# GOAL(1)");
	const diagram = GOAL_HELP.slice(0, at);
	for (const w of ["none", "draft", "locked", "closed", "dropped", "/goal lock", "/goal unlock", "/goal done", "/goal drop"]) expect(diagram).toContain(w);
	expect(diagram).toContain("```");
});

test("the man page tells what to do after a goal is finished, and that close is an alias of done", () => {
	expect(GOAL_HELP).toMatch(/closed|dropped/);
	expect(GOAL_HELP).toContain("/goal close");
	expect(GOAL_HELP).toMatch(/next goal/i);
});

test("angle-bracket placeholders sit in code spans, so a markdown renderer does not swallow them as HTML", () => {
	expect(GOAL_HELP).toContain("`/goal <outcome>`");
	expect(GOAL_HELP).toContain("<branch>`");
});
