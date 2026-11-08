/**
 * /resume <uuid> — resume a session by ID. Bare `/resume` is matched exactly by pi's built-in
 * (opens the picker) before extension commands run, so this handler only sees `/resume <args>`.
 * Resolution: _lib/resume-id.ts (tested). Only full UUIDs for now.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { homedir } from "node:os";
import { join } from "node:path";
import { isSessionId, resolveSessionId } from "./_lib/resume-id";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("resume", {
		description: "Resume a session by UUID: /resume <uuid>. Bare /resume opens the picker.",
		handler: async (args: string, ctx: any) => {
			const id = args.trim();
			if (!isSessionId(id)) return ctx.ui.notify("Usage: /resume <session-uuid>  (bare /resume opens the picker)", "error");
			const root = join(process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"), "sessions");
			const [file] = resolveSessionId(id, root);
			if (!file) return ctx.ui.notify(`No session ${id} under ${root}`, "error");
			await ctx.waitForIdle?.();
			await ctx.switchSession(file);
		},
	});
}
