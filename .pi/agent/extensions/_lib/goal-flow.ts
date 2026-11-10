// The /goal command flows (goal-command.ts is the thin pi wiring around these). Tested in goal-flow.test.ts.
// Rule: only the handlers below that the human drives (lock, approve, reject, done, drop, start) change a goal's
// state; the agent reaches proposeFromAgent only, which writes a draft or a pending change and never locks.

import {
	type CheckSpec, type DraftFields, type Goal, type Result,
	applyUnlock, lastLockedSpec, applyClose, applyLock, canLock, goalCheckHash, closeDecision, dropGoal, fillDraft, isEnvironmentFailure, newDraft,
	reminderLine, stamp, staleGoal,
} from "./goal.ts";
import { GOAL_HELP } from "./goal-help.ts";
import { type Exec, type GoalEvent, appendGoalEvent, branchState, goalRefName, listGoals, loadGoal, loadGoalFile, readRecordedHash, recordCheckHash, recordTombstone, runChecks, runChecksAtCommit, saveGoal } from "./goal-io.ts";

export interface Deps {
	exec: Exec;
	store: string;
	/** Root of the current checkout; checks run here. */
	root: string;
	/** Current branch; undefined on a detached HEAD. */
	branch: string | undefined;
	head: string;
	now: () => Date;
	/** Parent directory for the temporary detached worktree. */
	tmpParent: string;
	ui: {
		notify(message: string, level?: "info" | "warning" | "error"): void;
		confirm(title: string, message: string): Promise<boolean>;
		/** The chosen option, or undefined when the human cancels. */
		select(title: string, options: string[]): Promise<string | undefined>;
		/** What the human typed, or undefined when they cancel. */
		input(title: string, message: string): Promise<string | undefined>;
	};
	/** Send the agent a user message. */
	tellAgent(message: string): void;
	/** Show the man page (a popup when the pane is focused). Falls back to a notification. */
	showHelp?(text: string): void;
	/** Run a slash command (such as /persist) as if the human typed it. */
	runCommand(command: string): Promise<void> | void;
}

export type GoalArgs =
	| { kind: "show" | "lock" | "unlock" | "done" | "drop" | "help" }
	| { kind: "retired"; word: string }
	| { kind: "start"; outcome: string };

export const SUBCOMMANDS = ["lock", "unlock", "done", "drop", "help"] as const;
/** Verbs of the old protocol: still recognised, so a typed one gets a pointer instead of becoming an outcome. */
const RETIRED = ["check", "approve", "reject"] as const;

/** A subcommand is the whole argument. Anything longer is an outcome, even if its first word is a subcommand. */
export function parseGoalArgs(raw: string): GoalArgs {
	const a = raw.trim();
	if (!a) return { kind: "show" };
	if ((RETIRED as readonly string[]).includes(a)) return { kind: "retired", word: a };
	if (a === "close") return { kind: "done" };
	return (SUBCOMMANDS as readonly string[]).includes(a) ? ({ kind: a } as GoalArgs) : { kind: "start", outcome: a };
}

const NEEDS_BRANCH = "No goal on a detached HEAD. Switch to a branch first.";
const NO_GOAL = "No goal for this branch. Start one with /goal <outcome>.";

const checkLines = (g: Goal) => (g.doneCheck.kind === "human" ? ["(human-confirm check: you confirm the outcome yourself)"] : g.doneCheck.commands.map((c) => `  $ ${c}`));
const bullets = (items: string[]) => (items.length ? items.map((i) => `  - ${i}`).join("\n") : "  (none)");

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** The branch's goal. On failure `error` says why: no goal, or a goal file that cannot be read. */
function load(d: Deps): { goal?: Goal; error?: string } {
	if (!d.branch) return { error: NEEDS_BRANCH };
	try {
		const goal = loadGoal(d.store, d.branch);
		return goal ? { goal } : { error: NO_GOAL };
	} catch (e) {
		return { error: errorText(e) };
	}
}

/** What to do next, for a command that does not apply to the goal's state. Every refusal ends with it, so the human is never left at a dead end. */
const nextStep = (g: Goal): string => {
	switch (g.status) {
		case "closed":
		case "dropped": return `This goal is finished (${g.status}). Run /goal to draft the next goal from the discussion, or /goal <outcome> to state it yourself.`;
		case "draft": return "Review it with /goal; /goal lock when it is right, /goal drop to abandon.";
		case "active": return "It is locked: /goal shows whether the check is green, /goal done closes it, /goal unlock corrects it, /goal drop abandons it.";
	}
};
const refusal = (g: Goal, what: string) => `${what} (the goal is ${g.status}). ${nextStep(g)}`;

/** A draft that follows a finished goal on the same branch: log the link, so the history of goals on a branch can be rebuilt. Never throws. */
function logSuccessor(d: Deps, next: Goal, previous: Goal | undefined): void {
	if (!previous || (previous.status !== "closed" && previous.status !== "dropped")) return;
	try {
		appendGoalEvent(d.store, { at: stamp(d.now()), event: "goal_started", goal: next.id, branch: next.branch, from: previous.id, previousStatus: previous.status });
	} catch (e) {
		d.ui.notify(`The event could not be appended to trajectories.jsonl: ${errorText(e)}`, "warning");
	}
}

function current(d: Deps): Goal | undefined {
	const { goal, error } = load(d);
	if (error) d.ui.notify(error, "error");
	return goal;
}

/** Save the result of a transition, or tell the human why it was refused. `event` is appended once the goal is saved. */
function commit(d: Deps, r: Result, done: string, event?: (g: Goal) => Pick<GoalEvent, "event"> & Record<string, unknown>): Goal | undefined {
	if (!r.ok) {
		d.ui.notify(r.reason, "error");
		return undefined;
	}
	saveGoal(d.store, r.goal);
	d.ui.notify(done, "info");
	if (event) {
		try {
			appendGoalEvent(d.store, { at: stamp(d.now()), goal: r.goal.id, branch: r.goal.branch, ...event(r.goal) } as GoalEvent);
		} catch (e) {
			d.ui.notify(`The event could not be appended to trajectories.jsonl: ${errorText(e)}`, "warning");
		}
	}
	return r.goal;
}

/**
 * Lock and approve: record the new done-check hash on the private ref (ADR-010) before saving the goal,
 * so a goal is never active without its record. If the ref cannot be written nothing is saved.
 */
async function commitRecorded(d: Deps, r: Result, done: string, message: (g: Goal) => string, event: (g: Goal) => Pick<GoalEvent, "event"> & Record<string, unknown>): Promise<Goal | undefined> {
	if (!r.ok) return commit(d, r, done);
	const rec = await recordCheckHash(d.exec, d.root, r.goal.branch, goalCheckHash(r.goal), message(r.goal));
	if (!rec.ok) {
		d.ui.notify(`Not saved: the approved done-check could not be recorded on ${goalRefName(r.goal.branch)}: ${rec.error}`, "error");
		return undefined;
	}
	return commit(d, r, done, event);
}

/** Close and drop: write the tombstone (ADR-010) before saving the goal. If the ref cannot be written nothing is saved. */
async function commitTombstoned(d: Deps, r: Result, status: "closed" | "dropped", done: string, event: () => Pick<GoalEvent, "event"> & Record<string, unknown>): Promise<Goal | undefined> {
	if (!r.ok) return commit(d, r, done);
	const rec = await recordTombstone(d.exec, d.root, r.goal.branch, status, `${status} ${r.goal.id}`);
	if (!rec.ok) {
		d.ui.notify(`Not saved: the ${status} tombstone could not be recorded on ${goalRefName(r.goal.branch)}: ${rec.error}`, "error");
		return undefined;
	}
	return commit(d, r, done, event);
}

/**
 * Why an active goal's done-check cannot be trusted, or undefined when it equals the hash at the tip of its private ref.
 * Used by /goal check and /goal done: a check edited outside /goal, or a goal with no record, is not run.
 */
async function integrityProblem(d: Deps, g: Goal): Promise<string | undefined> {
	const ref = goalRefName(g.branch);
	const recorded = await readRecordedHash(d.exec, d.root, g.branch);
	if (recorded.kind === "error") return `The approved done-check of ${g.id} cannot be read: ${recorded.error}. Inspect it with: git log ${ref}`;
	if (recorded.kind === "tombstone") return `The record of ${g.id} on ${ref} says it was ${recorded.status}, so an active goal file here was not made by /goal and its done-check is not run. See: git log ${ref}`;
	if (recorded.kind === "none") return `${g.id} is active but has no approved record on ${ref}, so its done-check cannot be verified. Drop the goal and start it again.`;
	if (recorded.hash !== goalCheckHash(g))
		return `The done-check of ${g.id} differs from the approved one (it was changed without /goal), so it is not run. See the approvals with: git log ${ref}`;
	return undefined;
}

export function summary(g: Goal): string {
	const lines = [
		`${g.id} [${g.status}] ${g.outcome}`,
		`Done-check (${g.doneCheck.kind}${g.doneCheck.lockedAt ? `, locked ${g.doneCheck.lockedAt}, failed on base ${g.doneCheck.baseCommit}` : ", not locked"}):`,
		...checkLines(g),
		...(g.doneCheck.outcomeChecks.length ? [`Outcome Check: ${g.doneCheck.outcomeChecks.join(", ")}`] : []),
		"Anti-goals:", bullets(g.antiGoals),
		"Scope anchors:", bullets(g.scopeAnchors),
		"Spec links:", bullets(g.specLinks),
	];
	if (g.closedBy) lines.push(`Closed ${g.closedAt} by ${g.closedBy}.`);
	return lines.join("\n");
}

/** Bare `/goal`: no goal → draft one from the conversation; draft → card + next step; locked → card + live check result. */
export async function showGoal(d: Deps): Promise<void> {
	const { goal, error } = load(d);
	if (!goal) {
		if (error === NO_GOAL) return await draftFromContext(d);
		return d.ui.notify(error!, "error");
	}
	if (goal.status === "draft") return d.ui.notify(`${summary(goal)}\nNext: /goal lock when this is right (the agent can still change it); /goal drop to abandon.`, "info");
	if (goal.status === "closed" || goal.status === "dropped") {
		d.ui.notify(`${summary(goal)}\nThis goal is finished. Drafting the next goal from the discussion; review it, then /goal lock. (Or /goal <outcome> to state it yourself.)`, "info");
		return await draftFromContext(d, goal);
	}
	let status = "";
	const problem = await integrityProblem(d, goal);
	if (problem) return d.ui.notify(`${summary(goal)}\n${problem}`, "error");
	if (goal.doneCheck.kind === "human") status = "Human-confirm check: /goal done asks you to confirm.";
	else {
		const run = await runChecks(d.exec, goal.doneCheck.commands, d.root);
		status = run.exit === 0 ? `Done-check green.\n${run.output}` : `Done-check red (exit ${run.exit}).\n${run.output}`;
		d.ui.notify(`${summary(goal)}\n${status}\nNext: ${run.exit === 0 ? "/goal done" : "do the work, /goal to re-check; /goal unlock to correct the goal"}`, "info");
		return;
	}
	d.ui.notify(`${summary(goal)}\n${status}\nNext: /goal done`, "info");
}

/** Bare `/goal` with no goal: save an empty draft and ask the agent to discover and fill it in from the conversation. */
async function draftFromContext(d: Deps, previous?: Goal): Promise<void> {
	if (!d.branch) return d.ui.notify(NEEDS_BRANCH, "error");
	const sharing = loadGoalFile(d.store, d.branch);
	if (sharing && sharing.branch !== d.branch)
		return d.ui.notify(`The goal file for this branch name belongs to branch ${sharing.branch} (${sharing.id}). Not overwritten.`, "error");
	const g = newDraft({ branch: d.branch, outcome: "(to be drafted from the conversation)", baseCommit: d.head }, d.now());
	if (!commit(d, { ok: true, goal: g }, `Draft goal saved: ${g.id}`)) return;
	logSuccessor(d, g, previous);
	if (previous) {
		d.tellAgent(
			`/goal: goal ${previous.id} (${previous.outcome}) is ${previous.status}. The user wants the next goal for branch ${g.branch}. Infer it from the discussion so far ` +
			"(what was proposed or left open after that goal), reusing context already present (scope, anti-goals, specs). " +
			`Call goal_propose with outcome, done_check (shell commands that exit non-zero on the base commit ${g.doneCheck.baseCommit} and pass only when the work is done), anti_goals, scope_anchors and spec_links. ` +
			"If the discussion does not make the next goal clear, ask one question. You cannot lock it: the user reviews it and runs /goal lock. Reply with the new goal statement.");
		return;
	}
	d.tellAgent(
		`/goal: the user wants a goal for branch ${g.branch}, drafted from the conversation so far. First run Discovery (what is already true, partly true, or not there, citing a path and a command). ` +
		"Then call goal_propose with outcome (one sentence), done_check (shell commands that exit non-zero on the base commit " +
		`${g.doneCheck.baseCommit} and pass only when the work is done), anti_goals, scope_anchors (paths) and spec_links. Ask at most 2 questions, and only on a real gap. ` +
		"You cannot lock the contract: the user reviews it and runs /goal lock. Reply with a short Review Card.");
}

/** `/goal <outcome>`: save a draft at the current HEAD and ask the agent to fill in the contract. */
export async function startGoal(d: Deps, outcome: string): Promise<void> {
	if (!d.branch) return d.ui.notify(NEEDS_BRANCH, "error");
	const { goal: existing, error } = load(d);
	if (error && error !== NO_GOAL) return d.ui.notify(error, "error");
	const sharing = loadGoalFile(d.store, d.branch);
	if (sharing && sharing.branch !== d.branch)
		return d.ui.notify(`The goal file for this branch name belongs to branch ${sharing.branch} (${sharing.id}); branch names ${sharing.branch} and ${d.branch} map to the same file. Not overwritten.`, "error");
	if (existing && (existing.status === "draft" || existing.status === "active"))
		return d.ui.notify(`This branch already has a ${existing.status} goal (${existing.id}). ${nextStep(existing)} (/goal drop ends it first.)`, "error");
	const g = newDraft({ branch: d.branch, outcome, baseCommit: d.head }, d.now());
	const saved = commit(d, { ok: true, goal: g }, `Draft goal saved: ${g.id}`);
	if (!saved) return;
	logSuccessor(d, g, existing);
	d.tellAgent(
		`/goal: the user set this goal for branch ${g.branch}: "${g.outcome}". Draft the contract now with the goal_propose tool: ` +
		"done_check (one or more shell commands that test the outcome and exit non-zero until the work is done; they must fail on the base commit " +
		`${g.doneCheck.baseCommit}), anti_goals, scope_anchors (paths) and spec_links. Use kind "human" only when no command can test the outcome. ` +
		"You cannot lock the contract: the user reviews it and runs /goal lock. Reply with a 3-line summary of what you drafted.");
}

export interface Proposal { outcome?: string; doneCheck?: CheckSpec; outcomeChecks?: string[]; antiGoals?: string[]; scopeAnchors?: string[]; specLinks?: string[] }

/** The goal_propose tool. Fills a draft; never locks, and never touches a locked goal (the human unlocks it first). */
export async function proposeFromAgent(d: Deps, p: Proposal): Promise<{ ok: boolean; message: string }> {
	const out = (ok: boolean, message: string) => ({ ok, message });
	if (!d.branch) return out(false, NEEDS_BRANCH);
	let { goal: g, error } = load(d);
	if (!g) return out(false, error === NO_GOAL ? `${NO_GOAL} Only the user starts a goal.` : error!);
	// A finished goal: the agent's proposal becomes the next draft (never locked; the user still runs /goal lock).
	const finished = g.status === "closed" || g.status === "dropped" ? g : undefined;
	if (finished) g = newDraft({ branch: g.branch, outcome: p.outcome ?? "(to be drafted)", baseCommit: d.head }, d.now());
	if (g.status === "active") return out(false, "The goal is locked, so you cannot change it. Ask the user to run /goal unlock, correct the draft, then /goal lock.");
	if (g.status !== "draft") return out(false, `The goal is ${g.status}; nothing to propose.`);
	const f: DraftFields = { outcome: p.outcome, doneCheck: p.doneCheck, outcomeChecks: p.outcomeChecks, antiGoals: p.antiGoals, scopeAnchors: p.scopeAnchors, specLinks: p.specLinks };
	const r = fillDraft(g, f);
	if (!r.ok) return out(false, r.reason);
	saveGoal(d.store, r.goal);
	logSuccessor(d, r.goal, finished);
	d.ui.notify(`Goal ${g.id} draft updated by the agent. Review it with /goal; /goal lock when it is right.`, "info");
	return out(true, "Draft saved. It is not locked: the user reviews it and runs /goal lock.");
}

/** The human picks which of `commands` is the Outcome Check (the one that tests the outcome from outside); undefined when they cancel. */
async function askOutcomeCheck(d: Deps, g: Goal, commands: string[]): Promise<string[] | undefined> {
	const picked = await d.ui.select(`${g.id}: which command is the Outcome Check (tests the outcome from outside)?`, commands);
	return picked === undefined ? undefined : [picked];
}

/**
 * An environment-looking base failure is refused unless the human types the goal id exactly.
 * Returns true when the lock or approval may go on.
 */
async function environmentFailureOverridden(d: Deps, g: Goal, run: { exit: number | undefined; output: string }): Promise<boolean> {
	if (!isEnvironmentFailure(run.exit, run.output)) return true;
	const typed = await d.ui.input(
		`The check fails on the base commit, but it looks like an environment problem, not the missing work. Type ${g.id} to go on anyway.`,
		`${run.output}\n(exit ${run.exit})`);
	if (typed?.trim() === g.id) return true;
	d.ui.notify(`Not done: the base failure looks environmental (exit 126/127, command not found, ModuleNotFoundError or ImportError), so the check proves nothing. Fix the environment, or type the goal id ${g.id} to override.\n${run.output}`, "error");
	return false;
}

/** `/goal lock`: run the check at the base commit; refuse when it passes; else ask the human which command is the Outcome Check, ask to confirm, and lock. */
export async function lockGoal(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	if (g.status !== "draft") return d.ui.notify(refusal(g, "Only a draft can be locked"), "error");
	let baseExit: number | undefined;
	let outcomeChecks: string[] | undefined;
	let evidence = "(human-confirm check; no command runs)";
	if (g.doneCheck.kind === "command") {
		if (!g.doneCheck.commands.length) return d.ui.notify("Not locked: the draft has no done-check yet (ask the agent, or use goal_propose).", "error");
		const run = await runChecksAtCommit(d.exec, d.root, g.doneCheck.baseCommit, g.doneCheck.commands, d.tmpParent);
		baseExit = run.exit;
		const refused = canLock(baseExit);
		if (!refused.ok) return d.ui.notify(`${refused.reason}\n${run.output}`, "error");
		if (!(await environmentFailureOverridden(d, g, run))) return;
		evidence = `On base ${g.doneCheck.baseCommit} it fails (exit ${baseExit}):\n${run.output}`;
		outcomeChecks = await askOutcomeCheck(d, g, g.doneCheck.commands);
		if (!outcomeChecks) return d.ui.notify("Not locked: mark one command as the Outcome Check. The goal stays a draft.", "error");
		evidence += `\nOutcome Check: ${outcomeChecks.join(", ")}`;
	}
	// A relock of a check weaker than the one that was unlocked needs the goal id typed, so a reflex "yes" cannot loosen it.
	const before = lastLockedSpec(g);
	const weakening = !!before && weakens(before, { kind: g.doneCheck.kind, commands: g.doneCheck.commands });
	const body = `${g.outcome}\n${checkLines(g).join("\n")}\n${evidence}\nOnce locked, only you can change it (/goal unlock).`;
	const ok = weakening
		? (await d.ui.input(`WEAKENING: relock a weaker done-check for ${g.id}? Type ${g.id} to lock.`, `Was:\n${before!.commands.map((c) => `  $ ${c}`).join("\n")}\n${body}`))?.trim() === g.id
		: await d.ui.confirm(`Lock the done-check of ${g.id}?`, body);
	if (!ok) return d.ui.notify(weakening ? "Not locked: the goal id was not typed. The goal stays a draft." : "Not locked. The goal stays a draft.", "info");
	await commitRecorded(d, applyLock(g, { now: d.now(), baseCommit: g.doneCheck.baseCommit, baseExit, outcomeChecks }), `Goal ${g.id} locked.`, () => `lock ${g.id}`,
		(locked) => ({ event: "goal_locked", kind: locked.doneCheck.kind, weakening, checkHash: goalCheckHash(locked) }));
}

/**
 * A change weakens the check when it drops a command, swaps commands for a human confirmation, or adds a command
 * anywhere but at the end of the old list (prepended, inserted or replacing): an earlier command can short-circuit the rest.
 */
const weakens = (old: CheckSpec, next: CheckSpec) => {
	if (old.kind !== "command") return false;
	if (next.kind === "human" || old.commands.some((c) => !next.commands.includes(c))) return true;
	const pureAppend = old.commands.every((c, i) => next.commands[i] === c);
	return !pureAppend && next.commands.some((c) => !old.commands.includes(c));
};

/** `/goal unlock`: a locked goal becomes a draft again, so the human (or the agent, through goal_propose) can correct it. Relock re-runs every lock rule. */
export async function unlockGoal(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	if (g.status !== "active") return d.ui.notify(refusal(g, "Only a locked goal can be unlocked"), "error");
	if (!(await d.ui.confirm(`Unlock ${g.id}?`, "It becomes a draft; the agent may edit it until you run /goal lock again (which re-checks it on the base commit)."))) return d.ui.notify("Not unlocked.", "info");
	commit(d, applyUnlock(g, { now: d.now() }), `Goal ${g.id} unlocked: now a draft. Correct it, then /goal lock.`, () => ({ event: "goal_unlocked" }));
}

/** `/goal done`: close only on a green check (or the human's confirmation for a human-confirm check). */
export async function doneGoal(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	if (g.status !== "active") return d.ui.notify(refusal(g, "Only an active goal can be closed"), "error");
	const problem = await integrityProblem(d, g);
	if (problem) return d.ui.notify(problem, "error");
	let exit: number | undefined;
	if (g.doneCheck.kind === "command") {
		const run = await runChecks(d.exec, g.doneCheck.commands, d.root);
		exit = run.exit;
		const decision = closeDecision(exit, "command");
		if (!decision.close) return d.ui.notify(`${decision.reason}\n${run.output}`, "error");
	} else if (!(await d.ui.confirm(`Is the outcome of ${g.id} met?`, `${g.outcome}\nThis closes the goal as an assertion, not a command result.`))) {
		return d.ui.notify("Not closed. The goal stays active.", "info");
	}
	const decision = closeDecision(exit, g.doneCheck.kind);
	if (!decision.close) return d.ui.notify(decision.reason, "error");
	const closed = await commitTombstoned(d, applyClose(g, { now: d.now(), closedBy: decision.closedBy }), "closed", `Goal ${g.id} closed (${decision.closedBy}).`, () => ({ event: "goal_closed", closedBy: decision.closedBy }));
	if (!closed) return;
	await d.runCommand(`/persist goal ${g.id} closed (${decision.closedBy}): ${g.outcome}`);
	d.tellAgent(
		`/goal done: goal ${g.id} is closed (${decision.closedBy}). After the /persist hand-off, capture the lessons learned from this goal ` +
		"(lessons-learned skill): what worked, what cost time, what to change next time. Keep it short.");
}

export async function dropCurrentGoal(d: Deps, reason: string): Promise<void> {
	const g = current(d);
	if (!g) return;
	if (g.status === "closed" || g.status === "dropped") return d.ui.notify(refusal(g, "Nothing to drop"), "error");
	await commitTombstoned(d, dropGoal(g, { now: d.now(), reason }), "dropped", `Goal ${g.id} dropped.`, () => ({ event: "goal_dropped", reason }));
}

/** Run one /goal command. A handler that throws (a goal file that cannot be written, say) is reported to the human, never thrown. */
export async function runGoalCommand(d: Deps, raw: string): Promise<void> {
	const a = parseGoalArgs(raw);
	try {
		switch (a.kind) {
			case "show": return await showGoal(d);
			case "start": return await startGoal(d, a.outcome);
			case "lock": return await lockGoal(d);
			case "unlock": return await unlockGoal(d);
			case "help": return d.showHelp ? d.showHelp(GOAL_HELP) : d.ui.notify(GOAL_HELP, "info");
			case "retired": return d.ui.notify(`/goal ${a.word} is retired. /goal shows the card and whether the check is green; to correct a locked goal use /goal unlock, then /goal lock.`, "info");
			case "done": return await doneGoal(d);
			case "drop": return await dropCurrentGoal(d, "dropped by the user");
		}
	} catch (e) {
		d.ui.notify(`/goal ${a.kind === "start" ? "<outcome>" : a.kind} failed: ${errorText(e)}`, "error");
	}
}

/** The one-line reminder for the prompt, or undefined unless the current branch has an active goal. */
export function promptReminder(d: Deps): string | undefined {
	if (!d.branch) return undefined;
	const { goal } = load(d);
	return goal ? reminderLine(goal) : undefined;
}

/** Session start: the goals (draft or active) whose branch is merged or deleted, as one message; undefined if none. */
export async function staleWarning(d: Deps): Promise<string | undefined> {
	const lines: string[] = [];
	for (const g of listGoals(d.store)) {
		if (g.status !== "draft" && g.status !== "active") continue;
		const state = await branchState(d.exec, d.root, g.branch, g.doneCheck.baseCommit);
		const why = staleGoal(state.exists, state.merged);
		if (why) lines.push(`Goal ${g.id} (${g.outcome}): ${why}. Switch to ${g.branch} and run /goal to close or drop it.`);
	}
	return lines.length ? lines.join("\n") : undefined;
}
