/**
 * /worktree --branch <type/name> [--base <ref>] <instructions> — make a git worktree under
 * <repo>/.worktrees and move this pi session into it (new session, header cwd = worktree).
 * Spec: .pi/docs/specs/worktree-cwd/spec.md. Logic and tests: _lib/worktree.ts.
 * Order matters: the Brief is appended as a user message BEFORE switchSession(); pi writes the
 * session file only once a message exists, and without a file open() falls back to process.cwd().
 * `back`, naming defaults and the extra guards are separate tickets (wt-back, wt-naming, wt-guards).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { buildBrief, parseWorktreeArgs, setupWorktree } from "./_lib/worktree";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("worktree", {
		description: "Make a git worktree and move this session into it: --branch <type/name> [--base <ref>] <instructions>",
		handler: async (args: string, ctx: any) => {
			const p = parseWorktreeArgs(args);
			if (p.back) return ctx.ui.notify("/worktree back is not implemented yet (ticket wt-back)", "error");
			if (p.error || !p.branch) return ctx.ui.notify(p.error ?? "usage: /worktree --branch <name> <instructions>", "error");

			const origin: string = ctx.cwd;
			const r = await setupWorktree((cmd, a, o) => pi.exec(cmd, a, o as any) as any, origin, { branch: p.branch, base: p.base });
			if (!r.ok) return ctx.ui.notify(`/worktree: ${r.error}`, "error");
			if (r.status) ctx.ui.notify(`/worktree: origin has uncommitted changes; they are not in the worktree:\n${r.status}`, "warning");

			const parentSession: string | undefined = ctx.sessionManager.getSessionFile();
			const sm = SessionManager.create(r.dir, ctx.sessionManager.getSessionDir(), { parentSession });
			const brief = buildBrief({ origin, base: r.base, branch: r.branch, parentSession, status: r.status, text: p.text });
			sm.appendMessage({ role: "user", content: [{ type: "text", text: brief }], timestamp: Date.now() });
			const file = sm.getSessionFile();
			if (!file) return ctx.ui.notify("/worktree: could not create a session file", "error");

			const res = await ctx.switchSession(file, {
				withSession: async (c: any) => {
					c.ui.notify(`/worktree: now in ${c.cwd} on ${r.branch}`, "info");
					await c.sendUserMessage(p.text || "Begin.");
				},
			});
			if (res.cancelled) ctx.ui.notify("/worktree: switch cancelled (worktree was kept)", "error");
		},
	});
}
