// Run: bun test ~/.pi/agent/extensions/_lib/tmux-command.test.ts
import { expect, test } from "bun:test";
import { buildTmuxMessage, parseTmuxArgs } from "./tmux-command";

test("parse: leading W.P is the target, the rest is the prompt", () => {
	expect(parseTmuxArgs("1.1 run the tests and tell me what failed")).toEqual({ target: "1.1", prompt: "run the tests and tell me what failed" });
	expect(parseTmuxArgs("  0.2   read the last 20 lines ")).toEqual({ target: "0.2", prompt: "read the last 20 lines" });
});

test("parse: session-qualified target is accepted", () => {
	expect(parseTmuxArgs("code:1.0 what is running?")).toEqual({ target: "code:1.0", prompt: "what is running?" });
});

test("parse: no target means the agent picks (prompt only)", () => {
	expect(parseTmuxArgs("find the pane running vim")).toEqual({ prompt: "find the pane running vim" });
});

test("parse: only the FIRST token counts; digits.digits later in the prompt are data", () => {
	expect(parseTmuxArgs("bump version to 1.2 in the pane")).toEqual({ prompt: "bump version to 1.2 in the pane" });
	expect(parseTmuxArgs("1.1 compare with 2.0")).toEqual({ target: "1.1", prompt: "compare with 2.0" });
});

test("parse: a bare target with no prompt, or empty input, yields an empty prompt", () => {
	expect(parseTmuxArgs("1.1")).toEqual({ target: "1.1", prompt: "" });
	expect(parseTmuxArgs("   ")).toEqual({ prompt: "" });
});

test("build: loads the skill, names the target, passes the prompt verbatim", () => {
	const m = buildTmuxMessage({ target: "1.1", prompt: "run `make test` & report" });
	expect(m.startsWith("/skill:tmux-remote-control ")).toBe(true);
	expect(m).toContain("1.1");
	expect(m).toContain("run `make test` & report");
});

test("build: states the safety contract (never the agent's own pane, current session)", () => {
	const m = buildTmuxMessage({ target: "1.1", prompt: "x" });
	expect(m).toMatch(/own pane/i);
	expect(m).toMatch(/current session/i);
});

test("build: without a target tells the agent to list panes and choose", () => {
	const m = buildTmuxMessage({ prompt: "check the build" });
	expect(m).toMatch(/tmux-list/);
	expect(m).not.toMatch(/Target pane:/);
});

test("build: without a prompt, asks the agent to inspect the pane (read-only)", () => {
	const m = buildTmuxMessage({ target: "1.1", prompt: "" });
	expect(m).toMatch(/read/i);
	expect(m).toMatch(/1\.1/);
});
