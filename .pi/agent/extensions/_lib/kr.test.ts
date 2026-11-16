// Run: bun test ./.pi/agent/extensions/_lib/kr.test.ts
// Spec: docs/explanation/end-state-evolution.md (KR-1.1).
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { keyResultsHash, parseKeyResults } from "./kr";

const END_STATE = join(import.meta.dir, "../../../../docs/explanation/end-state-evolution.md");

// Scenario: a normal key result parses into id, sentence and check
test("parses a normal key result", () => {
	const md = "- **KR-1.1** The thing works — check: `bun test ./a.test.ts`\n";
	expect(parseKeyResults(md)).toEqual([{ id: "KR-1.1", sentence: "The thing works", check: "bun test ./a.test.ts" }]);
});

// Scenario: a check with shell syntax is kept verbatim
test("keeps $(...), quotes and && in the check", () => {
	const check = `bun test ./a.test.ts && test -z "$(fd -d1 -t d '^x' /tmp)"`;
	const r = parseKeyResults(`- **KR-4.2** Leaves no litter — check: \`${check}\`\n`);
	expect(r).toEqual([{ id: "KR-4.2", sentence: "Leaves no litter", check }]);
});

// Scenario: a sentence with backticks is kept whole
test("keeps backticks inside the sentence", () => {
	const r = parseKeyResults("- **KR-2.2** The car stops and `/n` resumes it — check: `make t`\n");
	expect(r).toEqual([{ id: "KR-2.2", sentence: "The car stops and `/n` resumes it", check: "make t" }]);
});

// Scenario: a line without a check is not a key result
test("ignores a KR line without a check", () => {
	const md = "- **KR-9.1** No check here\n- **KR-9.2** Has one — check: `true`\n";
	expect(parseKeyResults(md).map((k) => k.id)).toEqual(["KR-9.2"]);
});

// Scenario: indented, fenced and prose mentions are not key results
test("ignores indented, fenced and prose KR mentions", () => {
	const md = [
		"Format: `- **KR-n.m** sentence — check: \\`cmd\\``",
		"See KR-1.1 — check: `x` in prose",
		"  - **KR-5.1** indented — check: `true`",
		"```",
		"- **KR-5.2** fenced — check: `true`",
		"```",
		"- **KR-5.3** real — check: `true`",
	].join("\n");
	expect(parseKeyResults(md).map((k) => k.id)).toEqual(["KR-5.3"]);
});

// Scenario: key results come back in file order
test("returns key results in file order", () => {
	const md = "- **KR-2.1** b — check: `y`\n- **KR-1.1** a — check: `x`\n";
	expect(parseKeyResults(md).map((k) => k.id)).toEqual(["KR-2.1", "KR-1.1"]);
});

// Scenario: the hash covers the KR lines only
test("hash is first 16 hex of sha256 of KR lines plus trailing newline", () => {
	const l1 = "- **KR-1.1** a — check: `x`";
	const l2 = "- **KR-1.2** no check";
	const md = `intro\n${l1}\n  - **KR-1.3** indented\n${l2}\nouttro\n`;
	const want = createHash("sha256").update(`${l1}\n${l2}\n`).digest("hex").slice(0, 16);
	expect(keyResultsHash(md)).toBe(want);
	expect(keyResultsHash(md.replace("intro", "other prose"))).toBe(want);
	expect(keyResultsHash(md.replace("`x`", "`z`"))).not.toBe(want);
});

// Scenario: the real end-state file parses and matches its approved hash
test("end-state file has 8 key results and its approved hash", () => {
	const md = readFileSync(END_STATE, "utf8");
	expect(parseKeyResults(md).map((k) => k.id)).toEqual([
		"KR-1.1", "KR-2.1", "KR-2.2", "KR-3.1", "KR-3.2", "KR-3.3", "KR-4.1", "KR-4.2",
	]);
	const approved = md.match(/^Approved: \S+ ([0-9a-f]{16})$/m)![1];
	expect(approved).toBe("a51260fe4c3dbe98");
	expect(keyResultsHash(md)).toBe(approved);
});
