/**
 * /sessions [list|summarize] [filters] — past agent sessions (pi, claude, copilot,
 * gemini/antigravity) in a tmux popup. Scanning/filtering/summarising: _lib/sessions.ts.
 *
 *   /sessions                                  table of everything, newest first
 *   /sessions --tool pi,claude --since 7d      filtered table
 *   /sessions summarize terraform --since 3d   Haiku summary of the matching sessions
 *
 * Filters: --tool a,b  --since 7d|12h|2w|YYYY-MM-DD  --until ...  --cwd SUBSTR
 *          --grep TEXT (or bare words)  --min-msgs N  --limit N
 * summarize only: --model provider/id (default anthropic/claude-haiku-4-5)  --dry-run
 * No agent turn in this session; the summary is a separate one-shot `pi -p` call.
 * Hand-maintained: not generated from commands.json.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./_lib/sessions";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "_lib", "sessions.ts");
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export default function (pi: ExtensionAPI) {
	pi.registerCommand("sessions", {
		description: "Past agent sessions in a tmux popup. `summarize` = Haiku summary. Filters: --tool --since --until --cwd --grep --min-msgs --limit",
		handler: async (args: string, ctx: any) => {
			if (!process.env.TMUX) return ctx.ui.notify("/sessions needs a tmux session (popup).", "error");
			const argv = args.trim() ? args.trim().split(/\s+/) : [];
			let parsed;
			try { parsed = parseArgs(argv); } catch (e) { return ctx.ui.notify(`/sessions: ${(e as Error).message}`, "error"); }

			const extra = argv.map(q).join(" ");
			// Inside the popup: table -> less; summarize -> temp file -> less. On failure keep the
			// popup open until a key is pressed so the error is readable.
			const cmd = parsed.cmd === "summarize" && !parsed.dryRun
				? `t=$(mktemp); bun ${q(SCRIPT)} ${extra} >"$t"; rc=$?; if [ $rc -ne 0 ]; then printf '\\n[exit %s] press a key' $rc; read -r _; else less -R "$t"; fi; rm -f "$t"`
				: `bun ${q(SCRIPT)} --width "$(tput cols)" ${extra} | less -RSX --header=1`;
			const title = parsed.cmd === "summarize" ? " Sessions summary (q to close) " : " Sessions (q to close) ";
			const res = await pi.exec("tmux", ["display-popup", "-E", "-d", ctx.cwd, "-w", "95%", "-h", "90%", "-T", title, "sh", "-c", cmd]);
			if (res.code !== 0) ctx.ui.notify(`sessions popup failed (${res.code}): ${res.stderr.trim()}`, "error");
		},
	});
}
