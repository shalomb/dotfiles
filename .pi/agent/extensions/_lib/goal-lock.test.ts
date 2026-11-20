import { describe, expect, test } from "bun:test";
import { lockPlan, shorten } from "./goal-lock.ts";

const long = (n: string) => `bun test ./.pi/agent/extensions/_lib/${n.repeat(40)}.test.ts --timeout 120000 -t "some scenario name"`;

describe("shorten", () => {
	test("short commands are unchanged", () => expect(shorten("make test-fast")).toBe("make test-fast"));
	test("long commands fit 80 chars and keep both ends", () => {
		const s = shorten(long("a"));
		expect(s.length).toBeLessThanOrEqual(80);
		expect(s.startsWith("bun test ")).toBe(true);
		expect(s.endsWith('name"')).toBe(true);
		expect(s).toContain("…");
	});
	test("newlines collapse so a label stays one line", () => expect(shorten("a\n  b")).toBe("a b"));
});

describe("lockPlan: confirm when unambiguous", () => {
	test("one command is the default", () => {
		expect(lockPlan({ commands: ["make test"], outcomeChecks: [] })).toEqual({ mode: "confirm", default: "make test", label: "make test" });
	});
	test("exactly one agent suggestion among several commands is the default", () => {
		const p = lockPlan({ commands: ["a", "b", "c"], outcomeChecks: ["b"] });
		expect(p).toMatchObject({ mode: "confirm", default: "b" });
	});
	test("a suggestion that is not one of the commands is ignored", () => {
		expect(lockPlan({ commands: ["a", "b"], outcomeChecks: ["zzz"] }).mode).toBe("pick");
	});
	test("the confirm label is shortened but the default is verbatim", () => {
		const p = lockPlan({ commands: [long("x")], outcomeChecks: [long("x")] });
		expect(p.mode).toBe("confirm");
		if (p.mode !== "confirm") return;
		expect(p.default).toBe(long("x"));
		expect(p.label.length).toBeLessThanOrEqual(80);
	});
});

describe("lockPlan: pick only when ambiguous", () => {
	test("several commands and no suggestion offer at most 3 choices", () => {
		const p = lockPlan({ commands: ["a", "b", "c", "d", "e"], outcomeChecks: [] });
		expect(p.mode).toBe("pick");
		if (p.mode !== "pick") return;
		expect(p.options.length).toBeLessThanOrEqual(3);
	});
	test("several suggestions are the choices, in order", () => {
		const p = lockPlan({ commands: ["a", "b", "c", "d"], outcomeChecks: ["d", "b"] });
		expect(p).toMatchObject({ mode: "pick", options: [{ command: "d" }, { command: "b" }] });
	});
	test("test-runner commands rank ahead of probes", () => {
		const p = lockPlan({ commands: ["rg -q x f", "test -f y", "bun test ./a.test.ts", "make test-fast"], outcomeChecks: [] });
		if (p.mode !== "pick") throw new Error("expected pick");
		expect(p.options.map((o) => o.command).slice(0, 2)).toEqual(["bun test ./a.test.ts", "make test-fast"]);
	});
	test("labels are ≤80 chars, unique, and map back to the verbatim command", () => {
		const cmds = [long("a") + " 1", long("a") + " 2", long("a") + " 3"];
		const p = lockPlan({ commands: cmds, outcomeChecks: [] });
		if (p.mode !== "pick") throw new Error("expected pick");
		const labels = p.options.map((o) => o.label);
		expect(new Set(labels).size).toBe(labels.length);
		for (const o of p.options) {
			expect(o.label.length).toBeLessThanOrEqual(80);
			expect(cmds).toContain(o.command);
		}
	});
});
