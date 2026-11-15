// Tests for guard-log.ts. Run: cd .pi/agent/extensions/_lib && bun test guard-log
import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { logGuardEvent } from "./guard-log";

const tmp = () => join(mkdtempSync(join(tmpdir(), "guardlog-")), "sub", "hits.jsonl");

test("appends one JSON line per event, creating parent dirs", () => {
	const f = tmp();
	logGuardEvent({ guard: "modern-cli", kind: "block", rule: "sed", command: "sed -n 1p x", fix: "read" }, f);
	logGuardEvent({ guard: "uv", kind: "block", rule: "pip", command: "pip i x" }, f);
	const lines = readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));
	expect(lines).toHaveLength(2);
	expect(lines[0]).toMatchObject({ guard: "modern-cli", kind: "block", rule: "sed", hadFix: true });
	expect(lines[1].hadFix).toBe(false);
	expect(typeof lines[0].ts).toBe("string");
});

test("truncates long commands and never throws on an unwritable path", () => {
	const f = tmp();
	logGuardEvent({ guard: "uv", kind: "block", rule: "pip", command: "x".repeat(2000) }, f);
	expect(JSON.parse(readFileSync(f, "utf8")).command.length).toBeLessThanOrEqual(501);
	expect(() => logGuardEvent({ guard: "uv", kind: "block", rule: "pip", command: "x" }, "/proc/nope/x.jsonl")).not.toThrow();
});

test("prompt events record which sections were injected", () => {
	const f = tmp();
	logGuardEvent({ guard: "modern-cli", kind: "prompt", sections: ["modern_cli_overrides"] }, f);
	expect(JSON.parse(readFileSync(f, "utf8")).sections).toEqual(["modern_cli_overrides"]);
});
