// Tests for modern-cli-message.ts. Run: bun test ~/.pi/agent/extensions/_lib/modern-cli-message.test.ts
import { expect, test } from "bun:test";
import { blockReason } from "./modern-cli-message";

const base = { cmd: "sed", tokens: ["sed", "-n", "265,285p", "file.go"], hint: "the `read` tool (offset/limit) or `bat -r START:END file`", hasBody: true, skillInstruction: "REQUIRED NEXT STEP: read the skill" };

test("leads with WARNING, says NOT RUN, and names the command and its replacement", () => {
	const r = blockReason(base);
	expect(r.startsWith("WARNING: NOT RUN.")).toBe(true);
	expect(r).toContain("`sed` is disallowed");
	expect(r).toContain("`bat -r START:END file`");
});

test("shows the offending segment as parsed", () => {
	expect(blockReason(base)).toContain("sed -n 265,285p file.go");
});

test("says nothing in the command ran and to resubmit the whole command", () => {
	const r = blockReason(base);
	expect(r).toContain("Nothing in the command ran");
	expect(r).toContain("resubmit the whole command");
});

test("stays short: two lines, under 260 chars for a typical block", () => {
	const r = blockReason(base);
	expect(r.split("\n").length).toBe(2);
	expect(r.length).toBeLessThan(260);
});

test("long segments are truncated", () => {
	const r = blockReason({ ...base, tokens: ["sed", "x".repeat(400)] });
	expect(r.length).toBeLessThan(420);
	expect(r).toContain("…");
});

test("appends the required-step instruction only when the skill body is not inlined", () => {
	expect(blockReason(base)).not.toContain("REQUIRED NEXT STEP");
	expect(blockReason({ ...base, hasBody: false })).toContain("REQUIRED NEXT STEP: read the skill");
});
