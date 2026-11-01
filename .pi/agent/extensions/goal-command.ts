/**
 * /goal — one Goal Contract per branch, with a done-check that the human locks and a command gates closing.
 *   /goal <outcome>   draft a goal at HEAD; the agent fills done-check, anti-goals, scope anchors, spec links via goal_propose
 *   /goal             show the contract
 *   /goal lock        run the check at the base commit (temp detached worktree); refuse if it passes; ask; lock
 *   /goal check       run the done-check now: green or red
 *   /goal approve     apply the agent's pending change to the locked done-check (asks first)
 *   /goal reject      discard the pending change
 *   /goal done        close on a green check (or on your confirmation for a human-confirm check), then /persist and lessons
 *   /goal drop        abandon the goal
 * The agent can reach the store only through goal_propose (a draft, or a pending change; never lock, approve or close),
 * and a tool_call guard blocks direct writes to the goals directory. Only these command handlers, driven by the human,
 * lock, approve, reject, close or drop. Each prompt gets a one-line reminder while the goal is active; session start
 * warns about goals whose branch is merged or deleted.
 * Store: ${XDG_CACHE_HOME:-~/.cache}/agent-skills/todos/<repo_slug>/goals/<branch-slug>.md (contract: docs/specs/agentic-coding/contracts/goal-todo-contract.md).
 * Logic + tests: _lib/goal.ts, goal-io.ts, goal-flow.ts and their *.test.ts. This file is glue only.
 *
 * Load location: ~/.pi/agent/extensions/goal-command.ts (global)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { homedir, tmpdir } from "node:os";
import { type Exec, agentWouldWriteGoalStore, resolveRepo } from "./_lib/goal-io.ts";
import {
	type Deps, SUBCOMMANDS, approveChange, checkGoal, doneGoal, dropCurrentGoal, lockGoal, parseGoalArgs, promptReminder,
	proposeFromAgent, rejectChange, showGoal, staleWarning, startGoal,
} from "./_lib/goal-flow.ts";

const TOOL = "goal_propose";

const Params = Type.Object({
	done_check: Type.Optional(
		Type.Object({
			kind: Type.Union([Type.Literal("command"), Type.Literal("human")], { description: '"command" unless no command can test the outcome' }),
			commands: Type.Array(Type.String(), { description: "Shell commands that exit non-zero until the outcome is met. Run in order from the repo root." }),
		}),
	),
	anti_goals: Type.Optional(Type.Array(Type.String(), { description: "What this work must not do" })),
	scope_anchors: Type.Optional(Type.Array(Type.String(), { description: "Repo paths the work belongs to" })),
	spec_links: Type.Optional(Type.Array(Type.String(), { description: "Specs, ADRs or issues that define the outcome" })),
	reason: Type.Optional(Type.String({ description: "Required when the goal is locked: why the done-check must change" })),
});

export default function (pi: ExtensionAPI) {
	const exec: Exec = async (cmd, args, o) => {
		const r = await pi.exec(cmd, args, { cwd: o?.cwd, timeout: o?.timeout } as any);
		return { code: r.code, stdout: r.stdout, stderr: r.stderr, killed: r.killed };
	};

	/** Build the flow dependencies for the current checkout, or undefined outside a git repo. */
	const depsFor = async (ctx: any): Promise<Deps | undefined> => {
		const repo = await resolveRepo(exec, ctx.cwd, process.env, homedir());
		if (!repo) return undefined;
		const send = (message: string, expandPromptTemplates: boolean) =>
			pi.sendUserMessage(message, ctx.isIdle() ? { expandPromptTemplates } : { deliverAs: "followUp", expandPromptTemplates });
		return {
			exec, store: repo.store, root: repo.root, branch: repo.branch, head: repo.head,
			now: () => new Date(), tmpParent: tmpdir(),
			ui: {
				notify: (m, l) => ctx.ui.notify(m, l ?? "info"),
				confirm: async (title, message) => (ctx.hasUI ? ctx.ui.confirm(title, message) : false),
			},
			tellAgent: (m) => void send(m, false),
			runCommand: (c) => send(c, true),
		};
	};

	pi.on("session_start", async (_e: any, ctx: any) => {
		const d = await depsFor(ctx);
		const warning = d && (await staleWarning(d));
		if (warning) ctx.ui.notify(warning, "warning");
	});

	pi.on("before_agent_start", async (event: any, ctx: any) => {
		const d = await depsFor(ctx);
		const line = d && promptReminder(d);
		if (line) event.systemPromptOptions.sections.goal = line;
	});

	// The agent has no route to lock, approve or close: block direct writes to the goals directory.
	pi.on("tool_call", async (event: any) => {
		if (!agentWouldWriteGoalStore(event.toolName, event.input ?? {})) return undefined;
		return { block: true, reason: "Blocked: goal files are written only by /goal (the user) and the goal_propose tool. Use goal_propose to draft or to propose a change." };
	});

	pi.registerTool({
		name: TOOL,
		label: "Goal propose",
		description:
			"Draft the Goal Contract of the current branch (done_check, anti_goals, scope_anchors, spec_links), or propose a change to a locked done_check with a reason. " +
			"Writes a draft or a pending change only. You cannot lock, approve or close a goal: the user does that with /goal.",
		promptSnippet: "Draft the branch's Goal Contract, or propose a change to a locked done-check",
		promptGuidelines: [
			"A done_check must fail on the base commit and pass only when the outcome is met; a check that already passes is refused at lock time.",
			"Never edit files in the goals directory directly; use goal_propose.",
		],
		parameters: Params,
		async execute(_id: string, params: any, _signal: any, _onUpdate: any, ctx: any) {
			const d = await depsFor(ctx);
			const r = d ? await proposeFromAgent(d, {
				doneCheck: params.done_check,
				antiGoals: params.anti_goals,
				scopeAnchors: params.scope_anchors,
				specLinks: params.spec_links,
				reason: params.reason,
			}) : { ok: false, message: "Not in a git repository." };
			return { content: [{ type: "text" as const, text: r.ok ? r.message : `Error: ${r.message}` }], details: { ok: r.ok } };
		},
	} as any);

	pi.registerCommand("goal", {
		description: "/goal <outcome> | lock | check | approve | reject | done | drop — branch goal with a human-locked done-check",
		getArgumentCompletions: (prefix: string) => {
			const hits = SUBCOMMANDS.filter((o) => o.startsWith(prefix));
			return hits.length ? hits.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args: string, ctx: any) => {
			const d = await depsFor(ctx);
			if (!d) return ctx.ui.notify("/goal needs a git repository.", "error");
			const a = parseGoalArgs(args);
			switch (a.kind) {
				case "show": return showGoal(d);
				case "start": return startGoal(d, a.outcome);
				case "lock": return lockGoal(d);
				case "check": return checkGoal(d);
				case "approve": return approveChange(d);
				case "reject": return rejectChange(d);
				case "done": return doneGoal(d);
				case "drop": return dropCurrentGoal(d, "dropped by the user");
			}
		},
	});
}
