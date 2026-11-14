// Run: cd .pi/agent/extensions/_lib && bun test pi-attn
import { expect, test } from "bun:test";
import { attnPlan, CLEAR } from "./pi-attn.ts";

const P = "%7";
const clear = ["set-option", "-p", "-u", "-t", P, "@pi_attn"];
const flag = (reason: string) => ["set-option", "-p", "-t", P, "@pi_attn", reason];
const bell = ["run-shell", "-t", P, "printf '\\a' > #{pane_tty}"];

test("a dialog that waits for the user flags the pane as stopped with its title, and rings when the pane is out of sight", () => {
	const r = attnPlan({ type: "prompt_start", kind: "confirm", title: "Lock the done-check?" }, P, { owns: false, visible: false });
	expect(r.cmds).toEqual([bell, flag("stopped: Lock the done-check?")]);
	expect(r.owns).toBe(true);
});

test("a dialog on the pane the user is looking at flags it without a bell", () => {
	const r = attnPlan({ type: "prompt_start", kind: "select" }, P, { owns: false, visible: true });
	expect(r.cmds).toEqual([flag("stopped: select")]);
});

test("the dialog closing clears only a flag this extension set", () => {
	expect(attnPlan({ type: "prompt_end" }, P, { owns: true, visible: true }).cmds).toEqual([clear]);
	expect(attnPlan({ type: "prompt_end" }, P, { owns: false, visible: true }).cmds).toEqual([]);
});

test("the user typing into the pane clears any flag (they have answered); extension input does not", () => {
	expect(attnPlan({ type: "input", source: "interactive" }, P, { owns: false, visible: true })).toEqual({ cmds: [clear], owns: false });
	expect(attnPlan({ type: "input", source: "extension" }, P, { owns: false, visible: true }).cmds).toEqual([]);
});

test("quitting pi clears the flag; a reload keeps it", () => {
	expect(attnPlan({ type: "shutdown", reason: "quit" }, P, { owns: false, visible: false }).cmds).toEqual([clear]);
	expect(attnPlan({ type: "shutdown", reason: "reload" }, P, { owns: true, visible: false }).cmds).toEqual([]);
});

test("CLEAR is the unset command for a pane", () => {
	expect(CLEAR(P)).toEqual(clear);
});
