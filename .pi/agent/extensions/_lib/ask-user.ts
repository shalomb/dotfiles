// Pure logic for the ask_user_question tool: validation + a dialog walker over
// ctx.ui.select/input. No TUI components, so it works in RPC hosts too.

export interface Option {
	label: string;
	description?: string;
}
export interface Question {
	question: string;
	options: Option[];
	multiSelect?: boolean;
}
export interface Answer {
	question: string;
	kind: "option" | "custom" | "multi";
	answer: string | null;
	selected?: string[];
	custom?: string;
}
export interface Result {
	cancelled: boolean;
	answers: Answer[];
}
export interface Ui {
	select(title: string, options: string[]): Promise<string | undefined>;
	input(title: string, placeholder?: string): Promise<string | undefined>;
}

export const CUSTOM = "Type something.";
export const DONE = "Done";
const RESERVED = new Set(["other", CUSTOM.toLowerCase(), DONE.toLowerCase()]);

export type ValidationError =
	| "no_questions" | "too_many_questions" | "too_few_options"
	| "duplicate_question" | "duplicate_option_label" | "reserved_label";

export function validate(qs: Question[]): ValidationError | undefined {
	if (qs.length === 0) return "no_questions";
	if (qs.length > 4) return "too_many_questions";
	if (new Set(qs.map((q) => q.question)).size !== qs.length) return "duplicate_question";
	for (const q of qs) {
		if (q.options.length < 2) return "too_few_options";
		const labels = q.options.map((o) => o.label);
		if (labels.some((l) => RESERVED.has(l.trim().toLowerCase()))) return "reserved_label";
		if (new Set(labels).size !== labels.length) return "duplicate_option_label";
	}
	return undefined;
}

const title = (q: Question, extra = "") =>
	[q.question + extra, ...q.options.map((o, i) => (o.description ? `${i + 1}. ${o.label} — ${o.description}` : ""))]
		.filter(Boolean)
		.join("\n");
const rows = (q: Question) => q.options.map((o, i) => `${i + 1}. ${o.label}`);
const labelOf = (q: Question, row: string) => q.options[rows(q).indexOf(row)]?.label;

async function askCustom(ui: Ui, q: Question): Promise<string | undefined | null> {
	const text = await ui.input(q.question, "Your answer");
	if (text === undefined) return undefined; // dismissed
	return text.trim() || null; // blank -> back to options
}

async function askOne(ui: Ui, q: Question): Promise<Answer | undefined> {
	if (!q.multiSelect) {
		for (;;) {
			const row = await ui.select(title(q), [...rows(q), CUSTOM]);
			if (row === undefined) return undefined;
			if (row === CUSTOM) {
				const t = await askCustom(ui, q);
				if (t === undefined) return undefined;
				if (t === null) continue;
				return { question: q.question, kind: "custom", answer: t };
			}
			const answer = labelOf(q, row);
			if (answer) return { question: q.question, kind: "option", answer };
		}
	}
	const picked = new Set<string>();
	let custom: string | undefined;
	for (;;) {
		const marked = rows(q).map((r) => (picked.has(labelOf(q, r) as string) ? `${r} ✓` : r));
		const row = await ui.select(title(q, " (select any, then Done)"), [...marked, CUSTOM, DONE]);
		if (row === undefined) return undefined;
		if (row === DONE) break;
		if (row === CUSTOM) {
			const t = await askCustom(ui, q);
			if (t === undefined) return undefined;
			if (t !== null) custom = t;
			continue;
		}
		const label = labelOf(q, row.replace(/ ✓$/, ""));
		if (label) picked.has(label) ? picked.delete(label) : picked.add(label);
	}
	const a: Answer = { question: q.question, kind: "multi", answer: null, selected: q.options.map((o) => o.label).filter((l) => picked.has(l)) };
	if (custom) a.custom = custom;
	return a;
}

export async function askQuestions(ui: Ui, qs: Question[]): Promise<Result> {
	const answers: Answer[] = [];
	for (const q of qs) {
		const a = await askOne(ui, q);
		if (!a) return { cancelled: true, answers: [] };
		answers.push(a);
	}
	return { cancelled: false, answers };
}

export function formatResult(r: Result): string {
	if (r.cancelled) return "User declined to answer questions";
	const parts = r.answers.map((a) => {
		const v = a.kind === "multi" ? [...(a.selected ?? []), ...(a.custom ? [a.custom] : [])].join(", ") || "(none)" : a.answer;
		return `"${a.question}"="${v}"`;
	});
	return `User has answered your questions: ${parts.join(", ")}. You can now continue with the user's answers in mind.`;
}
