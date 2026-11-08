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
