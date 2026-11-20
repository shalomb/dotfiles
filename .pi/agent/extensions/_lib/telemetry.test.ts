// @KR-5.1 Every hop logs the key result it targeted, whether it moved, tokens and time; a summary reads the log back.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hopEvent, logHop, readHops, summarize } from "./telemetry";

let tmp: string;
let store: string;
beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "telemetry-")); store = join(tmp, "store"); });
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

const ok = { kr: "KR-5.1", moved: true, tokens: 120, ms: 3400, at: "2025-01-01T00:00:00Z" };
const file = () => join(store, "trajectories.jsonl");

describe("@KR-5.1 hopEvent", () => {
	test("@KR-5.1 builds a hop event", () => {
		// Scenario: A hop is recorded with its key result, movement, tokens and time
		expect(hopEvent(ok)).toEqual({ event: "hop", ...ok });
	});
	test("@KR-5.1 rejects bad input", () => {
		// Scenario: A hop with a malformed key result or negative cost is refused
		expect(() => hopEvent({ ...ok, kr: "5.1" })).toThrow();
		expect(() => hopEvent({ ...ok, kr: "KR-5" })).toThrow();
		expect(() => hopEvent({ ...ok, tokens: -1 })).toThrow();
		expect(() => hopEvent({ ...ok, ms: Number.NaN })).toThrow();
		expect(() => hopEvent({ ...ok, ms: Number.POSITIVE_INFINITY })).toThrow();
	});
});

describe("@KR-5.1 log and read", () => {
	test("@KR-5.1 append keeps earlier lines", () => {
		// Scenario: Logging a hop leaves existing trajectory lines intact
		mkdirSync(store, { recursive: true });
		const gate = JSON.stringify({ event: "drive_gate", verdict: "pass" });
		writeFileSync(file(), `${gate}\n`);
		logHop(store, hopEvent(ok));
		const lines = readFileSync(file(), "utf8").trim().split("\n");
		expect(lines.length).toBe(2);
		expect(lines[0]).toBe(gate);
		expect(JSON.parse(lines[1])).toEqual({ event: "hop", ...ok });
	});
	test("@KR-5.1 creates missing store dir", () => {
		// Scenario: Logging into a store that does not exist yet creates it
		logHop(store, hopEvent(ok));
		expect(readFileSync(file(), "utf8").trim().split("\n").length).toBe(1);
	});
	test("@KR-5.1 roundtrip", () => {
		// Scenario: Logged hops are read back in order, ignoring non-hop lines
		const a = hopEvent(ok);
		const b = hopEvent({ ...ok, kr: "KR-2.3", moved: false });
		logHop(store, a);
		appendFileSync(file(), `${JSON.stringify({ event: "drive_gate" })}\n`);
		logHop(store, b);
		expect(readHops(store)).toEqual([a, b]);
	});
	test("@KR-5.1 skips corrupt line", () => {
		// Scenario: A corrupt line does not hide the hops around it
		logHop(store, hopEvent(ok));
		appendFileSync(file(), "{not json\n");
		logHop(store, hopEvent({ ...ok, kr: "KR-1.1" }));
		expect(readHops(store).map((h) => h.kr)).toEqual(["KR-5.1", "KR-1.1"]);
	});
	test("@KR-5.1 missing file", () => {
		// Scenario: Reading a store with no log yields no hops
		expect(readHops(join(tmp, "nope"))).toEqual([]);
	});
});

describe("@KR-5.1 summarize", () => {
	test("@KR-5.1 sums per key result and counts moved", () => {
		// Scenario: The summary totals hops, moved hops, tokens and time per key result
		const evs = [
			hopEvent(ok),
			hopEvent({ ...ok, moved: false, tokens: 30, ms: 600 }),
			hopEvent({ ...ok, kr: "KR-2.3", moved: false, tokens: 5, ms: 10 }),
		];
		expect(summarize(evs)).toEqual({
			"KR-5.1": { hops: 2, moved: 1, tokens: 150, ms: 4000 },
			"KR-2.3": { hops: 1, moved: 0, tokens: 5, ms: 10 },
		});
	});
	test("@KR-5.1 empty input", () => {
		// Scenario: An empty log summarizes to nothing
		expect(summarize([])).toEqual({});
	});
});
