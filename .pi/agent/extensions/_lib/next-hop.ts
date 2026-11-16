// AGENT_CONTEXT: decide the next hop (drive to a red key result or stop) from approval hash and check exit codes.
import { keyResultsHash, parseKeyResults } from "./kr.ts";

export interface Check {
	id: string;
	exit: number;
}
export interface State {
	approved?: string;
	hash: string;
	results: Check[];
	contextPct?: number;
}
export type Step = { kind: "drive"; kr: string } | { kind: "stop"; reason: string };

export function nextStep(s: State): Step {
	if (s.approved !== s.hash) return { kind: "stop", reason: "not-approved" };
	if (s.results.some((r) => r.exit === 126 || r.exit === 127)) return { kind: "stop", reason: "blocked" };
	if ((s.contextPct ?? 0) >= 60) return { kind: "stop", reason: "budget" };
	const red = s.results.find((r) => r.exit !== 0);
	return red ? { kind: "drive", kr: red.id } : { kind: "stop", reason: "arrived" };
}

async function runCheck(cmd: string): Promise<number> {
	const p = Bun.spawn(["bash", "-c", cmd], { stdout: "ignore", stderr: "ignore", timeout: 300_000 });
	return await p.exited;
}

if (import.meta.main) {
	const md = await Bun.file("docs/explanation/end-state-evolution.md").text();
	const approved = /^Approved: \S+ (\S+)\s*$/m.exec(md)?.[1];
	const results: Check[] = [];
	for (const kr of parseKeyResults(md)) {
		const exit = await runCheck(kr.check);
		results.push({ id: kr.id, exit });
		console.log(`${kr.id} exit=${exit}`);
	}
	const i = process.argv.indexOf("--context");
	const contextPct = i >= 0 ? Number(process.argv[i + 1]) : undefined;
	const step = nextStep({ approved, hash: keyResultsHash(md), results, contextPct });
	console.log(step.kind === "drive" ? `drive ${step.kr}` : `stop ${step.reason}`);
	process.exit(0);
}
