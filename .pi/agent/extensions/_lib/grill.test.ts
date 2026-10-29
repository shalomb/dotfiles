// Run: bun test ~/.pi/agent/extensions/_lib/grill.test.ts
import { expect, test } from "bun:test";
import { type Round, WIDTH, computeDelta, renderRound, validateRound } from "./grill";

const round = (over: Partial<Round> = {}): Round => ({
	topic: "offline sync",
	stance: "long-horizon",
	questions: [
		{
			id: "sync.conflict",
			title: "Which rule must resolve a sync conflict?",
			context: ["Two devices can change the same record when they are offline."],
			options: [
				{ label: "Last write wins, with a conflict log.", tradeoff: "Easy to make. The log lets support find lost data." },
				{ label: "Field-level merge.", tradeoff: "Less data loss. Needs a change to the schema." },
				{ label: "Ask the user to select a version.", tradeoff: "No data loss. Adds a new screen." },
			],
			recommended: 0,
			diagram: "device-1 --+\n           +--> server\ndevice-2 --+",
		},
		{
			id: "sync.scope",
			title: "Which data must the app keep offline?",
			context: ["The phone has limited storage. Some users have more than 10 000 records."],
			options: [
				{ label: "Records from the last 30 days.", tradeoff: "Small storage." },
				{ label: "All records.", tradeoff: "Can use too much storage." },
			],
			recommended: 0,
		},
	],
	terms: [
		{ term: "Sync conflict", definition: "Two different versions of one record reach the server.", avoid: ["collision", "clash"] },
		{ term: "Device" },
	],
	...over,
});

/** Insert `text` lines after the first line that contains `after`. */
const insertAfter = (doc: string, after: string, ...text: string[]) => {
	const L = doc.split("\n");
	const i = L.findIndex((l) => l.includes(after));
	if (i < 0) throw new Error(`no line contains ${after}`);
	L.splice(i + 1, 0, ...text);
	return L.join("\n");
};
const tick = (doc: string, label: string) =>
	doc.replace(/\[x\]/g, (m, off) => (doc.slice(off).split("\n")[0].includes("(RECOMMENDED)") && sameQuestion(doc, off, label) ? "[ ]" : m))
		.replace(new RegExp(`\\[ \\] ([A-Z]\\. ${label.replace(/[.?]/g, "\\$&")})`), "[x] $1");
const sameQuestion = (doc: string, off: number, label: string) => {
	const at = doc.indexOf(label);
	const qStart = (i: number) => doc.lastIndexOf("\n## Q", i);
	return qStart(off) === qStart(at);
};

// ---- validate ----

test("a valid round passes", () => expect(validateRound(round())).toBeUndefined());
test("max 7 questions", () => {
	const q = round().questions[0];
	const questions = Array.from({ length: 8 }, (_, i) => ({ ...q, id: `q${i}` }));
	expect(validateRound(round({ questions }))).toContain("too many");
});
test("duplicate ids, bad ids and bad recommended index are rejected", () => {
	const [a, b] = round().questions;
	expect(validateRound(round({ questions: [a, { ...b, id: a.id }] }))).toContain("duplicate");
	expect(validateRound(round({ questions: [{ ...a, id: "Sync Conflict" }] }))).toContain("must match");
	expect(validateRound(round({ questions: [{ ...a, recommended: 3 }] }))).toContain("recommended");
});
test("diagrams must be printable ASCII within the width", () => {
	const a = round().questions[0];
	expect(validateRound(round({ questions: [{ ...a, diagram: "x".repeat(WIDTH) }] }))).toContain("columns");
	expect(validateRound(round({ questions: [{ ...a, diagram: "a ─> b" }] }))).toContain("ASCII");
});
test("a review-only round (final review) is valid; an empty round is not", () => {
	expect(validateRound(round({ questions: [], review: "- [settled] sync.conflict" }))).toBeUndefined();
	expect(validateRound(round({ questions: [] }))).toContain("review");
});

// ---- render ----

test("render ticks only the recommended option and states the stance", () => {
	const doc = renderRound(round(), 1);
	expect(doc).toContain("# GRILL ROUND 1 -- topic: offline sync");
	expect(doc).toContain("# STANCE: long horizon.");
	expect(doc).toContain("  [x] A. Last write wins, with a conflict log.  (RECOMMENDED)");
	expect(doc).toContain("  [ ] B. Field-level merge.");
	expect(doc.match(/\[x\]/g)?.length).toBe(2);
});
test("render puts TERMS last; unknown terms are marked [?]", () => {
	const doc = renderRound(round(), 1);
	expect(doc.lastIndexOf("## TERMS")).toBeGreaterThan(doc.lastIndexOf("## Q"));
	expect(doc).toContain("  Sync conflict: Two different versions of one record reach the server.");
	expect(doc).toContain("    Avoid: collision, clash");
	expect(doc).toContain("  [?] Device:");
});
test("render wraps prose to the width", () => {
	const long = "word ".repeat(60);
	const doc = renderRound(round({ questions: [{ ...round().questions[0], context: [long] }] }), 1);
	for (const l of doc.split("\n")) expect(l.length).toBeLessThanOrEqual(WIDTH);
});

// ---- delta ----

const doc = renderRound(round(), 2);

test("an unchanged reply is empty and lists every question as accepted", () => {
	const d = computeDelta(doc, doc);
	expect(d.empty).toBe(true);
	expect(d.text).toBe("Accepted, no notes: Q1 sync.conflict, Q2 sync.scope");
});
test("whitespace-only and instruction-line edits count as no change", () => {
	const reply = doc.replace(/\n/g, "  \n").replace("# KEYS:", "# MY KEYS:").replace("\n\n", "\n\n\n");
	expect(computeDelta(doc, reply).empty).toBe(true);
});
test("a changed pick is reported with its label", () => {
	const d = computeDelta(doc, tick(doc, "Ask the user to select a version."));
	expect(d.empty).toBe(false);
	expect(d.text).toContain('Q1 sync.conflict: pick="C: Ask the user to select a version." (changed from A)');
	expect(d.text).toContain("Accepted, no notes: Q2 sync.scope");
});
test("a >> note under a trade-off line attaches to the option label", () => {
	const d = computeDelta(doc, insertAfter(doc, "Needs a change to the schema", ">> schema change is fine"));
	expect(d.text).toContain('re OPTIONS "B. Field-level merge.": schema change is fine');
	expect(d.text).toContain("(recommendation kept)");
});
test("consecutive >> lines join into one paragraph; an empty >> starts a new one", () => {
	const d = computeDelta(doc, insertAfter(doc, "Two devices can change", ">> first line", ">> continues", ">>", ">> second"));
	expect(d.text).toContain(': first line continues ¶ second');
});
test("a note that asks a question keeps the node open", () => {
	const d = computeDelta(doc, insertAfter(doc, "Small storage.", ">> what about field techs?"));
	expect(d.text).toContain("Q2 sync.scope: pick=\"A: Records from the last 30 days.\" (OPEN: a note asks a question)");
});
test("a rewritten line reports only the changed words", () => {
	const reply = doc.replace("has limited storage", "has small storage");
	expect(reply).not.toBe(doc);
	const d = computeDelta(doc, reply);
	expect(d.text).toContain('edit CONTEXT: "…has limited storage.…" -> "…has small storage.…"');
});
test("replies under TERMS are reported by term", () => {
	const reply = insertAfter(insertAfter(doc, "[?] Device", ">> a phone or tablet"), "Avoid: collision", ">> support says clash, keep it?");
	const d = computeDelta(doc, reply);
	expect(d.text).toContain("TERMS Device: a phone or tablet");
	expect(d.text).toContain("TERMS Sync conflict: support says clash, keep it?");
});
test("notes in a review round are reported against the review line", () => {
	const r = renderRound(round({ questions: [], review: "- [settled] sync.conflict -- Last write wins." }), 5);
	const d = computeDelta(r, insertAfter(r, "[settled] sync.conflict", ">> add the log fields"));
	expect(d.text).toContain('REVIEW: re "- [settled] sync.conflict -- Last write…": add the log fields');
});
test("two ticks or no tick means ask again", () => {
	const both = doc.replace("[ ] B. Field-level merge.", "[x] B. Field-level merge.");
	expect(computeDelta(doc, both).text).toContain("SEVERAL PICKS: ask again");
	const none = doc.replace("[x] A. Records from", "[ ] A. Records from");
	expect(computeDelta(doc, none).text).toContain("Q2 sync.scope: pick=none (NO PICK: ask again)");
});
test("any mark in the box counts as a tick", () => {
	const reply = doc.replace("[x] A. Last write", "[ ] A. Last write").replace("[ ] B. Field-level", "[*] B. Field-level");
	expect(computeDelta(doc, reply).text).toContain('pick="B: Field-level merge." (changed from A)');
});
