import { describe, expect, test } from "bun:test";
import { formatAttnBadge, parseAttnPanes, type AttnPane } from "./attention";

describe("attention - formatAttnBadge", () => {
	test("returns empty string when no panes need attention", () => {
		expect(formatAttnBadge([])).toBe("");
	});

	test("formats single pane with tmux hex styling, glyph and location", () => {
		const panes: AttnPane[] = [
			{ session: "dotfiles", window: "2", pane: "1", reason: "waiting for input" }
		];
		// Uses palette: #ff6633 warm orange / amber, clean glyph ●, session:window.pane
		const badge = formatAttnBadge(panes);
		expect(badge).toContain("●");
		expect(badge).toContain("#ff6633");
		expect(badge).toContain("dotfiles:2.1");
	});

	test("formats multiple panes with count and first pane", () => {
		const panes: AttnPane[] = [
			{ session: "dotfiles", window: "2", pane: "1", reason: "question" },
			{ session: "work", window: "1", pane: "0", reason: "approval" }
		];
		const badge = formatAttnBadge(panes);
		expect(badge).toContain("●");
		expect(badge).toContain("2");
		expect(badge).toContain("dotfiles:2.1");
	});
});

describe("attention - parseAttnPanes", () => {
	test("parses tmux list-panes output filtering for non-empty @pi_attn", () => {
		const raw = [
			"dotfiles|2|1|needs user input",
			"dotfiles|2|2|",
			"other|1|0|goal lock",
		].join("\n");

		const result = parseAttnPanes(raw);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			session: "dotfiles",
			window: "2",
			pane: "1",
			reason: "needs user input"
		});
		expect(result[1]).toEqual({
			session: "other",
			window: "1",
			pane: "0",
			reason: "goal lock"
		});
	});

	test("handles empty or whitespace lines safely", () => {
		expect(parseAttnPanes("")).toEqual([]);
		expect(parseAttnPanes("   \n\n")).toEqual([]);
	});
});
