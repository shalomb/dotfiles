/**
 * /grill-me — design-thinking rounds answered in vim, in a tmux popup.
 *   /grill-me <intent>   start: activate grill_round and hand the intent to the design-thinking skill
 *   /grill-me resume     reopen the round that waits for answers
 *   /grill-me done       ask the agent for the final review round
 *   /grill-me stop       end the session and deactivate grill_round
 * grill_round renders the round file, opens it in vim (-S _lib/grill.vim), and returns only the
 * delta, so the model never re-reads the file. Round files stay in
 * $XDG_STATE_HOME/pi/grill/<session>/ until answered; record_dir copies each reply into the repo.
 * The vim binary is $PI_GRILL_VIM (default: vim).
 * Logic + tests: _lib/grill.ts, _lib/grill.test.ts.
 *
 * Load location: ~/.pi/agent/extensions/grill-me-command.ts (global)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Round, computeDelta, renderRound, stateDir, validateRound } from "./_lib/grill.ts";

const TOOL = "grill_round";
const VIM_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "_lib", "grill.vim");

const Params = Type.Object({
	topic: Type.String({ description: "Short topic name" }),
	stance: Type.Union([Type.Literal("long-horizon"), Type.Literal("mid-execution")], {
		description: "Authority of the current code (design-thinking SKILL.md, 'Horizon and the Code')",
	}),
	questions: Type.Array(
		Type.Object({
			id: Type.String({ description: "Stable decision-tree node id, e.g. sync.conflict" }),
			title: Type.String({ description: "The question in Strict ASD-STE100, ending with '?'" }),
			context: Type.Array(Type.String(), { description: "1-4 short sentences: the facts behind the decision" }),
			options: Type.Array(
				Type.Object({
					label: Type.String({ maxLength: 60, description: "1-6 words" }),
					tradeoff: Type.String({ description: "One line of trade-offs" }),
				}),
				{ minItems: 2, maxItems: 5 },
			),
			recommended: Type.Integer({ minimum: 0, description: "Index of the recommended option (pre-ticked)" }),
			diagram: Type.Optional(Type.String({ description: "ASCII diagram, max 70 columns, for complex decisions" })),
		}),
		{ maxItems: 7, description: "The frontier: decisions whose prerequisites are settled" },
	),
	terms: Type.Optional(
		Type.Array(
			Type.Object({
				term: Type.String(),
				definition: Type.Optional(Type.String({ description: "Omit when unsure: the term is shown as [?]" })),
				avoid: Type.Optional(Type.Array(Type.String(), { description: "Rejected synonyms" })),
			}),
			{ description: "Domain terms that the round uses; shown last in the file" },
		),
	),
	review: Type.Optional(Type.String({ description: "Final review body: the tree as an ASCII outline and the draft handoff" })),
	final: Type.Optional(Type.Boolean({ description: "True for the final review round" })),
	record_dir: Type.Optional(Type.String({ description: "Repo-relative directory for the returned round files, next to the decision tree" })),
});

interface Pending { n: number; original: string; work: string; final: boolean; recordDir?: string; cwd: string }
interface State { active: boolean; next: number; pending?: Pending }

type Outcome = { kind: "answered" | "accepted" | "approved" | "reshape" | "later" | "stop" | "error"; text: string };

const NO_CHANGE = ["Accept the recommendations and continue", "Reshape the request", "Answer later", "Stop the session"];
const NO_CHANGE_FINAL = ["Approve the handoff", "Reshape the request", "Answer later", "Stop the session"];
const SORT_NOTES =
	"Sort each note (question, correction, constraint, decision, new branch). Update the decision tree " +
	"and the glossary, then send the next frontier with grill_round.";

const pad = (n: number) => String(n).padStart(2, "0");

export default function (pi: ExtensionAPI) {
	let state: State = { active: false, next: 1 };

	const save = () => pi.appendEntry("grill-state", state);
	const setActive = (on: boolean) => {
		const tools = pi.getActiveTools().filter((t) => t !== TOOL);
		pi.setActiveTools(on ? [...tools, TOOL] : tools);
	};
	const status = (ctx: { ui: { setStatus(k: string, t: string | undefined): void } }) =>
		ctx.ui.setStatus("grill", state.active ? `grill: round ${state.pending?.n ?? state.next}` : undefined);
	const close = () => {
		state = { active: false, next: 1 };
		setActive(false);
		save();
	};

	pi.on("session_start", async (_event, ctx) => {
		state = { active: false, next: 1 };
		for (const e of ctx.sessionManager.getEntries())
			if (e.type === "custom" && e.customType === "grill-state") state = e.data as State;
		setActive(state.active);
		status(ctx);
	});

	/** Copy the returned file into the repo. Refuses paths outside the working directory. */
	const record = (p: Pending): string => {
		if (!p.recordDir) return "";
		const dir = resolve(p.cwd, p.recordDir);
		const rel = relative(p.cwd, dir);
		if (rel.startsWith("..")) return `\nNot recorded: record_dir "${p.recordDir}" is outside the repo.`;
		mkdirSync(dir, { recursive: true });
		const to = join(dir, `round-${pad(p.n)}.md`);
		copyFileSync(p.work, to);
		return `\nReply recorded at ${relative(p.cwd, to)}.`;
	};

	const runRound = async (p: Pending, ctx: any, signal?: AbortSignal): Promise<Outcome> => {
		const res = await pi.exec(
			"tmux",
			["display-popup", "-E", "-d", p.cwd, "-w", "90%", "-h", "90%", "-T", ` grill-me: round ${p.n} `,
				process.env.PI_GRILL_VIM || "vim", "-S", VIM_SCRIPT, p.work],
			{ signal },
		);
		if (signal?.aborted) return { kind: "later", text: `Round ${p.n} was cancelled. It is saved: /grill-me resume reopens it.` };
		if (res.code !== 0 && res.stderr.trim())
			return { kind: "error", text: `The round popup failed (${res.code}): ${res.stderr.trim()}. Round ${p.n} is saved.` };

		const delta = computeDelta(readFileSync(p.original, "utf8"), readFileSync(p.work, "utf8"));
		if (!delta.empty) return { kind: "answered", text: `Round ${p.n} reply (delta only; you hold the original):\n${delta.text}` };

		const options = p.final ? NO_CHANGE_FINAL : NO_CHANGE;
		const choice = await ctx.ui.select("No answers changed. What next?", options, { signal });
		if (choice === options[0]) return p.final
			? { kind: "approved", text: "The user approved the final review." }
			: { kind: "accepted", text: `Round ${p.n}: the user accepted every recommendation (${delta.text}).` };
		if (choice === options[1]) {
			const why = await ctx.ui.input("What is wrong with this round?", "wrong premise, wrong scope, too many questions…", { signal });
			if (why?.trim()) return { kind: "reshape", text: `Round ${p.n}: the user wants it reshaped: "${why.trim()}"` };
		}
		if (choice === options[3]) return { kind: "stop", text: "The user stopped the grill session." };
		return { kind: "later", text: `Round ${p.n} is saved for later.` };
	};

	/** Apply an outcome to the session state and build the message for the model. */
	const settle = (o: Outcome): string => {
		const p = state.pending!;
		switch (o.kind) {
			case "answered":
			case "accepted":
				state.next = p.n + 1;
				state.pending = undefined;
				save();
				return `${o.text}${record(p)}\nNext: ${SORT_NOTES}`;
			case "approved": {
				const rec = record(p);
				close();
				return `${o.text}${rec}\nWrite the handoff spec and the remaining artefacts, verify them (links, diagrams, contracts), and report where each one is. The grill session is closed.`;
			}
			case "reshape":
				state.pending = undefined;
				save();
				return `${o.text}\nDo not continue to round ${p.n + 1}. Rebuild round ${p.n} with this as new context and send it again.`;
			case "stop":
				close();
				return `${o.text} Record the settled nodes in the decision tree, mark the others open, and report the artefacts written.`;
			default:
				save();
				return `${o.text} Stop asking questions now. Tell the user that /grill-me resume reopens it.`;
		}
	};

	pi.registerTool({
		name: TOOL,
		label: "Grill round",
		description:
			"Present one design-thinking round to the user in vim and get back only the delta: changed picks, " +
			">> notes anchored to the line they answer, and term changes. Untouched questions keep the " +
			"recommendation. Use only during a /grill-me session.",
		promptSnippet: "Present a /grill-me design round in vim and receive the delta",
		promptGuidelines: [
			"During /grill-me, present every frontier round with grill_round, never as chat text.",
			"Write round text in Strict ASD-STE100. Put the recommended option's index in `recommended`.",
		],
		parameters: Params,
		defaultActive: false,
		async execute(_id, params, signal, _onUpdate, ctx) {
			const fail = (text: string) => ({ content: [{ type: "text" as const, text: `Error: ${text}` }], details: { error: text } });
			if (!ctx.hasUI) return fail("no UI (non-interactive mode); ask in chat instead.");
			if (!process.env.TMUX) return fail("grill_round needs a tmux session for the vim popup; ask in chat instead.");
			const round = params as Round;
			const err = validateRound(round);
			if (err) return fail(`invalid round (${err}). Fix and retry.`);

			const n = state.next;
			const dir = join(stateDir(process.env, homedir()), ctx.sessionManager.getSessionId());
			mkdirSync(dir, { recursive: true });
			const original = join(dir, `round-${pad(n)}.md`);
			const work = join(dir, `round-${pad(n)}.reply.md`);
			const text = renderRound(round, n);
			writeFileSync(original, text);
			writeFileSync(work, text);
			state.pending = { n, original, work, final: !!params.final, recordDir: params.record_dir, cwd: ctx.cwd };
			save();
			status(ctx);

			const message = settle(await runRound(state.pending, ctx, signal));
			status(ctx);
			return { content: [{ type: "text" as const, text: message }], details: { round: n } };
		},
	});

	const send = (ctx: any, message: string) => {
		if (ctx.isIdle()) pi.sendUserMessage(message);
		else pi.sendUserMessage(message, { deliverAs: "followUp" });
	};

	pi.registerCommand("grill-me", {
		description: "/grill-me <intent> | resume | done | stop — design-thinking rounds answered in vim",
		getArgumentCompletions: (prefix) => {
			const hits = ["resume", "done", "stop"].filter((o) => o.startsWith(prefix));
			return hits.length ? hits.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args, ctx) => {
			const arg = args.trim();
			const notify = (m: string, l: "info" | "error" = "info") => ctx.ui.notify(m, l);

			if (arg === "stop") {
				close();
				status(ctx);
				return notify("grill-me: session stopped.");
			}
			if (arg === "done") {
				if (!state.active) return notify("grill-me: no session is active.", "error");
				return send(ctx,
					"/grill-me done: the user wants to finish. Send the final review round now with grill_round " +
					"(final: true, no questions): the full tree as an ASCII outline in `review`, the draft handoff spec, " +
					"and where each artefact goes.");
			}
			if (!process.env.TMUX) return notify("grill-me needs a tmux session (the rounds open in a tmux popup).", "error");

			let resume = arg === "resume";
			if (!resume && state.active && state.pending && existsSync(state.pending.work)) {
				const pick = await ctx.ui.select(`Round ${state.pending.n} waits for answers.`, ["Resume it", "Start a new session"]);
				if (pick === undefined) return;
				resume = pick === "Resume it";
			}
			if (resume) {
				const p = state.pending;
				if (!p || !existsSync(p.work)) return notify("grill-me: no round waits for answers.", "error");
				return send(ctx, `/grill-me resume: ${settle(await runRound(p, ctx))}`);
			}

			state = { active: true, next: 1 };
			setActive(true);
			save();
			status(ctx);
			send(ctx,
				"/skill:design-thinking Run this design session as /grill-me. Present every frontier round with the " +
				"grill_round tool (references/grill-rounds.md), never in chat. Round 1 includes the stance question. " +
				"Write artefacts as decisions settle (references/artefact-package.md), and pass record_dir so the " +
				"replies are kept next to the decision tree.\n" +
				`Intent: ${arg || "the current conversation"}`);
		},
	});
}
