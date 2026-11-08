// Fails on any raw display-popup/split-window outside ui-gate.ts, except the explicit allowlist (each has a todo to route or exempt).
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOW = new Set([
	"grill-me-command.ts", "skills-loader-command.ts", "help-command.ts", "jira-command.ts",
	"yazi-command.ts", "git-command.ts", "gb-command.ts", "since-command.ts",
]);

test("no raw tmux popup/split outside ui-gate.ts and the allowlist", () => {
	const offenders = readdirSync(root)
		.filter((f: string) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !ALLOW.has(f))
		.filter((f: string) => /display-popup|split-window/.test(readFileSync(join(root, f), "utf8")));
	expect(offenders).toEqual([]);
});

test("allowlist has no stale entries", () => {
	const stale = [...ALLOW].filter((f: string) => !/display-popup|split-window/.test(readFileSync(join(root, f), "utf8")));
	expect(stale).toEqual([]);
});
