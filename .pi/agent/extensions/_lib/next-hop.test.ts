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
