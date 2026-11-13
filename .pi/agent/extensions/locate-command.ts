/**
 * /locate [--list|-l] <path terms> [in|within|containing <content terms>]
 *
 * Zone-weighted file discovery (git ls-files + plocate).
 *  - In tmux (default): fzf popup over ranked candidates; Tab multi-selects, Enter adds
 *    the choice(s) to the prompt as @path references. No agent turn.
 *  - --list/-l, or outside tmux: <=25-line pointer receipt.
 * Spec: .pi/docs/specs/locate-command/spec.md
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locateForPicker, parseLocateArgs, pickerRows, runLocate, toMentions } from "./_lib/locate.ts";
import { notShownNote, openPopup } from "./_lib/ui-gate.ts";

const USAGE = "Usage: /locate [--list] <path terms> [in|within|containing <content terms>]";

// rows: display <TAB> absolute path <TAB> match line
const FZF = [
	"fzf --multi --delimiter=$'\\t' --with-nth=1 --layout=reverse --info=inline-right --ansi",
	"--prompt='locate> ' --header=\"$3\"",
	"--preview='bat -p --color=always --highlight-line {3} {2} 2>/dev/null || bat -p --color=always {2} 2>/dev/null || ls -la {2}'",
	"--preview-window='right,55%,border-left'",
	'--select-1 --exit-0 <"$1" | cut -f2 >"$2"',
].join(" ");

export default function (pi: ExtensionAPI) {
	pi.registerCommand("locate", {
		description: "Locate files by natural language; fzf-pick results into the prompt as @refs (--list for a receipt)",
		getArgumentCompletions: (prefix: string) => ("--list".startsWith(prefix) ? [{ value: "--list", label: "--list" }] : null),
		handler: async (args: string, ctx: any) => {
			const notify = (m: string, l: "info" | "warning" | "error" = "info") => ctx.ui.notify(m, l);
			const { query, list } = parseLocateArgs(args);
			if (!query) return notify(USAGE, "warning");

			const show = (text: string) => (typeof ctx.ui?.output === "function" ? ctx.ui.output(text) : notify(text));
			if (list || !process.env.TMUX) return show(await runLocate(query, { cwd: ctx.cwd }));

			const { items: ranked, note } = await locateForPicker(query, { cwd: ctx.cwd });
			if (!ranked.length) return notify(`locate: no matches for "${query}"`);

			const dir = mkdtempSync(join(tmpdir(), "pi-locate-"));
			try {
				const rows = join(dir, "rows");
				const out = join(dir, "chosen");
				writeFileSync(rows, `${pickerRows(ranked, ctx.cwd)}\n`);
				const res = await openPopup(pi.exec.bind(pi) as any, { name: "locate", cwd: ctx.cwd, width: "95%", height: "90%",
					argv: ["bash", "-c", FZF, "locate-picker", rows, out,
						note ?? "tab select · enter add @ref(s) to prompt · esc cancel"] }, process.env, ctx.hasUI !== false);
				if (res.status !== "shown") return notify(notShownNote(res, "locate"));
				if (res.code !== 0) return notify(`locate popup failed (${res.code}): ${res.stderr?.trim() || "is fzf installed?"}`, "error");

				let chosen: string[] = [];
				try { chosen = readFileSync(out, "utf8").split("\n").filter(Boolean); } catch {}
				if (!chosen.length) return notify("locate: nothing selected");

				const cur = ctx.ui.getEditorText?.() ?? "";
				ctx.ui.setEditorText(`${cur}${cur && !cur.endsWith(" ") ? " " : ""}${toMentions(chosen, ctx.cwd)} `);
				notify(`locate: added ${chosen.length} path(s) to prompt`);
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		},
	});
}
