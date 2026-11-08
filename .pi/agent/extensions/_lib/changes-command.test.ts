// Run: cd .pi/agent/extensions && bun test _lib/changes-command.test.ts
import { expect, test } from "bun:test";
import ext from "../changes-command.ts";

function setup(visible: string, env: Record<string, string>) {
	const calls: { cmd: string; args: string[]; opts?: any }[] = [];
	const handlers: Record<string, any> = {};
	const cmds: Record<string, any> = {};
	const pi: any = {
		exec: async (cmd: string, args: string[], opts?: any) => {
			calls.push({ cmd, args, opts });
			let out = "";
			if (cmd === "git") out = "/repo";
			if (args[0] === "display-message") out = args.at(-1)!.includes("session_name") ? "work:2.1" : args.at(-1)!.includes("pane_id}") && !args.at(-1)!.includes("|") ? "%9" : visible;
			if (args[0] === "split-window") out = "%9";
			return { code: 0, stdout: out, stderr: "" };
		},
		on: (n: string, h: any) => (handlers[n] = h),
		registerCommand: (n: string, o: any) => (cmds[n] = o),
		registerShortcut: () => {},
	};
	Object.assign(process.env, { TMUX: "x", TMUX_PANE: "%4" });
	for (const k of ["PI_SUBAGENT", "PI_BG_TASK", "PI_FUSION", "PI_CHILD"]) delete process.env[k];
	Object.assign(process.env, env);
	ext(pi);
	const ctx: any = { cwd: "/repo", hasUI: true, ui: { notify: () => {} } };
	return { calls, handlers, cmds, ctx };
}
const tmuxCalls = (c: any[], verb: string) => c.filter((x) => x.cmd === "tmux" && x.args[0] === verb);

test("tool_result never opens a pane or popup", async () => {
	const s = setup("1|1|1", {});
	await s.handlers.tool_result?.({ toolName: "edit" }, s.ctx);
	expect(tmuxCalls(s.calls, "split-window")).toEqual([]);
	expect(tmuxCalls(s.calls, "display-popup")).toEqual([]);
});

test("/changes popup is targeted at the origin pane with no timeout", async () => {
	const s = setup("1|1|1", {});
	await (s.cmds.changes.handler ?? s.cmds.changes)("popup", s.ctx);
	const p = tmuxCalls(s.calls, "display-popup")[0];
	expect(p.args.slice(0, 3)).toEqual(["display-popup", "-t", "%4"]);
	expect(p.opts?.timeout).toBeUndefined();
});

test("/changes split is targeted at the origin pane", async () => {
	const s = setup("1|1|1", {});
	await (s.cmds.changes.handler ?? s.cmds.changes)("", s.ctx);
	expect(tmuxCalls(s.calls, "split-window")[0].args.slice(0, 3)).toEqual(["split-window", "-t", "%4"]);
});

test("unfocused origin pane parks: no UI", async () => {
	const s = setup("1|0|1", {});
	await (s.cmds.changes.handler ?? s.cmds.changes)("popup", s.ctx);
	expect(tmuxCalls(s.calls, "display-popup")).toEqual([]);
	expect(tmuxCalls(s.calls, "split-window")).toEqual([]);
});

test("child processes never surface", async () => {
	const s = setup("1|1|1", { PI_SUBAGENT: "1" });
	await (s.cmds.changes.handler ?? s.cmds.changes)("popup", s.ctx);
	expect(tmuxCalls(s.calls, "display-popup")).toEqual([]);
});

test("session_shutdown kills a panel it opened", async () => {
	const s = setup("1|1|1", {});
	await (s.cmds.changes.handler ?? s.cmds.changes)("", s.ctx);
	await s.handlers.session_shutdown?.({}, s.ctx);
	expect(tmuxCalls(s.calls, "kill-pane").length).toBeGreaterThan(0);
});
