import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPromptHistory } from "./prompt-history";

describe("loadPromptHistory", () => {
	test("returns empty array when directory does not exist", () => {
		const res = loadPromptHistory({ root: "/non/existent/path" });
		expect(res).toEqual([]);
	});

	test("extracts unique user prompts in reverse chronological order", () => {
		const testRoot = mkdtempSync(join(tmpdir(), "test-pi-history-"));
		const jsonlPath = join(testRoot, "session.jsonl");
		const lines = [
			JSON.stringify({ type: "message", message: { role: "user", content: "First prompt" } }),
			JSON.stringify({ type: "message", message: { role: "assistant", content: "Answer 1" } }),
			JSON.stringify({ type: "message", message: { role: "user", content: "Second prompt" } }),
			JSON.stringify({
				type: "message",
				message: { role: "user", content: [{ type: "text", text: "Third prompt" }] },
			}),
			JSON.stringify({ type: "message", message: { role: "user", content: "Second prompt" } }), // duplicate
		];

		writeFileSync(jsonlPath, lines.join("\n"), "utf-8");

		const history = loadPromptHistory({ root: testRoot });
		expect(history).toEqual(["Second prompt", "Third prompt", "First prompt"]);

		rmSync(testRoot, { recursive: true, force: true });
	});
});
