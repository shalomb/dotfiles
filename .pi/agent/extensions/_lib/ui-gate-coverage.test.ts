// Fails on any raw display-popup/split-window outside ui-gate.ts, except the explicit allowlist (each has a todo to route or exempt).
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const ALLOW = new Set([
	"changes-command.ts", "grill-me-command.ts", "skills-loader-command.ts", "help-command.ts", "jira-command.ts",
	"yazi-command.ts", "git-command.ts", "gb-command.ts", "since-command.ts",
]);

test("no raw tmux popup/split outside ui-gate.ts and the allowlist", () => {
	const offenders = readdirSync(root)
		.filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !ALLOW.has(f))
		.filter((f) => /display-popup|split-window/.test(readFileSync(join(root, f), "utf8")));
	expect(offenders).toEqual([]);
});

test("allowlist has no stale entries", () => {
	const stale = [...ALLOW].filter((f) => !/display-popup|split-window/.test(readFileSync(join(root, f), "utf8")));
	expect(stale).toEqual([]);
});
