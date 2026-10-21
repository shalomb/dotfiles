/**
 * /tmux [W.P] <prompt> — hand a request about another tmux pane to THIS agent.
 *   /tmux 1.1 run the tests and tell me what failed
 *   /tmux code:0.0 what is it waiting on?
 *   /tmux status                           (no target: reuses the last one you gave, per calling pane)
 *   /tmux find the pane running vim        (no target and none remembered: agent lists panes and chooses)
 * The last target is persisted at $XDG_STATE_HOME/pi/tmux-targets/<caller>.json (see _lib/tmux-target.ts),
 * keyed by tmux server pid + this pane, so it survives /compact, /new and restarts.
 * The agent loads the tmux-remote-control skill and uses its scripts; nothing here talks to tmux.
 * Logic + tests: _lib/tmux-command.ts + tmux-target.ts (and their tests).
 *
 * Load location: ~/.pi/agent/extensions/tmux-command.ts (global)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { homedir } from "node:os";
import { callerKey, loadTarget, planTmux, saveTarget, storeDir } from "./_lib/tmux-target.ts";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("tmux", {
		description: "/tmux [W.P] <prompt> — ask this agent to act on another tmux pane via the tmux-remote-control skill",
		handler: async (args, ctx) => {
			const dir = storeDir(process.env, homedir());
			const key = callerKey(process.env, ctx.sessionManager.getSessionId());
			const plan = await planTmux(args, {
				exec: async (a) => {
					const r = await pi.exec("tmux", a, { timeout: 5000 });
					return { code: r.code, stdout: r.stdout };
				},
				load: () => loadTarget(dir, key),
				save: (s) => saveTarget(dir, key, s),
				ownPane: process.env.TMUX_PANE,
			});
			if (plan.kind !== "send") return ctx.ui.notify(plan.text, plan.kind === "error" ? "error" : "info");
			if (!ctx.isIdle()) {
				pi.sendUserMessage(plan.message, { deliverAs: "followUp" });
				ctx.ui.notify("/tmux queued as follow-up", "info");
			} else {
				pi.sendUserMessage(plan.message);
			}
		},
	});
}
