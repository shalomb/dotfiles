// Run: bun test ~/.pi/agent/extensions/_lib/goal-check.test.ts
import { expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { formatReport, runDoneCheck } from "./goal-check.ts";
import type { Exec } from "./goal-io.ts";

const real: Exec = (cmd, args, o) =>
	new Promise((res) => execFile(cmd, args, { cwd: o?.cwd, timeout: o?.timeout }, (e: any, stdout, stderr) => res({ code: e ? (typeof e.code === "number" ? e.code : 1) : 0, stdout, stderr, killed: !!e?.killed })));

test("runs every command in order through bash -c at cwd, even after a failure", async () => {
	const calls: string[] = [];
	const exec: Exec = async (cmd, args, o) => {
		calls.push(`${cmd} ${args[0]} ${args[1]} @${o?.cwd} t=${o?.timeout}`);
		return { code: args[1] === "b" ? 3 : 0, stdout: "out\n", stderr: "" };
	};
	const r = await runDoneCheck(["a", "b", "c"], { exec, cwd: "/repo" });
	expect(calls).toEqual(["bash -c a @/repo t=120000", "bash -c b @/repo t=120000", "bash -c c @/repo t=120000"]);
	expect(r.map((x) => [x.command, x.pass, x.exitCode])).toEqual([["a", true, 0], ["b", false, 3], ["c", true, 0]]);
});

test("tail keeps the last 10 lines of combined output", async () => {
	const out = Array.from({ length: 15 }, (_, i) => `l${i + 1}`).join("\n");
	const exec: Exec = async () => ({ code: 1, stdout: out, stderr: "err" });
	const [r] = await runDoneCheck(["x"], { exec, cwd: "." });
	const lines = r.tail.split("\n");
	expect(lines.length).toBe(10);
	expect(lines.at(-1)).toBe("l15err");
});

test("a killed command fails with reason timeout even if it reports code 0", async () => {
	const exec: Exec = async () => ({ code: 0, stdout: "", stderr: "", killed: true });
	const [r] = await runDoneCheck(["slow"], { exec, cwd: ".", timeoutMs: 50 });
	expect(r.pass).toBe(false);
	expect(r.tail).toContain("timeout");
});

test("report: one line per command, tail for failures, green/red summary", async () => {
	const exec: Exec = async (_c, a) => (a[1] === "bad" ? { code: 2, stdout: "boom\n", stderr: "" } : { code: 0, stdout: "fine\n", stderr: "" });
	const text = formatReport(await runDoneCheck(["ok", "bad"], { exec, cwd: "." }));
	expect(text).toMatch(/^PASS 1 ok \(\d+ms\)$/m);
	expect(text).toMatch(/^FAIL 2 bad \(\d+ms\)$/m);
	expect(text).toContain("boom");
	expect(text).not.toContain("fine");
	expect(text.trim().split("\n").at(-1)).toBe("done_check: red (1/2)");
	expect(formatReport(await runDoneCheck(["ok"], { exec, cwd: "." })).trim().split("\n").at(-1)).toBe("done_check: green (1/1)");
});

test("real exec: exit codes and time-boxing", async () => {
	const r = await runDoneCheck(["true", "false", "sleep 5"], { exec: real, cwd: ".", timeoutMs: 200 });
	expect(r.map((x) => x.pass)).toEqual([true, false, false]);
	expect(r[1].exitCode).toBe(1);
	expect(r[2].tail).toContain("timeout");
	expect(r[2].ms).toBeLessThan(3000);
});
