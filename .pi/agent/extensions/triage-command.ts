/**
 * /triage [file | topic] — sort an input (default: the latest artifact in the conversation)
 * into backlog decisions: dup / new / merge / upstream / defer / drop / goal.
 * Read-only until the user confirms; then the agent creates cards with the todo CLI.
 * Logic + tests: _lib/triage.ts, _lib/triage.test.ts.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { triagePrompt } from "./_lib/triage.ts";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("triage", {
		description: "Triage a file/topic (default: latest artifact) against the todo backlog; confirm before creating cards.",
		handler: async (args: string, ctx: any) => {
			const [br, brief] = await Promise.all([
				pi.exec("git", ["-C", ctx.cwd, "branch", "--show-current"], { timeout: 5000 }),
				pi.exec("todo", ["brief"], { cwd: ctx.cwd, timeout: 5000 } as any),
			]);
			const message = triagePrompt({
				cwd: ctx.cwd,
				branch: br.stdout.trim() || "(detached)",
				brief: brief.code === 0 && brief.stdout.trim() ? brief.stdout.trim() : "No backlog for this repo.",
				subject: args,
			});
			if (ctx.isIdle()) pi.sendUserMessage(message);
			else pi.sendUserMessage(message, { deliverAs: "followUp" });
		},
	});
}
