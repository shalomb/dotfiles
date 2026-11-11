// Run: bun test _lib/goal-help.test.ts
import { expect, test } from "bun:test";
import { SUBCOMMANDS } from "./goal-flow.ts";
import { GOAL_HELP } from "./goal-help.ts";

test("the man page documents every subcommand, so help cannot drift from the command list", () => {
	for (const c of SUBCOMMANDS) expect(GOAL_HELP).toContain(`/goal ${c}`);
});

test("the man page fits one popup page and follows the inverted order", () => {
	expect(GOAL_HELP.split("\n").length).toBeLessThanOrEqual(40);
	const order = ["## NAME", "## SYNOPSIS", "## COMMANDS", "## DESCRIPTION", "## EXPLICATION"].map((h) => GOAL_HELP.indexOf(h));
	expect(order.every((i, n) => i >= 0 && (n === 0 || i > order[n - 1]))).toBe(true);
});
