/**
 * /explain <term> [--ring=<session|docs|code|harness>] [--json]
 *
 * Slash command to explain a term economically via concentric ring resolver:
 * Ring 1: Session context
 * Ring 2: Workspace documentation (ADRs, markdown, AGENTS.md)
 * Ring 3: Symbols & code (exports, classes, functions, types)
 * Ring 4: Harness / skills (installed skills & tools)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { formatExplanation, parseExplainArgs, resolveTerm } from "./_lib/explain.ts";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("explain", {
		description: "Explain a term using hierarchical concentric rings (session -> docs -> code -> harness)",
		getArgumentCompletions: (prefix: string) => {
			const flags = ["--ring=session", "--ring=docs", "--ring=code", "--ring=harness", "--json"];
			const matches = flags.filter((f) => f.startsWith(prefix));
			return matches.length ? matches.map((m) => ({ value: m, label: m })) : null;
		},
		handler: async (args: string, ctx: any) => {
			const parsed = parseExplainArgs(args);
			if (!parsed.term) {
				ctx.ui.notify("Usage: /explain <term> [--ring=session|docs|code|harness] [--json]", "warning");
				return;
			}

			// Extract session messages if available
			const sessionMessages: any[] = [];
			const sm = ctx.sessionManager;
			if (sm && typeof sm.getEntries === "function") {
				try {
					const entries = sm.getEntries();
					for (const entry of entries) {
						if (entry.type === "message" && entry.message) {
							sessionMessages.push(entry.message);
						}
					}
				} catch (err) {
					ctx.ui?.notify?.(`Could not load session entries: ${err instanceof Error ? err.message : String(err)}`, "warning");
				}
			}

			const resolution = await resolveTerm(parsed.term, {
				messages: sessionMessages,
				rootDir: ctx.cwd,
				targetRing: parsed.ring,
			});

			if (parsed.json) {
				const jsonStr = JSON.stringify(resolution, null, 2);
				if (typeof ctx.ui?.output === "function") {
					ctx.ui.output(jsonStr);
				} else {
					console.log(jsonStr);
				}
				return;
			}

			const formatted = formatExplanation(resolution);
			if (typeof ctx.ui?.output === "function") {
				ctx.ui.output(formatted);
			} else {
				console.log(formatted);
			}
		},
	});
}
