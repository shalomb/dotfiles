/**
 * /worktree --branch <type/name> [--base <ref>] <instructions> — make a git worktree under
 * <repo>/.worktrees and move this pi session into it (new session, header cwd = worktree).
 * Spec: .pi/docs/specs/worktree-cwd/spec.md. Logic and tests: _lib/worktree.ts.
 * Order matters: the Brief is appended as a user message BEFORE switchSession(); pi writes the
 * session file only once a message exists, and without a file open() falls back to process.cwd().
 * `/worktree <existing path|dir|branch> [instructions]` hops into that worktree; `back` returns to the parent session.
 * `back`, naming defaults and the extra guards are separate tickets (wt-back, wt-naming, wt-guards).
 */
import { existsSync } from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { buildBrief, findWorktree, parseWorktreeArgs, setupWorktree } from "./_lib/worktree";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("worktree", {
		description: "Hop into a worktree: --branch <type/name> [--base <ref>] <instructions> (new) | <existing path|dir|branch> [instructions] | back",
		handler: async (args: string, ctx: any) => {
			const p = parseWorktreeArgs(args);
			if (p.back) {
				const parent: string | undefined = ctx.sessionManager.getHeader?.()?.parentSession;
				if (!parent || !existsSync(parent)) return ctx.ui.notify("/worktree back: this session has no parent session to return to", "error");
				const res = await ctx.switchSession(parent, { withSession: async (c: any) => c.ui.notify(`/worktree: back in ${c.cwd}`, "info") });
				if (res.cancelled) ctx.ui.notify("/worktree back: switch cancelled", "error");
				return;
			}
			if (p.error && !p.target) return ctx.ui.notify(p.error, "error");
			const origin: string = ctx.cwd;
			const exec = (cmd: string, a: string[], o: unknown) => pi.exec(cmd, a, o as any) as any;
			let r: any;
			if (p.target) {
				const f = await findWorktree(exec, origin, p.target);
				if (!f.ok) return ctx.ui.notify(`/worktree: ${f.error}\n(to create a new worktree use --branch <type/name>)`, "error");
				r = { ok: true, dir: f.dir, base: "(existing worktree)", branch: f.branch, status: "" };
			}
			if (!r && !p.branch) return ctx.ui.notify(p.error ?? "usage: /worktree --branch <name> <instructions>", "error");

			if (!r) r = await setupWorktree(exec, origin, { branch: p.branch!, base: p.base });
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
