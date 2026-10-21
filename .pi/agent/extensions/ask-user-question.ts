/**
 * ask_user_question — minimal structured questionnaire for the model.
 * 1-4 questions, 2-4 options each, answered via pi's built-in select/input
 * dialogs (works in TUI and RPC hosts). "Type something." is always appended.
 * Logic + tests: _lib/ask-user.ts, _lib/ask-user.test.ts.
 *
 * Load location: ~/.pi/agent/extensions/ask-user-question.ts (global)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { askQuestions, formatResult, validate } from "./_lib/ask-user.ts";

const Params = Type.Object({
	questions: Type.Array(
		Type.Object({
			question: Type.String({ description: "Full question text, ending with '?'" }),
			options: Type.Array(
				Type.Object({
					label: Type.String({ maxLength: 60, description: "1-5 words" }),
					description: Type.Optional(Type.String({ description: "What the choice means / its trade-off" })),
				}),
				{ minItems: 2, maxItems: 4 },
			),
			multiSelect: Type.Optional(Type.Boolean({ description: "Allow several answers (default false)" })),
		}),
		{ minItems: 1, maxItems: 4 },
	),
});

const fail = (error: string, text: string) => ({
	content: [{ type: "text" as const, text }],
	details: { cancelled: true, answers: [], error },
});

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user_question",
		label: "Ask user",
		description:
			"Ask the user 1-4 multiple-choice questions when a real decision would otherwise be a guess. " +
			"Give 2-4 options each with a short description; put the recommended one first. " +
			"The user can always type their own answer. Do not use for trivia you can look up.",
		promptSnippet: "Ask the user structured multiple-choice questions instead of guessing",
		parameters: Params,
		async execute(_id, params, signal, _onUpdate, ctx) {
			if (!ctx.hasUI) return fail("no_ui", "Error: UI not available (non-interactive mode); ask in plain text instead.");
			const err = validate(params.questions);
			if (err) return fail(err, `Error: invalid questionnaire (${err}). Fix and retry.`);
			const result = await askQuestions(ctx.ui, params.questions, signal);
			return { content: [{ type: "text" as const, text: formatResult(result) }], details: result };
		},
	});
}
