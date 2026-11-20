/**
 * /goal: one Goal Contract per goal, with a done-check that the human locks and a command gates closing.
 *   /goal [<outcome>]   no goal: the agent drafts one (Discovery first) via goal_propose; draft: card; locked: card + check, offers close when green
 *   /goal lock          run the check at the base commit (temp detached worktree); refuse if it passes; one dialog picks the Outcome Check and locks
 *   /goal unlock        locked -> draft, to correct it; relock re-validates (typing the id if weaker)
 *   /goal done          close on a green check (or your confirmation for a human-confirm check); runs nothing else
 *   /goal drop [<id>]   abandon this branch's goal, or any live goal by id
 *   /goal show <id>     any goal by id, current or archived
 *   /goal drive, /drive hand the locked goal to the drive skill
 * The agent reaches the store only through goal_propose (drafts only; never lock, unlock, close or drop), and a
 * tool_call guard blocks direct writes to the store. Ids name the goal (g-<kr>-<outcome>); never on main/develop.
 * Each prompt gets a one-line reminder while the goal is active; session start warns about goals whose branch is merged or deleted.
 * Store: one file per branch, finished goals archived by id (contract: .pi/docs/specs/agentic-coding/contracts/goal-todo-contract.md).
 * Logic + tests: _lib/goal.ts, goal-io.ts, goal-flow.ts and their *.test.ts. This file is glue only.
 *
 * Load location: ~/.pi/agent/extensions/goal-command.ts (global)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { homedir, tmpdir } from "node:os";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { popupArgs, surface } from "./_lib/ui-gate.ts";
import { type Exec, agentWouldWriteGoalStore, resolveRepo } from "./_lib/goal-io.ts";
import {
	type Deps, SUBCOMMANDS, checkGoal, promptReminder, proposeFromAgent, runGoalCommand, staleWarning,
} from "./_lib/goal-flow.ts";

const TOOL = "goal_propose";

const Params = Type.Object({
	outcome: Type.Optional(Type.String({ description: "One sentence: the outcome of the goal (when the draft has none yet)" })),
	done_check: Type.Optional(
		Type.Object({
			kind: Type.Union([Type.Literal("command"), Type.Literal("human")], { description: '"command" unless no command can test the outcome' }),
			commands: Type.Array(Type.String(), { description: "Shell commands that exit non-zero until the outcome is met. Run in order from the repo root." }),
		}),
	),
	outcome_checks: Type.Optional(Type.Array(Type.String(), { description: "Draft only: suggest which done_check command tests the outcome from outside. The user marks the real Outcome Check at /goal lock." })),
	anti_goals: Type.Optional(Type.Array(Type.String(), { description: "What this work must not do" })),
	scope_anchors: Type.Optional(Type.Array(Type.String(), { description: "Repo paths the work belongs to" })),
	spec_links: Type.Optional(Type.Array(Type.String(), { description: "Specs, ADRs or issues that define the outcome" })),
	serves: Type.Optional(Type.String({ description: "The end-state key result this goal serves, e.g. KR-2.1. Becomes part of the goal id." })),
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
				select: async (title, options) => (ctx.hasUI ? ctx.ui.select(title, options) : undefined),
				input: async (title, message) => (ctx.hasUI ? ctx.ui.input(title, message) : undefined),
			},
			showHelp: (text) => {
				const pane = process.env.TMUX_PANE;
				if (!pane) return ctx.ui.notify(text, "info");
				void surface(exec, "/goal help", process.env, ctx.hasUI !== false).then(async (r) => {
					if (r !== "show") return ctx.ui.notify(text, "info");
					const f = join(tmpdir(), `goal-help-${process.pid}.md`);
					writeFileSync(f, text);
					await pi.exec("tmux", popupArgs(pane, repo.root, "goal", "help", `if command -v glow >/dev/null; then glow -p -s dark ${f}; else less -R ${f}; fi; rm -f ${f}`));
				});
			},
			tellAgent: (m) => void send(m, false),
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
			"Draft the Goal Contract of the current branch (outcome, done_check, anti_goals, scope_anchors, spec_links, serves). The goal id follows the outcome and serves. " +
			"Writes a draft only; a locked goal is changed by the user with /goal unlock. You cannot lock, approve or close a goal: the user does that with /goal.",
		promptSnippet: "Draft the branch's Goal Contract (draft only; a locked goal needs /goal unlock first)",
		promptGuidelines: [
			"A done_check must fail on the base commit and pass only when the outcome is met; a check that already passes is refused at lock time.",
			"Never edit files in the goals directory directly; use goal_propose.",
			"/goal is opt-in. You may suggest the user run /goal only when the work spans more than one task; never start, lock, approve or close a goal yourself.",
		],
		parameters: Params,
		async execute(_id: string, params: any, _signal: any, _onUpdate: any, ctx: any) {
			const d = await depsFor(ctx);
			const r = d ? await proposeFromAgent(d, {
				outcome: params.outcome,
				doneCheck: params.done_check,
				outcomeChecks: params.outcome_checks,
				antiGoals: params.anti_goals,
				scopeAnchors: params.scope_anchors,
				specLinks: params.spec_links,
				serves: params.serves,
			}) : { ok: false, message: "Not in a git repository." };
			return { content: [{ type: "text" as const, text: r.ok ? r.message : `Error: ${r.message}` }], details: { ok: r.ok } };
		},
	} as any);

	// Read-only: runs the locked contract's own done_check commands; never locks, unlocks, closes or edits the goal.
	pi.registerTool({
		name: "goal_check",
		label: "Goal check",
		description: "Run the current branch goal's done_check commands (from its contract) and return a PASS/FAIL report per command. Read-only: it does not lock, close or change the goal.",
		promptSnippet: "Run the goal's done_check and see which commands pass",
		promptGuidelines: ["Call goal_check to see how far the work is from done; it runs only the contract's commands."],
		parameters: Type.Object({ timeoutSeconds: Type.Optional(Type.Number({ description: "Per-command time limit in seconds (default 120)" })) }),
		async execute(_id: string, params: any, _signal: any, _onUpdate: any, ctx: any) {
			const d = await depsFor(ctx);
			if (!d) return { content: [{ type: "text" as const, text: "Error: Not in a git repository." }], details: { ok: false } };
			const secs = typeof params?.timeoutSeconds === "number" && params.timeoutSeconds > 0 ? params.timeoutSeconds : undefined;
			const r = await checkGoal(d, secs && secs * 1000);
			return { content: [{ type: "text" as const, text: r.text }], details: { ok: r.ok } };
		},
	} as any);

	pi.registerCommand("goal", {
		description: "/goal [<outcome>] | lock | unlock | done | drop | check | drive | help — branch goal with a human-locked done-check",
		getArgumentCompletions: (prefix: string) => {
			const hits = SUBCOMMANDS.filter((o) => o.startsWith(prefix));
			return hits.length ? hits.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args: string, ctx: any) => {
			const d = await depsFor(ctx);
			if (!d) return ctx.ui.notify("/goal needs a git repository.", "error");
			await runGoalCommand(d, args);
		},
	});

	pi.registerCommand("drive", {
		description: "/drive [scenic|motorway] [extra instructions] — alias of /goal drive: drive the locked goal",
		getArgumentCompletions: (prefix: string) => {
			const hits = ["scenic", "motorway"].filter((o) => o.startsWith(prefix));
			return hits.length ? hits.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args: string, ctx: any) => {
			const d = await depsFor(ctx);
			if (!d) return ctx.ui.notify("/drive needs a git repository.", "error");
			await runGoalCommand(d, `drive ${args ?? ""}`);
		},
	});
}
