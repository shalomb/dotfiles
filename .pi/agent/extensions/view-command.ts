/**
 * /view <file>[:line] — show a file read-only in a tmux editor popup; /vi <file>[:line] edits it. No agent turn.
 * Also registers the `show_file` tool so the agent can put a file in front of you when you ask
 * ("show me X"). Both go through _lib/ui-gate.ts: shown if you are looking at pi's pane, otherwise
 * parked (bell + @pi_attn); child processes never surface. Editor: $PI_VIEW_EDITOR (default vim).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, readFileSync, statSync } from "node:fs";
import { notShownNote, openPopup } from "./_lib/ui-gate.ts";
import { editOutcome, parseViewArgs, viewArgv, type ViewTarget } from "./_lib/view-file.ts";

export default function (pi: ExtensionAPI) {
	const show = async (t: ViewTarget, cwd: string, hasUI: boolean): Promise<{ ok: boolean; text: string }> => {
		if (!existsSync(t.path)) return { ok: false, text: `no such file: ${t.path}` };
		if (statSync(t.path).isDirectory()) return { ok: false, text: `${t.path} is a directory; use /yazi` };
		if (!process.env.TMUX) return { ok: false, text: "/view needs a tmux session (popup)." };
		const before = t.edit ? readFileSync(t.path, "utf8") : undefined;
		const res = await openPopup(pi.exec.bind(pi) as any, { name: "view", cwd, width: "95%", height: "95%", argv: viewArgv(t) }, process.env, hasUI);
		if (res.status !== "shown") return { ok: true, text: notShownNote(res, "view") };
		if (res.code !== 0) return { ok: false, text: `view popup failed (${res.code}): ${res.stderr?.trim() || "is $VISUAL/$EDITOR set to a working editor?"}` };
		if (t.edit) return { ok: true, text: editOutcome(t.path, before, readFileSync(t.path, "utf8")) };
		return { ok: true, text: `showed ${t.path}${t.line ? `:${t.line}` : ""}; popup closed` };
	};

	for (const [name, defaultEdit] of [["view", false], ["vi", true]] as const) {
		pi.registerCommand(name, {
			description: defaultEdit
				? "/vi <file>[:line] — edit a file in a tmux editor popup (no agent turn)."
				: "/view <file>[:line] [--edit] — show a file read-only in a tmux editor popup (no agent turn).",
			handler: async (args: string, ctx: any) => {
				const p = parseViewArgs(args, ctx.cwd, undefined, { defaultEdit });
				if (!p.ok) return ctx.ui.notify(p.error, "error");
				const r = await show(p, ctx.cwd, ctx.hasUI !== false);
				ctx.ui.notify(r.text, r.ok ? "info" : "error");
			},
		});
	}

	pi.registerTool({
		name: "show_file",
		label: "Show file",
		description:
			"Open a file in a vim popup in the user's tmux so they can read it (read-only) or edit it themselves (edit: true). " +
			"Use when the user asks to see/show/open a file, or when a decision is theirs to write (key results, a goal, a vision): " +
			"hand them the file with edit: true instead of writing it for them. Blocks until they close it; the result says " +
			"whether they saved changes (re-read the file if so). Do not use it to read a file yourself (use read).",
		parameters: Type.Object({
			path: Type.String({ description: "File path, relative to the working directory" }),
			line: Type.Optional(Type.Number({ description: "1-based line to jump to" })),
			edit: Type.Optional(Type.Boolean({ description: "Open editable so the user can change and save it (default read-only)" })),
		}),
		async execute(_id: string, params: { path: string; line?: number; edit?: boolean }, _signal: unknown, _update: unknown, ctx: any) {
			const p = parseViewArgs(`${JSON.stringify(params.path)}${params.line ? ` +${params.line}` : ""}${params.edit ? " --edit" : ""}`, ctx.cwd);
			const r = p.ok ? await show(p, ctx.cwd, ctx.hasUI !== false) : { ok: false, text: p.error };
			return { content: [{ type: "text", text: r.text }], details: {}, isError: !r.ok };
		},
	});
}
