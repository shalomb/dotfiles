// Run: bun test ~/.pi/agent/extensions/_lib/ask-user.test.ts
import { expect, test } from "bun:test";
import { type Ui, askQuestions, validate } from "./ask-user";

const q = (question: string, labels: string[], multiSelect = false) => ({
	question,
	multiSelect,
	options: labels.map((label) => ({ label, description: `${label} desc` })),
});

/** Scripted UI: select/input pop from queues; undefined = dismissed. */
const ui = (selects: (string | undefined)[], inputs: (string | undefined)[] = []): Ui => ({
	select: async () => selects.shift(),
	input: async () => inputs.shift(),
});

test("validate: rejects empty, >4 questions, <2 options, duplicates, reserved labels", () => {
	expect(validate([])).toBe("no_questions");
	expect(validate(Array.from({ length: 5 }, (_, i) => q(`q${i}?`, ["a", "b"])))).toBe("too_many_questions");
	expect(validate([q("x?", ["a"])])).toBe("too_few_options");
	expect(validate([q("x?", ["a", "b"]), q("x?", ["a", "b"])])).toBe("duplicate_question");
	expect(validate([q("x?", ["a", "a"])])).toBe("duplicate_option_label");
	expect(validate([q("x?", ["a", "Other"])])).toBe("reserved_label");
	expect(validate([q("x?", ["a", "b"])])).toBeUndefined();
});

test("single select returns the chosen label", async () => {
	const r = await askQuestions(ui(["1. red"]), [q("Colour?", ["red", "blue"])]);
	expect(r.cancelled).toBe(false);
	expect(r.answers).toEqual([{ question: "Colour?", kind: "option", answer: "red" }]);
});

test("'Type something.' falls through to free text", async () => {
	const r = await askQuestions(ui(["Type something."], ["teal"]), [q("Colour?", ["red", "blue"])]);
	expect(r.answers[0]).toEqual({ question: "Colour?", kind: "custom", answer: "teal" });
});

test("blank or dismissed custom text returns to the options", async () => {
	const r = await askQuestions(ui(["Type something.", "2. blue"], ["  "]), [q("Colour?", ["red", "blue"])]);
	expect(r.answers[0].answer).toBe("blue");
});

test("dismissing any dialog cancels the whole questionnaire", async () => {
	const r = await askQuestions(ui(["1. a", undefined]), [q("one?", ["a", "b"]), q("two?", ["a", "b"])]);
	expect(r.cancelled).toBe(true);
	expect(r.answers).toEqual([]);
});

test("multi select toggles then Done; custom text is kept alongside", async () => {
	const r = await askQuestions(
		ui(["1. a", "3. c", "1. a", "Type something.", "Done"], ["extra"]),
		[q("Pick?", ["a", "b", "c"], true)],
	);
	// a on, c on, a off, custom added, done
	expect(r.answers[0]).toEqual({ question: "Pick?", kind: "multi", answer: null, selected: ["c"], custom: "extra" });
});

// ---- abort signal: lets a remote cancel (or Esc on the run) close an open dialog ----
test("every dialog call receives the abort signal", async () => {
	const seen: unknown[] = [];
	const spy: Ui = {
		select: async (_t, _o, opts) => { seen.push(opts?.signal); return seen.length === 1 ? "Type something." : "1. a"; },
		input: async (_t, _p, opts) => { seen.push(opts?.signal); return "typed"; },
	};
	const ac = new AbortController();
	await askQuestions(spy, [q("one?", ["a", "b"]), q("two?", ["a", "b"])], ac.signal);
	expect(seen.length).toBe(3);
	expect(seen.every((s) => s === ac.signal)).toBe(true);
});

test("an already-aborted signal cancels without opening any dialog", async () => {
	let opened = 0;
	const spy: Ui = { select: async () => { opened++; return "1. a"; }, input: async () => { opened++; return "x"; } };
	const ac = new AbortController();
	ac.abort();
	const r = await askQuestions(spy, [q("one?", ["a", "b"])], ac.signal);
	expect(r).toEqual({ cancelled: true, answers: [] });
	expect(opened).toBe(0);
});

test("aborting while a dialog is open cancels the questionnaire and opens no further dialogs", async () => {
	const ac = new AbortController();
	let opened = 0;
	const spy: Ui = {
		select: async () => { opened++; ac.abort(); return "1. a"; }, // user answers just as the abort lands
		input: async () => undefined,
	};
	const r = await askQuestions(spy, [q("one?", ["a", "b"]), q("two?", ["a", "b"])], ac.signal);
	expect(r.cancelled).toBe(true);
	expect(opened).toBe(1);
});

test("without a signal behaviour is unchanged", async () => {
	const r = await askQuestions(ui(["1. red"]), [q("Colour?", ["red", "blue"])]);
	expect(r.answers[0].answer).toBe("red");
});
