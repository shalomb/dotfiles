/**
 * drive_gate: the orchestrator's mechanical gate for one Builder commit during /drive (G1-G6, rules in _lib/drive-gate.ts).
 * AGENT_CONTEXT: call drive_gate after each Builder commit with the wave base and Builder head; reject sends the task back, verifier=yes means run the Verifier.
 * Logic + tests: _lib/drive-gate.ts, _lib/drive-gate-io.ts and their *.test.ts. This file is glue only.
 *
 * Load location: ~/.pi/agent/extensions/drive-gate-tool.ts
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { homedir, tmpdir } from "node:os";
import { type Exec, resolveRepo } from "./_lib/goal-io.ts";
import { driveGate } from "./_lib/drive-gate-io.ts";

const Params = Type.Object({
	goal: Type.String({ description: "Goal id" }),
	branch: Type.String({ description: "Goal branch" }),
	task: Type.String({ description: "Task id" }),
	task_kind: Type.Union([Type.Literal("behaviour"), Type.Literal("refactor"), Type.Literal("spec")], { description: "behaviour: scenario red at base, green at head; refactor: green at both; spec: no scenario" }),
	base: Type.String({ description: "Wave base commit" }),
	head: Type.String({ description: "Builder head commit" }),
	scope: Type.Array(Type.String(), { description: "Paths, directories (trailing /) or globs the task may touch" }),
	scenario: Type.Array(Type.String(), { description: "Shell commands of the task scenario; run at base and at head" }),
	glossary: Type.Optional(Type.Array(Type.String(), { description: "Domain terms allowed in new scenario steps" })),
});

export default function (pi: ExtensionAPI) {
	const exec: Exec = async (cmd, args, o) => {
		const r = await pi.exec(cmd, args, { cwd: o?.cwd, timeout: o?.timeout } as any);
		return { code: r.code, stdout: r.stdout, stderr: r.stderr, killed: r.killed };
	};

	pi.registerTool({
		name: "drive_gate",
		label: "Drive gate",
		description:
			"Gate one Builder commit during /drive: diff from git, run the task scenario at wave base and Builder head, apply the mechanical gate G1-G6, log to trajectories.jsonl. Returns the verdict, each check and whether the Verifier must run.",
		parameters: Params,
		async execute(_id: string, p: any, _signal: any, _onUpdate: any, ctx: any) {
			const repo = await resolveRepo(exec, ctx.cwd, process.env, homedir());
			const reply = (text: string, ok: boolean) => ({ content: [{ type: "text" as const, text }], details: { ok } });
			if (!repo) return reply("Error: not in a git repository.", false);
			try {
				const r = await driveGate(
					{ exec, root: repo.root, store: repo.store, tmpParent: tmpdir(), now: () => new Date() },
					{ goal: p.goal, branch: p.branch, task: p.task, taskKind: p.task_kind, base: p.base, head: p.head, scope: p.scope, scenario: p.scenario, glossary: p.glossary },
				);
				const lines = [`verdict: ${r.verdict} verifier: ${r.verifier ? "yes" : "no"}`, ...r.checks.map((c) => `${c.id} ${c.level} ${c.reason}`), ...r.verifierReasons];
				return reply(lines.join("\n"), true);
			} catch (e: any) {
				return reply(`Error: ${e?.message ?? e}`, false);
			}
		},
	} as any);
}
