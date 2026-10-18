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
