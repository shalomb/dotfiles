/**
 * /view <file>[:line] [--edit] — show a file in a tmux popup with vim (read-only by default). No agent turn.
 * Also registers the `show_file` tool so the agent can put a file in front of you when you ask
 * ("show me X"). Both go through _lib/ui-gate.ts: shown if you are looking at pi's pane, otherwise
 * parked (bell + @pi_attn); child processes never surface. Editor: $PI_VIEW_EDITOR (default vim).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, statSync } from "node:fs";
import { notShownNote, openPopup } from "./_lib/ui-gate.ts";
import { parseViewArgs, viewArgv, type ViewTarget } from "./_lib/view-file.ts";

export default function (pi: ExtensionAPI) {
	const show = async (t: ViewTarget, cwd: string, hasUI: boolean): Promise<{ ok: boolean; text: string }> => {
		if (!existsSync(t.path)) return { ok: false, text: `no such file: ${t.path}` };
		if (statSync(t.path).isDirectory()) return { ok: false, text: `${t.path} is a directory; use /yazi` };
		if (!process.env.TMUX) return { ok: false, text: "/view needs a tmux session (popup)." };
		const res = await openPopup(pi.exec.bind(pi) as any, { name: "view", cwd, width: "95%", height: "95%", argv: viewArgv(t) }, process.env, hasUI);
		if (res.status !== "shown") return { ok: true, text: notShownNote(res, "view") };
		if (res.code !== 0) return { ok: false, text: `view popup failed (${res.code}): ${res.stderr?.trim() || "is vim installed?"}` };
		return { ok: true, text: `showed ${t.path}${t.line ? `:${t.line}` : ""}; popup closed` };
	};

	for (const name of ["view", "vi"]) {
		pi.registerCommand(name, {
			description: "/view <file>[:line] [--edit] — show a file in a tmux vim popup (read-only unless --edit; no agent turn).",
			handler: async (args: string, ctx: any) => {
				const p = parseViewArgs(args, ctx.cwd);
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
			"Open a file in a read-only vim popup in the user's tmux so they can read it. Use when the user asks to see/show/open a file. " +
			"Blocks until they close it. Do not use it to read a file yourself (use read).",
		parameters: Type.Object({
			path: Type.String({ description: "File path, relative to the working directory" }),
			line: Type.Optional(Type.Number({ description: "1-based line to jump to" })),
		}),
		async execute(_id: string, params: { path: string; line?: number }, _signal: unknown, _update: unknown, ctx: any) {
			const p = parseViewArgs(params.line ? `${params.path} +${params.line}` : params.path, ctx.cwd);
			const r = p.ok ? await show(p, ctx.cwd, ctx.hasUI !== false) : { ok: false, text: p.error };
			return { content: [{ type: "text", text: r.text }], details: {}, isError: !r.ok };
		},
	});
}
