import { describe, expect, test } from "bun:test";
import { nextStep } from "./next-hop";

const H = "abc123";
const red = (id: string) => ({ id, exit: 1 });
const green = (id: string) => ({ id, exit: 0 });
const at = (results: { id: string; exit: number }[]) => ({ approved: H, hash: H, results });

describe("KR-2.1 the car drives to the next red key result", () => {
	// Scenario: drives to the first red key result in file order when several are red
	test("@KR-2.1 drives to the first red key result in file order", () => {
		expect(nextStep(at([red("KR-1.1"), red("KR-2.1"), red("KR-3.1")]))).toEqual({ kind: "drive", kr: "KR-1.1" });
	});

	// Scenario: drives on to the next red key result when the current one turns green
	test("@KR-2.1 drives on to the next red one when only results changed", () => {
		const first = nextStep(at([red("KR-1.1"), red("KR-2.1")]));
		const second = nextStep(at([green("KR-1.1"), red("KR-2.1")]));
		expect(first).toEqual({ kind: "drive", kr: "KR-1.1" });
		expect(second).toEqual({ kind: "drive", kr: "KR-2.1" });
	});

	// Scenario: drives on to the next red key result when the current one turns green
	test("@KR-2.1 all earlier green, a later one red: drives to the later one", () => {
		expect(nextStep(at([green("KR-1.1"), green("KR-2.1"), red("KR-3.1")]))).toEqual({ kind: "drive", kr: "KR-3.1" });
	});

	// Scenario: drives when the approved hash equals the current hash, never asking
	test("@KR-2.1 drives when approved hash equals current hash, returning only drive or stop", () => {
		const step = nextStep(at([red("KR-1.1")]));
		expect(step.kind).toBe("drive");
		expect(["drive", "stop"]).toContain(step.kind);
	});

	// Scenario: drives when the approved hash equals the current hash, never asking
	test("@KR-2.1 all green does not drive", () => {
		expect(nextStep(at([green("KR-1.1"), green("KR-2.1")])).kind).not.toBe("drive");
	});
});

describe("stops", () => {
	const ctx = (results: { id: string; exit: number }[], contextPct?: number) => ({ ...at(results), contextPct });
	const exits = (id: string, exit: number) => ({ id, exit });

	// Scenario: the car stops when the destination changed or is still pending
	test("@KR-2.2 stops when the destination changed since approval", () => {
		expect(nextStep({ approved: "old", hash: H, results: [red("KR-1.1")] })).toEqual({ kind: "stop", reason: "not-approved" });
	});
	test("@KR-2.2 stops when the destination is pending approval", () => {
		expect(nextStep({ approved: undefined, hash: H, results: [red("KR-1.1")] })).toEqual({ kind: "stop", reason: "not-approved" });
	});

	// Scenario: the car stops at a blocked road
	test("@KR-2.2 stops at a blocked road when the tool is missing (127) or not executable (126)", () => {
		expect(nextStep(at([exits("KR-1.1", 127)]))).toEqual({ kind: "stop", reason: "blocked" });
		expect(nextStep(at([green("KR-1.1"), exits("KR-2.1", 126)]))).toEqual({ kind: "stop", reason: "blocked" });
	});
	test("@KR-2.2 stops at a blocked road even when an earlier key result is red", () => {
		expect(nextStep(at([red("KR-1.1"), exits("KR-2.1", 127)]))).toEqual({ kind: "stop", reason: "blocked" });
	});
	test("@KR-2.2 stops not for a merely red road (exit 1 drives)", () => {
		expect(nextStep(at([exits("KR-1.1", 1)]))).toEqual({ kind: "drive", kr: "KR-1.1" });
	});

	// Scenario: the car stops when the budget is spent
	test("@KR-2.2 stops when the budget is spent at 60% context", () => {
		expect(nextStep(ctx([red("KR-1.1")], 60))).toEqual({ kind: "stop", reason: "budget" });
		expect(nextStep(ctx([red("KR-1.1")], 95))).toEqual({ kind: "stop", reason: "budget" });
	});
	test("@KR-2.2 stops not at 59% context: still drives", () => {
		expect(nextStep(ctx([red("KR-1.1")], 59))).toEqual({ kind: "drive", kr: "KR-1.1" });
	});

	// Scenario: /n resumes the car once the cause of the stop is resolved
	test("@KR-2.2 stops then resumes when the destination is re-approved", () => {
		const results = [green("KR-1.1"), red("KR-2.1"), red("KR-3.1")];
		expect(nextStep({ approved: "old", hash: H, results }).kind).toBe("stop");
		expect(nextStep({ approved: H, hash: H, results })).toEqual({ kind: "drive", kr: "KR-2.1" });
	});
	test("@KR-2.2 stops then resumes when the blocking tool is fixed", () => {
		expect(nextStep(at([red("KR-1.1"), exits("KR-2.1", 127)])).kind).toBe("stop");
		expect(nextStep(at([red("KR-1.1"), red("KR-2.1")]))).toEqual({ kind: "drive", kr: "KR-1.1" });
	});
	test("@KR-2.2 stops then resumes when /n starts in a fresh context", () => {
		const results = [red("KR-1.1"), red("KR-2.1")];
		expect(nextStep(ctx(results, 70))).toEqual({ kind: "stop", reason: "budget" });
		expect(nextStep(ctx(results, undefined))).toEqual({ kind: "drive", kr: "KR-1.1" });
	});
});
