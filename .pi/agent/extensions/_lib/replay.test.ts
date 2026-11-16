import { describe, expect, test } from "bun:test";
import { classifyRoad, parseHopCommit, replayHop } from "./replay";

const CHECK = "bun test ./.pi/agent/extensions/_lib/kr.test.ts";
const trailers = (over: Record<string, string | undefined> = {}) => {
	const t: Record<string, string | undefined> = {
		Serves: "KR-3.3",
		Road: "motorway",
		Check: CHECK,
		"Check-Base": "red (exit 1) @ 29402b2",
		"Check-Head": "green (exit 0)",
		Gate: "n/a",
		Lesson: "replay beats narration",
		...over,
	};
	return Object.entries(t)
		.filter(([, v]) => v !== undefined)
		.map(([k, v]) => `${k}: ${v}`)
		.join("\n");
};
const msg = (over: Record<string, string | undefined> = {}) => `feat(pi): a hop\n\n${trailers(over)}\n`;

const hop = (over: Record<string, unknown> = {}) => ({
	sha: "abc1234",
	serves: "KR-3.3",
	road: "motorway" as "motorway" | "city",
	check: CHECK,
	baseSha: "29402b2",
	baseExit: 1,
	headGreen: true,
	gate: "n/a",
	lesson: "replay beats narration",
	...over,
});
const run = (over: Record<string, unknown> = {}) => ({ exitAtBase: 1, exitAtHead: 0, linesChanged: 40, touchedPaths: ["a.ts"], ...over });

describe("KR-3.3 parsing a Serves commit into a hop record", () => {
	// Scenario: a commit with the full trailer block is a hop record
	test("@KR-3.3 parses every trailer of a complete commit", () => {
		expect(parseHopCommit("abc1234", msg())).toEqual(hop());
	});

	// Scenario: a commit with prose and a duplicate Lesson above the trailer block uses the bottom trailers
	test("@KR-3.3 uses the trailer block at the bottom when prose repeats a Lesson line", () => {
		const m = `feat(pi): x\n\nLesson: prose one\n\n${trailers({ Lesson: "the real one" })}\n`;
		expect(parseHopCommit("abc1234", m)?.lesson).toBe("the real one");
	});

	// Scenario: a city hop with a passing gate parses
	test("@KR-3.3 parses a city hop with its gate", () => {
		const h = parseHopCommit("abc1234", msg({ Road: "city", Gate: "drive_gate pass" }));
		expect(h?.road).toBe("city");
		expect(h?.gate).toBe("drive_gate pass");
	});

	// Scenario: a commit missing a required trailer is not a hop record
	test("@KR-3.3 rejects a commit missing a required trailer", () => {
		for (const k of ["Serves", "Road", "Check", "Check-Base", "Check-Head", "Gate", "Lesson"]) {
			expect(parseHopCommit("abc1234", msg({ [k]: undefined }))).toBeNull();
		}
	});

	// Scenario: a commit with a malformed trailer is not a hop record
	test("@KR-3.3 rejects malformed Road, Check-Base and Check-Head trailers", () => {
		expect(parseHopCommit("abc1234", msg({ Road: "highway" }))).toBeNull();
		expect(parseHopCommit("abc1234", msg({ "Check-Base": "red" }))).toBeNull();
		expect(parseHopCommit("abc1234", msg({ "Check-Head": "red (exit 1)" }))).toBeNull();
	});

	// Scenario: a commit with no trailers is not a hop record
	test("@KR-3.3 rejects a plain commit", () => {
		expect(parseHopCommit("abc1234", "fix: nothing\n\njust prose\n")).toBeNull();
	});
});

describe("KR-3.3 road class is recomputed from the diff", () => {
	// Scenario: a small diff that leaves the check and end-state doc alone is a motorway
	test("@KR-3.3 small diff, untouched check and doc is motorway", () => {
		expect(classifyRoad({ linesChanged: 150, touchedPaths: ["a.ts"], check: CHECK })).toBe("motorway");
		expect(classifyRoad({ linesChanged: 1, touchedPaths: [], check: CHECK })).toBe("motorway");
	});

	// Scenario: a diff over 150 lines is a city road
	test("@KR-3.3 more than 150 lines is city", () => {
		expect(classifyRoad({ linesChanged: 151, touchedPaths: ["a.ts"], check: CHECK })).toBe("city");
	});

	// Scenario: touching the check's test file makes it a city road
	test("@KR-3.3 touching the test file named in the check is city", () => {
		const p = ".pi/agent/extensions/_lib/kr.test.ts";
		expect(classifyRoad({ linesChanged: 5, touchedPaths: [p], check: CHECK })).toBe("city");
		expect(classifyRoad({ linesChanged: 5, touchedPaths: [".pi/agent/extensions/_lib/other.test.ts"], check: CHECK })).toBe("motorway");
	});

	// Scenario: touching the end-state doc makes it a city road
	test("@KR-3.3 touching the end-state doc is city", () => {
		expect(classifyRoad({ linesChanged: 5, touchedPaths: ["docs/explanation/end-state-evolution.md"], check: CHECK })).toBe("city");
	});
});

describe("KR-3.3 replaying a hop proves arrival", () => {
	// Scenario: red at base and green at head on a true motorway passes
	test("@KR-3.3 red at base, green at head, honest motorway passes", async () => {
		expect(await replayHop(hop(), run())).toEqual({ ok: true });
	});

	// Scenario: a city hop with a passing gate passes
	test("@KR-3.3 city hop with drive_gate pass passes", async () => {
		const r = await replayHop(hop({ road: "city", gate: "drive_gate pass" }), run({ linesChanged: 400 }));
		expect(r).toEqual({ ok: true });
	});

	// Scenario: a check already green at base fails replay
	test("@KR-3.3 green at base fails", async () => {
		expect(await replayHop(hop(), run({ exitAtBase: 0 }))).toEqual({ ok: false, reason: "green-at-base" });
	});

	// Scenario: a check blocked at base by a missing tool fails replay
	test("@KR-3.3 exit 126 or 127 at base fails as blocked", async () => {
		expect(await replayHop(hop(), run({ exitAtBase: 127 }))).toEqual({ ok: false, reason: "blocked-at-base" });
		expect(await replayHop(hop(), run({ exitAtBase: 126 }))).toEqual({ ok: false, reason: "blocked-at-base" });
	});

	// Scenario: a check still red at head fails replay
	test("@KR-3.3 red at head fails", async () => {
		expect(await replayHop(hop(), run({ exitAtHead: 1 }))).toEqual({ ok: false, reason: "red-at-head" });
	});

	// Scenario: a motorway claim over a city-sized diff is rejected
	test("@KR-3.3 false motorway claim fails with road-mismatch", async () => {
		expect(await replayHop(hop(), run({ linesChanged: 151 }))).toEqual({ ok: false, reason: "road-mismatch" });
		expect(await replayHop(hop(), run({ touchedPaths: ["docs/explanation/end-state-evolution.md"] }))).toEqual({ ok: false, reason: "road-mismatch" });
	});

	// Scenario: a city claim without a passing gate is rejected
	test("@KR-3.3 city claim without drive_gate pass fails with missing-gate", async () => {
		expect(await replayHop(hop({ road: "city", gate: "n/a" }), run({ linesChanged: 400 }))).toEqual({ ok: false, reason: "missing-gate" });
	});
});
