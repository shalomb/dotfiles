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
	/** Key results that already have a `Serves:` hop commit on this branch. */
	served?: string[];
}
export type Step = { kind: "drive"; kr: string } | { kind: "stop"; reason: string };

/** Exit codes that mean the check could not run or was killed: 126/127 missing tool, 124 timeout, 137 SIGKILL, 143 SIGTERM. */
const BLOCKED = new Set([124, 126, 127, 137, 143]);

/** The last `lines` lines of `text`, at most `maxChars` characters. */
export function tail(text: string, lines: number, maxChars = 2000): string {
	const t = text.trimEnd().split("\n").slice(-lines).join("\n");
	return t.length > maxChars ? t.slice(-maxChars) : t;
}

export function nextStep(s: State): Step {
	if (s.approved !== s.hash) return { kind: "stop", reason: "not-approved" };
	if (s.results.some((r) => BLOCKED.has(r.exit))) return { kind: "stop", reason: "blocked" };
	if ((s.contextPct ?? 0) >= 60) return { kind: "stop", reason: "budget" };
	const red = s.results.find((r) => r.exit !== 0);
	if (red && s.served?.includes(red.id)) return { kind: "stop", reason: "regression" };
	return red ? { kind: "drive", kr: red.id } : { kind: "stop", reason: "arrived" };
}

async function runCheck(cmd: string): Promise<{ exit: number; out: string }> {
	const p = Bun.spawn(["bash", "-c", cmd], { stdout: "pipe", stderr: "pipe", timeout: 300_000 });
	const [out, err, exit] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
	return { exit, out: `${out}${err}` };
}

async function servedKrs(): Promise<string[]> {
	const p = Bun.spawn(["git", "log", "--format=%(trailers:key=Serves,valueonly)"], { stdout: "pipe", stderr: "ignore" });
	const text = await new Response(p.stdout).text();
	return [...new Set(text.split("\n").map((l) => l.trim()).filter(Boolean))];
}

if (import.meta.main) {
	const md = await Bun.file("docs/explanation/end-state-evolution.md").text();
	const approved = /^Approved: \S+ (\S+)\s*$/m.exec(md)?.[1];
	const results: Check[] = [];
	const outputs = new Map<string, string>();
	for (const kr of parseKeyResults(md)) {
		const { exit, out } = await runCheck(kr.check);
		results.push({ id: kr.id, exit });
		outputs.set(kr.id, out);
		console.log(`${kr.id} exit=${exit}`);
	}
	const i = process.argv.indexOf("--context");
	const contextPct = i >= 0 ? Number(process.argv[i + 1]) : undefined;
	const step = nextStep({ approved, hash: keyResultsHash(md), results, contextPct, served: await servedKrs() });
	// show why the first failing or blocked check failed, so nobody re-runs it blind
	const id = step.kind === "drive" ? step.kr : step.reason === "blocked" || step.reason === "regression" ? results.find((r) => r.exit !== 0 && (step.reason === "blocked" ? BLOCKED.has(r.exit) : true))?.id : undefined;
	const t = id ? tail(outputs.get(id) ?? "", 20) : "";
	if (id && t) console.log(`--- ${id} output (last lines) ---\n${t}\n---`);
	console.log(step.kind === "drive" ? `drive ${step.kr}` : `stop ${step.reason}`);
	process.exit(0);
}
