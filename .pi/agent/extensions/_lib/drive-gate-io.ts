// /drive gate I/O: read the Builder diff from git, run the task scenario at base and head, apply the pure gate, log the event.
// Rules live in drive-gate.ts (pure); this file only gathers inputs and writes one trajectories.jsonl line.
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { type GateInput, type GateResult, runGate } from "./drive-gate.ts";
import { type Exec, runChecksAtCommit } from "./goal-io.ts";

export interface DriveGateDeps { exec: Exec; root: string; store: string; tmpParent: string; now: () => Date }
export interface DriveGateArgs {
	goal: string; branch: string; task: string; taskKind: GateInput["taskKind"];
	base: string; head: string; scope: string[]; scenario: string[]; glossary?: string[];
}

const GIT = ["-c", "core.quotepath=off", "diff", "--no-renames", "--no-color"];

async function readChanged(exec: Exec, root: string, base: string, head: string): Promise<GateInput["changed"]> {
	const ns = await exec("git", [...GIT, "--name-status", `${base}..${head}`], { cwd: root });
	if (ns.code !== 0) throw new Error(`git diff failed: ${ns.stderr.trim()}`);
	const changed = new Map<string, GateInput["changed"][number]>();
	for (const line of ns.stdout.split("\n").filter(Boolean)) {
		const [s, ...rest] = line.split("\t");
		const status = s[0] === "A" || s[0] === "D" ? (s[0] as "A" | "D") : "M";
		changed.set(rest.join("\t"), { path: rest.join("\t"), status, added: [], removed: [] });
	}
	const d = await exec("git", [...GIT, "-U0", `${base}..${head}`], { cwd: root });
	if (d.code !== 0) throw new Error(`git diff failed: ${d.stderr.trim()}`);
	let cur: GateInput["changed"][number] | undefined;
	let inHunk = false;
	for (const line of d.stdout.split("\n")) {
		if (line.startsWith("diff --git ")) { cur = undefined; inHunk = false; continue; }
		if (!inHunk) {
			if (line.startsWith("@@")) inHunk = true;
			else if (line.startsWith("+++ b/")) cur = changed.get(line.slice(6));
			else if (line.startsWith("--- a/") && !cur) cur = changed.get(line.slice(6));
			continue;
		}
		if (line.startsWith("@@")) continue;
		if (line.startsWith("+")) cur?.added.push(line.slice(1));
		else if (line.startsWith("-")) cur?.removed.push(line.slice(1));
	}
	return [...changed.values()];
}

export async function driveGate(d: DriveGateDeps, a: DriveGateArgs): Promise<GateResult & { task: string; base: string; head: string }> {
	const changed = await readChanged(d.exec, d.root, a.base, a.head);
	let scenarioAtBase: number | undefined;
	let scenarioAtHead: number | undefined;
	if (a.scenario.length > 0 && a.taskKind !== "spec") {
		scenarioAtBase = (await runChecksAtCommit(d.exec, d.root, a.base, a.scenario, d.tmpParent)).exit;
		scenarioAtHead = (await runChecksAtCommit(d.exec, d.root, a.head, a.scenario, d.tmpParent)).exit;
	}
	const result = runGate({ taskKind: a.taskKind, scope: a.scope, changed, scenarioAtBase, scenarioAtHead, glossary: a.glossary });
	try {
		mkdirSync(d.store, { recursive: true });
		const event = {
			at: d.now().toISOString(), event: "drive_gate", goal: a.goal, branch: a.branch, task: a.task, base: a.base, head: a.head,
			verdict: result.verdict, checks: result.checks.map((c) => `${c.id} ${c.level}`), verifier: result.verifier,
		};
		appendFileSync(join(d.store, "trajectories.jsonl"), `${JSON.stringify(event)}\n`);
	} catch {
		// logging is best-effort; the verdict still returns
	}
	return { ...result, task: a.task, base: a.base, head: a.head };
}
