// Run: cd .pi/agent/extensions && bun test _lib/changes-command.test.ts
import { beforeEach, expect, test } from "bun:test";
import changes from "../changes-command.ts";

type Call = { cmd: string; args: string[]; opts?: any };
let calls: Call[];
let handlers: Record<string, Function>;
let cmds: Record<string, any>;

const fakePi = (stdout = "1|1|1") => ({
	exec: async (cmd: string, args: string[], opts?: any) => {
		calls.push({ cmd, args, opts });
		return { code: 0, stdout: cmd === "tmux" && args[0] === "display-message" ? stdout : "%9", stderr: "" };
	},
	on: (n: string, h: Function) => (handlers[n] = h),
	registerShortcut: () => {},
	registerCommand: (n: string, c: any) => (cmds[n] = c),
});
const ctx = { cwd: "/tmp", hasUI: true, ui: { notify: () => {} } };

beforeEach(() => {
	calls = []; handlers = {}; cmds = {};
	process.env.TMUX = "/tmp/tmux,1,0"; process.env.TMUX_PANE = "%1";
	for (const k of ["PI_SUBAGENT", "PI_BG_TASK", "PI_FUSION", "PI_CHILD"]) delete process.env[k];
});
const tmuxCalls = () => calls.filter((c) => c.cmd === "tmux");

test("agent edits never auto-open a pane", async () => {
	changes(fakePi() as any);
	await handlers.tool_result?.({ toolName: "edit" }, ctx);
	expect(tmuxCalls().filter((c) => c.args[0] === "split-window")).toEqual([]);
});

test("explicit /changes targets the origin pane on split", async () => {
	changes(fakePi() as any);
	const run = Object.values(cmds)[0].handler;
	await run("", ctx);
	const split = tmuxCalls().find((c) => c.args[0] === "split-window");
	expect(split?.args.slice(0, 3)).toEqual(["split-window", "-t", "%1"]);
});

test("popup is titled with its origin, targeted, and has no 5s timeout", async () => {
	changes(fakePi() as any);
	await Object.values(cmds)[0].handler("popup", ctx);
	const p = tmuxCalls().find((c) => c.args[0] === "display-popup");
	expect(p?.args.slice(0, 3)).toEqual(["display-popup", "-t", "%1"]);
	expect(p?.args[p.args.indexOf("-T") + 1]).toContain("·");
	expect(p?.opts?.timeout).toBeUndefined();
});

test("popup from a pane the user isn't looking at is parked, not shown", async () => {
	changes(fakePi("1|0|1") as any);
	await Object.values(cmds)[0].handler("popup", ctx);
	expect(tmuxCalls().some((c) => c.args[0] === "display-popup")).toBe(false);
	expect(tmuxCalls().some((c) => c.args.includes("@pi_attn"))).toBe(true);
});

test("child processes never surface", async () => {
	process.env.PI_SUBAGENT = "1";
	changes(fakePi() as any);
	await Object.values(cmds)[0].handler("popup", ctx);
	expect(tmuxCalls().some((c) => c.args[0] === "display-popup" || c.args[0] === "split-window")).toBe(false);
});
