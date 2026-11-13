// Run: bun test .pi/agent/extensions/_lib/explain.test.ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	formatExplanation,
	parseExplainArgs,
	resolveRing1Session,
	resolveRing2WorkspaceDocs,
	resolveRing3SymbolsAndCode,
	resolveRing4HarnessSkills,
	resolveTerm,
	type ExplainResolution,
	type SessionMessage,
} from "./explain.ts";

describe("parseExplainArgs", () => {
	it("parses empty arguments", () => {
		const res = parseExplainArgs("");
		expect(res.term).toBe("");
		expect(res.raw).toBe("");
		expect(res.ring).toBeUndefined();
	});

	it("parses simple term", () => {
		const res = parseExplainArgs("ACP");
		expect(res.term).toBe("ACP");
		expect(res.ring).toBeUndefined();
	});

	it("parses term with ring filter (--ring=<ring> or -r <ring>)", () => {
		const res1 = parseExplainArgs("--ring=docs ADR");
		expect(res1.term).toBe("ADR");
		expect(res1.ring).toBe("docs");

		const res2 = parseExplainArgs("-r session context window");
		expect(res2.term).toBe("context window");
		expect(res2.ring).toBe("session");
	});

	it("supports JSON flag --json", () => {
		const res = parseExplainArgs("worktree --json");
		expect(res.term).toBe("worktree");
		expect(res.json).toBe(true);
	});
});

describe("resolveRing1Session", () => {
	it("finds term in current session messages", () => {
		const messages: SessionMessage[] = [
			{ role: "user", content: "What is ACP in this repo?" },
			{ role: "assistant", content: "ACP stands for Atomic Commit Protocol: single purpose, conventional commit." },
			{ role: "user", content: "Great, let's proceed." },
		];
		const matches = resolveRing1Session("ACP", messages);
		expect(matches.length).toBeGreaterThan(0);
		expect(matches[0].ring).toBe("session");
		expect(matches[0].snippet).toContain("Atomic Commit Protocol");
		expect(matches[0].source).toContain("assistant message");
	});

	it("returns empty if term not in session", () => {
		const messages: SessionMessage[] = [
			{ role: "user", content: "Hello world" },
		];
		const matches = resolveRing1Session("NonExistentTerm123", messages);
		expect(matches).toEqual([]);
	});
});

describe("resolveRing2WorkspaceDocs", () => {
	it("finds definitions in ADRs, markdown files, and AGENTS.md", () => {
		const testDir = mkdtempSync(join(tmpdir(), "test-explain-ring2-"));
		mkdirSync(join(testDir, "docs", "adr"), { recursive: true });
		writeFileSync(
			join(testDir, "docs", "adr", "ADR-001-glossary.md"),
			"# ADR-001: Glossary\n\n## Terms\n\n- **SuperRing**: A hierarchical concentric resolver pattern for agent discovery.\n"
		);
		writeFileSync(
			join(testDir, "AGENTS.md"),
			"# Agents Guide\n\nSome guidelines for subagents and TDD.\n"
		);

		try {
			const matches = resolveRing2WorkspaceDocs("SuperRing", { rootDir: testDir });
			expect(matches.length).toBeGreaterThan(0);
			expect(matches[0].ring).toBe("docs");
			expect(matches[0].snippet).toContain("concentric resolver pattern");
			expect(matches[0].source).toContain("ADR-001-glossary.md");
		} finally {
			rmSync(testDir, { recursive: true, force: true });
		}
	});
});

describe("resolveRing3SymbolsAndCode", () => {
	it("finds symbol definitions or exported declarations", () => {
		const testDir = mkdtempSync(join(tmpdir(), "test-explain-ring3-"));
		mkdirSync(join(testDir, "src"), { recursive: true });
		writeFileSync(
			join(testDir, "src", "dispatcher.ts"),
			"/** Dispatches incoming events to registered listeners */\nexport function dispatchAgentEvent(event: string) {\n  return event;\n}\n"
		);

		try {
			const matches = resolveRing3SymbolsAndCode("dispatchAgentEvent", { rootDir: testDir });
			expect(matches.length).toBeGreaterThan(0);
			expect(matches[0].ring).toBe("code");
			expect(matches[0].snippet).toContain("export function dispatchAgentEvent");
			expect(matches[0].source).toContain("src/dispatcher.ts");
		} finally {
			rmSync(testDir, { recursive: true, force: true });
		}
	});
});

describe("resolveRing4HarnessSkills", () => {
	it("finds installed skills and tools matching term", () => {
		const testDir = mkdtempSync(join(tmpdir(), "test-explain-ring4-"));
		const skillDir = join(testDir, ".pi", "skills", "git-commit-formatter");
		mkdirSync(skillDir, { recursive: true });
		writeFileSync(
			join(skillDir, "SKILL.md"),
			"---\nname: git-commit-formatter\ndescription: Structure and format Git commits under ACP\n---\n# ACP Protocol\n"
		);

		try {
			const matches = resolveRing4HarnessSkills("git-commit-formatter", { rootDir: testDir });
			expect(matches.length).toBeGreaterThan(0);
			expect(matches[0].ring).toBe("harness");
			expect(matches[0].snippet).toContain("Structure and format Git commits");
		} finally {
			rmSync(testDir, { recursive: true, force: true });
		}
	});
});

describe("resolveTerm (Hierarchical Concentric Pipeline)", () => {
	it("stops early at the highest confidence ring unless ring filter specifies otherwise", async () => {
		const messages: SessionMessage[] = [
			{ role: "assistant", content: "FastRingTerm is defined in current session." },
		];
		const res = await resolveTerm("FastRingTerm", {
			messages,
			rootDir: "/tmp",
		});
		expect(res.resolved).toBe(true);
		expect(res.primaryRing).toBe("session");
		expect(res.matches.length).toBeGreaterThan(0);
	});

	it("falls through from session to docs if not in session", async () => {
		const testDir = mkdtempSync(join(tmpdir(), "test-explain-fallthru-"));
		mkdirSync(join(testDir, "docs"), { recursive: true });
		writeFileSync(
			join(testDir, "docs", "glossary.md"),
			"# Glossary\n\n- **FallthruTerm**: Defined in documentation ring.\n"
		);

		try {
			const res = await resolveTerm("FallthruTerm", {
				messages: [],
				rootDir: testDir,
			});
			expect(res.resolved).toBe(true);
			expect(res.primaryRing).toBe("docs");
			expect(res.matches[0].snippet).toContain("Defined in documentation ring");
		} finally {
			rmSync(testDir, { recursive: true, force: true });
		}
	});
});

describe("formatExplanation", () => {
	it("formats resolution clearly with rings and sources", () => {
		const resolution: ExplainResolution = {
			term: "ACP",
			resolved: true,
			primaryRing: "session",
			matches: [
				{
					ring: "session",
					title: "Session Context",
					source: "assistant message #2",
					snippet: "ACP stands for Atomic Commit Protocol.",
					confidence: 0.95,
				},
			],
		};
		const formatted = formatExplanation(resolution);
		expect(formatted).toContain("Explain: ACP");
		expect(formatted).toContain("[session]");
		expect(formatted).toContain("Atomic Commit Protocol");
	});

	it("formats unresolved term gracefully", () => {
		const resolution: ExplainResolution = {
			term: "UnknownTermXYZ",
			resolved: false,
			matches: [],
		};
		const formatted = formatExplanation(resolution);
		expect(formatted).toContain("No explanation found for 'UnknownTermXYZ'");
	});
});
