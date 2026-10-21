// Run: bun test ~/.pi/agent/extensions/_lib/tmux-target.test.ts
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, utimesSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Deps, callerKey, loadTarget, planTmux, saveTarget, storeDir } from "./tmux-target";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "tmux-target-")); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("callerKey: tmux server pid + pane number; falls back to the session id outside tmux", () => {
	expect(callerKey({ TMUX: "/tmp/tmux-1001/default,64523,0", TMUX_PANE: "%7" }, "sess-1")).toBe("tmux-64523-7");
	expect(callerKey({}, "sess-1")).toBe("session-sess-1");
	expect(callerKey({ TMUX: "/s,1,0" }, "abc")).toBe("session-abc"); // no pane id
});

test("callerKey: never produces path separators or dots", () => {
	expect(callerKey({}, "../../etc/passwd")).toMatch(/^session-[A-Za-z0-9_-]+$/);
});

test("storeDir: XDG_STATE_HOME wins, else ~/.local/state", () => {
	expect(storeDir({ XDG_STATE_HOME: "/x/state" }, "/home/u")).toBe("/x/state/pi/tmux-targets");
	expect(storeDir({}, "/home/u")).toBe("/home/u/.local/state/pi/tmux-targets");
	expect(storeDir({ XDG_STATE_HOME: "relative" }, "/home/u")).toBe("/home/u/.local/state/pi/tmux-targets");
});

test("save/load round-trips; missing and corrupt files read as undefined", () => {
	const s = { target: "1.1", paneId: "%17", savedAt: 1000 };
	saveTarget(dir, "k1", s);
	expect(loadTarget(dir, "k1")).toEqual(s);
	expect(loadTarget(dir, "nope")).toBeUndefined();
	writeFileSync(join(dir, "bad.json"), "{not json");
	expect(loadTarget(dir, "bad")).toBeUndefined();
	writeFileSync(join(dir, "shape.json"), JSON.stringify({ target: 5 }));
	expect(loadTarget(dir, "shape")).toBeUndefined();
});

test("callers are independent: one file per key, overwrite only replaces its own", () => {
	saveTarget(dir, "a", { target: "1.1", savedAt: 1 });
	saveTarget(dir, "b", { target: "2.0", savedAt: 2 });
	saveTarget(dir, "a", { target: "3.3", savedAt: 3 });
	expect(loadTarget(dir, "a")?.target).toBe("3.3");
	expect(loadTarget(dir, "b")?.target).toBe("2.0");
});

test("save prunes entries untouched for 30+ days, keeps fresh ones", () => {
	saveTarget(dir, "old", { target: "9.9", savedAt: 1 });
	saveTarget(dir, "fresh", { target: "1.0", savedAt: 2 });
	const old = new Date(Date.now() - 31 * 86400_000);
	utimesSync(join(dir, "old.json"), old, old);
	saveTarget(dir, "new", { target: "2.2", savedAt: 3 });
	expect(readdirSync(dir).sort()).toEqual(["fresh.json", "new.json"]);
});

test("save leaves no temp files behind", () => {
	saveTarget(dir, "k", { target: "1.1", savedAt: 1 });
	expect(readdirSync(dir)).toEqual(["k.json"]);
});

// ---------------------------------------------------------------- planTmux
type Pane = { id: string; session: string; local: string };
function world(panes: Pane[], callerSession = "code") {
	const sent: string[] = [];
	const exec: Deps["exec"] = async (args) => {
		sent.push(args.join(" "));
		const t = args.indexOf("-t");
		if (t < 0) return { code: 0, stdout: `${callerSession}\n` };
		const want = args[t + 1];
		const p = panes.find((x) => x.id === want || x.local === want || `${x.session}:${x.local}` === want);
		return p ? { code: 0, stdout: `${p.id}\t${p.session}\t${p.local}\n` } : { code: 1, stdout: "" };
	};
	return { exec, sent };
}
function deps(over: Partial<Deps> & { panes: Pane[]; saved?: ReturnType<Deps["load"]>; callerSession?: string }) {
	const w = world(over.panes, over.callerSession);
	const saves: unknown[] = [];
	const d: Deps = { exec: w.exec, load: () => over.saved, save: (s) => void saves.push(s), ownPane: over.ownPane ?? "%2", now: () => 5000 };
	return { d, saves };
}
const P17: Pane = { id: "%17", session: "code", local: "3.0" };
const P11: Pane = { id: "%11", session: "code", local: "0.1" };
const text = (p: Awaited<ReturnType<typeof planTmux>>) => ("message" in p ? p.message : p.text);

test("plan: explicit target is resolved, saved with its pane id, and sent as typed", async () => {
	const { d, saves } = deps({ panes: [P17, P11] });
	const p = await planTmux("3.0 run the tests", d);
	expect(p.kind).toBe("send");
	expect(text(p)).toContain("Target pane: 3.0");
	expect(text(p)).not.toMatch(/remembered/i);
	expect(text(p)).toContain("run the tests");
	expect(saves).toEqual([{ target: "3.0", paneId: "%17", savedAt: 5000 }]);
});

test("plan: unknown explicit target is an error and saves nothing", async () => {
	const { d, saves } = deps({ panes: [P11] });
	const p = await planTmux("9.9 hi", d);
	expect(p.kind).toBe("error");
	expect(text(p)).toContain("9.9");
	expect(saves).toEqual([]);
});

test("plan: refuses this agent's own pane, explicit or remembered", async () => {
	const own: Pane = { id: "%2", session: "code", local: "0.0" };
	const a = deps({ panes: [own, P11] });
	expect((await planTmux("0.0 hi", a.d)).kind).toBe("error");
	expect(a.saves).toEqual([]);
	const b = deps({ panes: [own, P11], saved: { target: "0.0", paneId: "%2", savedAt: 1 } });
	expect((await planTmux("hi", b.d)).kind).toBe("error");
});

test("plan: no target and nothing remembered -> agent lists panes and chooses", async () => {
	const { d, saves } = deps({ panes: [P11] });
	const p = await planTmux("find vim", d);
	expect(p.kind).toBe("send");
	expect(text(p)).toMatch(/tmux-list/);
	expect(saves).toEqual([]);
});

test("plan: no target, remembered -> uses it, says so, passes the prompt", async () => {
	const { d, saves } = deps({ panes: [P17], saved: { target: "3.0", paneId: "%17", savedAt: 1 } });
	const p = await planTmux("status", d);
	expect(p.kind).toBe("send");
	expect(text(p)).toContain("Target pane: 3.0");
	expect(text(p)).toMatch(/remembered/i);
	expect(text(p)).toContain("status");
	expect(saves).toEqual([]); // unchanged, no rewrite
});

test("plan: pane moved since it was saved -> target follows the pane id, entry is refreshed", async () => {
	const moved: Pane = { id: "%17", session: "code", local: "2.0" };
	const { d, saves } = deps({ panes: [moved], saved: { target: "3.0", paneId: "%17", savedAt: 1 } });
	const p = await planTmux("status", d);
	expect(text(p)).toContain("Target pane: 2.0");
	expect(text(p)).not.toContain("Target pane: 3.0");
	expect(saves).toEqual([{ target: "2.0", paneId: "%17", savedAt: 5000 }]);
});

test("plan: remembered pane in another session is session-qualified", async () => {
	const other: Pane = { id: "%30", session: "work", local: "1.0" };
	const { d } = deps({ panes: [other], saved: { target: "work:1.0", paneId: "%30", savedAt: 1 } });
	expect(text(await planTmux("status", d))).toContain("Target pane: work:1.0");
});

test("plan: remembered pane no longer exists -> error telling the user how to reset", async () => {
	const { d, saves } = deps({ panes: [P11], saved: { target: "3.0", paneId: "%17", savedAt: 1 } });
	const p = await planTmux("status", d);
	expect(p.kind).toBe("error");
	expect(text(p)).toMatch(/no longer exists/i);
	expect(text(p)).toContain("/tmux");
	expect(saves).toEqual([]);
});

test("plan: remembered entry without a pane id is trusted as typed", async () => {
	const { d } = deps({ panes: [], saved: { target: "1.1", savedAt: 1 } });
	const p = await planTmux("status", d);
	expect(p.kind).toBe("send");
	expect(text(p)).toContain("Target pane: 1.1");
});

test("plan: bare /tmux shows usage and the current target; bare target sets it and summarises", async () => {
	const { d } = deps({ panes: [P17], saved: { target: "3.0", paneId: "%17", savedAt: 1 } });
	const info = await planTmux("   ", d);
	expect(info.kind).toBe("info");
	expect(text(info)).toMatch(/usage/i);
	expect(text(info)).toContain("3.0");
	const fresh = deps({ panes: [P11] });
	const set = await planTmux("0.1", fresh.d);
	expect(set.kind).toBe("send");
	expect(fresh.saves).toEqual([{ target: "0.1", paneId: "%11", savedAt: 5000 }]);
});
