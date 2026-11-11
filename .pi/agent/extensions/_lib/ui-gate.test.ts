// Run: cd .pi/agent/extensions && bun test _lib/ui-gate.test.ts
import { expect, test } from "bun:test";
import { decide, isChildProcess, parkArgs, popupArgs, popupTitle, splitArgs, visibleQuery, type PaneState } from "./ui-gate.ts";

const here: PaneState = { attached: true, windowActive: true, paneActive: true };

test("shows only when pane is active in the active window of an attached session", () => {
	expect(decide(here)).toBe("show");
	expect(decide({ ...here, attached: false })).toBe("park");
	expect(decide({ ...here, windowActive: false })).toBe("park");
	expect(decide({ ...here, paneActive: false })).toBe("park");
	expect(decide(undefined)).toBe("park");
});

test("child processes never surface", () => {
	expect(isChildProcess({}, true)).toBe(false);
	expect(isChildProcess({}, false)).toBe(true);
	for (const k of ["PI_SUBAGENT", "PI_BG_TASK", "PI_FUSION", "PI_CHILD"]) expect(isChildProcess({ [k]: "1" }, true)).toBe(true);
	expect(isChildProcess({ PI_A2A: "1" }, true)).toBe(false);
});

test("every tmux call targets the origin pane", () => {
	expect(visibleQuery("%3")).toEqual(["display-message", "-p", "-t", "%3", "#{session_attached}|#{window_active}|#{pane_active}"]);
	expect(splitArgs("%3", "/r", "cmd")).toEqual(["split-window", "-t", "%3", "-h", "-d", "-P", "-F", "#{pane_id}", "-l", "45%", "-c", "/r", "bash", "-c", "cmd"]);
	const p = popupArgs("%3", "/r", "changes", "work:2.1", "cmd");
	expect(p.slice(0, 3)).toEqual(["display-popup", "-t", "%3"]);
	expect(p).toContain("-E");
	expect(p[p.indexOf("-T") + 1]).toBe(" changes · work:2.1 ");
});

test("park rings the bell on the origin pane and sets @pi_attn", () => {
	const [bell, flag] = parkArgs("%3", "changes ready");
	expect(bell.join(" ")).toContain("%3");
	expect(flag).toEqual(["set-option", "-p", "-t", "%3", "@pi_attn", "changes ready"]);
});

test("popupTitle", () => expect(popupTitle("changes", "s:1.2")).toBe(" changes · s:1.2 "));

// ---- openPopup: the one path every popup command takes ----
import { openPopup } from "./ui-gate.ts";

const mkExec = (visible: string) => {
	const calls: { args: string[]; opts?: any }[] = [];
	const exec = async (_c: string, args: string[], opts?: any) => {
		calls.push({ args, opts });
		const out = args[0] === "display-message" ? (args.at(-1)!.includes("session_name") ? "work:2.1" : visible) : "";
		return { code: 0, stdout: out, stderr: "" };
	};
	return { exec, calls };
};
const env = { TMUX: "x", TMUX_PANE: "%4" };
const opts = { name: "sessions", cwd: "/r", width: "95%", height: "90%", argv: ["sh", "-c", "echo hi"] };

test("openPopup shows a targeted, titled popup with no timeout when the pane is focused", async () => {
	const { exec, calls } = mkExec("1|1|1");
	expect((await openPopup(exec, opts, env, true)).status).toBe("shown");
	const p = calls.find((c) => c.args[0] === "display-popup")!;
	expect(p.args.slice(0, 3)).toEqual(["display-popup", "-t", "%4"]);
	expect(p.args[p.args.indexOf("-T") + 1]).toBe(" sessions · work:2.1 ");
	expect(p.args[p.args.indexOf("-w") + 1]).toBe("95%");
	expect(p.args.slice(-3)).toEqual(["sh", "-c", "echo hi"]);
	expect(p.opts?.timeout).toBeUndefined();
});

test("openPopup parks instead of opening when the pane is not focused", async () => {
	const { exec, calls } = mkExec("1|0|1");
	expect((await openPopup(exec, opts, env, true)).status).toBe("parked");
	expect(calls.some((c) => c.args[0] === "display-popup")).toBe(false);
	expect(calls.some((c) => c.args.includes("@pi_attn"))).toBe(true);
});

test("openPopup skips for child processes and outside tmux", async () => {
	const { exec, calls } = mkExec("1|1|1");
	expect((await openPopup(exec, opts, { ...env, PI_SUBAGENT: "1" }, true)).status).toBe("skip");
	expect((await openPopup(exec, opts, {}, true)).status).toBe("skip");
	expect(calls.some((c) => c.args[0] === "display-popup")).toBe(false);
});

test("openPopup reports a failed popup", async () => {
	const exec = async (_c: string, a: string[]) => ({ code: a[0] === "display-popup" ? 1 : 0, stdout: a[0] === "display-message" ? "1|1|1" : "", stderr: "boom" });
	const r = await openPopup(exec, opts, env, true);
	expect(r).toMatchObject({ status: "shown", code: 1, stderr: "boom" });
});
