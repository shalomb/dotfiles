// Run a goal's done_check commands from the contract and report per command. Tested in goal-check.test.ts.
import type { Exec } from "./goal-io.ts";

export interface CheckResult { command: string; pass: boolean; exitCode: number | undefined; ms: number; tail: string }
export interface RunOptions { exec: Exec; cwd: string; timeoutMs?: number }

export const DEFAULT_TIMEOUT_MS = 120_000;
const TAIL_LINES = 10;

const lastLines = (text: string) => text.replace(/\n+$/, "").split("\n").slice(-TAIL_LINES).join("\n");

/** Run every command in order (never stopping at a failure), each time-boxed. A killed command is a FAIL with reason "timeout". */
export async function runDoneCheck(commands: string[], o: RunOptions): Promise<CheckResult[]> {
	const timeout = o.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const results: CheckResult[] = [];
	for (const command of commands) {
		const start = Date.now();
		const r = await o.exec("bash", ["-c", command], { cwd: o.cwd, timeout });
		const ms = Date.now() - start;
		const output = lastLines(`${r.stdout}${r.stderr}`);
		if (r.killed) results.push({ command, pass: false, exitCode: undefined, ms, tail: lastLines(`${output}\ntimeout after ${timeout}ms`) });
		else results.push({ command, pass: r.code === 0, exitCode: r.code, ms, tail: output });
	}
	return results;
}

export const allPass = (results: CheckResult[]) => results.length > 0 && results.every((r) => r.pass);

export function formatReport(results: CheckResult[]): string {
	const lines: string[] = [];
	results.forEach((r, i) => {
		lines.push(`${r.pass ? "PASS" : "FAIL"} ${i + 1} ${r.command} (${r.ms}ms)`);
		if (!r.pass && r.tail) lines.push(r.tail);
	});
	const k = results.filter((r) => r.pass).length;
	lines.push(`done_check: ${allPass(results) ? "green" : "red"} (${k}/${results.length})`);
	return lines.join("\n");
}
