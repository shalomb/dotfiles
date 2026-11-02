// The /goal command flows (goal-command.ts is the thin pi wiring around these). Tested in goal-flow.test.ts.
// Rule: only the handlers below that the human drives (lock, approve, reject, done, drop, start) change a goal's
// state; the agent reaches proposeFromAgent only, which writes a draft or a pending change and never locks.

import {
	type CheckSpec, type DraftFields, type Goal, type Result,
	applyApprovedChange, applyClose, applyLock, canLock, goalCheckHash, applyReject, closeDecision, dropGoal, fillDraft, isEnvironmentFailure, newDraft, oneLine,
	proposeChange, reminderLine, stamp, staleGoal,
} from "./goal.ts";
import { type Exec, type GoalEvent, appendGoalEvent, branchState, goalRefName, listGoals, loadGoal, loadGoalFile, readRecordedHash, recordCheckHash, runChecks, runChecksAtCommit, saveGoal } from "./goal-io.ts";

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
	/** Run a slash command (such as /persist) as if the human typed it. */
	runCommand(command: string): Promise<void> | void;
}

export type GoalArgs =
	| { kind: "show" | "lock" | "check" | "approve" | "reject" | "done" | "drop" }
	| { kind: "start"; outcome: string };

export const SUBCOMMANDS = ["lock", "check", "approve", "reject", "done", "drop"] as const;

/** A subcommand is the whole argument. Anything longer is an outcome, even if its first word is a subcommand. */
export function parseGoalArgs(raw: string): GoalArgs {
	const a = raw.trim();
	if (!a) return { kind: "show" };
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

/**
 * Why an active goal's done-check cannot be trusted, or undefined when it equals the hash at the tip of its private ref.
 * Used by /goal check and /goal done: a check edited outside /goal, or a goal with no record, is not run.
 */
async function integrityProblem(d: Deps, g: Goal): Promise<string | undefined> {
	const ref = goalRefName(g.branch);
	const recorded = await readRecordedHash(d.exec, d.root, g.branch);
	if (recorded.kind === "error") return `The approved done-check of ${g.id} cannot be read: ${recorded.error}. Inspect it with: git log ${ref}`;
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
	if (g.pending?.new) lines.push(`Pending change from ${g.pending.by} (${g.pending.reason}); /goal approve or /goal reject:`, ...checkLines({ ...g, doneCheck: { ...g.doneCheck, ...g.pending.new } }));
	if (g.closedBy) lines.push(`Closed ${g.closedAt} by ${g.closedBy}.`);
	return lines.join("\n");
}

export async function showGoal(d: Deps): Promise<void> {
	const { goal, error } = load(d);
	d.ui.notify(goal ? summary(goal) : error!, goal ? "info" : "error");
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
		return d.ui.notify(`This branch already has a ${existing.status} goal (${existing.id}). /goal drop ends it first.`, "error");
	const g = newDraft({ branch: d.branch, outcome, baseCommit: d.head }, d.now());
	const saved = commit(d, { ok: true, goal: g }, `Draft goal saved: ${g.id}`);
	if (!saved) return;
	d.tellAgent(
		`/goal: the user set this goal for branch ${g.branch}: "${g.outcome}". Draft the contract now with the goal_propose tool: ` +
		"done_check (one or more shell commands that test the outcome and exit non-zero until the work is done; they must fail on the base commit " +
		`${g.doneCheck.baseCommit}), anti_goals, scope_anchors (paths) and spec_links. Use kind "human" only when no command can test the outcome. ` +
		"You cannot lock the contract: the user reviews it and runs /goal lock. Reply with a 3-line summary of what you drafted.");
}

export interface Proposal { doneCheck?: CheckSpec; outcomeChecks?: string[]; antiGoals?: string[]; scopeAnchors?: string[]; specLinks?: string[]; reason?: string }

/**
 * The goal_propose tool. On a draft: fill the contract fields. On an active goal: park a change to the
 * done-check for the human to approve. Never locks, approves or closes.
 */
export async function proposeFromAgent(d: Deps, p: Proposal): Promise<{ ok: boolean; message: string }> {
	const out = (ok: boolean, message: string) => ({ ok, message });
	if (!d.branch) return out(false, NEEDS_BRANCH);
	const { goal: g, error } = load(d);
	if (!g) return out(false, error === NO_GOAL ? `${NO_GOAL} Only the user starts a goal.` : error!);
	let r: Result;
	if (g.status === "draft") {
		const f: DraftFields = { doneCheck: p.doneCheck, outcomeChecks: p.outcomeChecks, antiGoals: p.antiGoals, scopeAnchors: p.scopeAnchors, specLinks: p.specLinks };
		r = fillDraft(g, f);
	} else if (g.status === "active") {
		if (p.outcomeChecks) return out(false, "The goal is locked. Only the user marks the Outcome Check (at /goal lock or /goal approve).");
		if (!p.doneCheck) return out(false, "The goal is locked. Only a change to the done-check can be proposed: pass done_check and a reason.");
		if (p.antiGoals || p.scopeAnchors || p.specLinks) return out(false, "The goal is locked. Propose a done-check change only; ask the user to change anti-goals, scope anchors or spec links.");
		r = proposeChange(g, { now: d.now(), by: "agent", reason: p.reason ?? "", check: p.doneCheck });
	} else {
		return out(false, `The goal is ${g.status}; nothing to propose.`);
	}
	if (!r.ok) return out(false, r.reason);
	saveGoal(d.store, r.goal);
	if (g.status === "draft") {
		d.ui.notify(`Goal ${g.id} draft updated by the agent. Review it with /goal; /goal lock when it is right.`, "info");
		return out(true, "Draft saved. It is not locked: the user reviews it and runs /goal lock.");
	}
	d.ui.notify(`The agent proposes a change to the locked done-check of ${g.id}: ${oneLine(p.reason ?? "")}. /goal approve or /goal reject.`, "warning");
	return out(true, "Change recorded as pending. The locked done-check is unchanged until the user runs /goal approve.");
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
	if (g.status !== "draft") return d.ui.notify(`Only a draft can be locked (the goal is ${g.status}).`, "error");
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
	const ok = await d.ui.confirm(
		`Lock the done-check of ${g.id}?`,
		`${g.outcome}\n${checkLines(g).join("\n")}\n${evidence}\nOnce locked, only you can change it.`);
	if (!ok) return d.ui.notify("Not locked. The goal stays a draft.", "info");
	await commitRecorded(d, applyLock(g, { now: d.now(), baseCommit: g.doneCheck.baseCommit, baseExit, outcomeChecks }), `Goal ${g.id} locked.`, () => `lock ${g.id}`,
		(locked) => ({ event: "goal_locked", kind: locked.doneCheck.kind, checkHash: goalCheckHash(locked) }));
}

const sameSpec = (a: CheckSpec, b: CheckSpec) => a.kind === b.kind && a.commands.length === b.commands.length && a.commands.every((c, i) => c === b.commands[i]);

/** A change weakens the check when it drops a command or swaps commands for a human confirmation. */
const weakens = (old: CheckSpec, next: CheckSpec) => old.kind === "command" && (next.kind === "human" || old.commands.some((c) => !next.commands.includes(c)));

/**
 * `/goal approve`: same rule as lock. The new check must fail at the base commit, and the human is shown
 * the live current check; a proposal made against a different check is refused.
 */
export async function approveChange(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	const p = g.pending;
	if (!p?.new) return d.ui.notify("No change is pending.", "info");
	const live: CheckSpec = { kind: g.doneCheck.kind, commands: g.doneCheck.commands };
	if (!p.old || !sameSpec(p.old, live))
		return d.ui.notify("The pending change no longer matches the current done-check (it changed since the proposal). /goal reject discards it; ask the agent to propose again.", "error");
	let evidence = "(human-confirm check; no command runs)";
	if (p.new.kind === "command") {
		const run = await runChecksAtCommit(d.exec, d.root, g.doneCheck.baseCommit, p.new.commands, d.tmpParent);
		const refused = canLock(run.exit);
		if (!refused.ok) return d.ui.notify(`${refused.reason}\n${run.output}`, "error");
		if (!(await environmentFailureOverridden(d, g, run))) return;
		evidence = `On base ${g.doneCheck.baseCommit} the new check fails (exit ${run.exit}).`;
	}
	let outcomeChecks: string[] | undefined;
	if (p.new.kind === "command" && !g.doneCheck.outcomeChecks.some((c) => p.new!.commands.includes(c))) {
		outcomeChecks = await askOutcomeCheck(d, g, p.new.commands);
		if (!outcomeChecks) return d.ui.notify("Not approved: the change drops the Outcome Check, so mark one of the new commands as the Outcome Check. The change stays pending.", "error");
		evidence += `\nOutcome Check: ${outcomeChecks.join(", ")}`;
	}
	const weakening = weakens(live, p.new);
	const title = `${weakening ? "WEAKENING: approve" : "Approve"} the change to the done-check of ${g.id}?`;
	const body = `Proposed by ${p.by}: ${p.reason}\nCurrent:\n${checkLines({ ...g, doneCheck: { ...g.doneCheck, ...live } }).join("\n")}\nNew:\n${checkLines({ ...g, doneCheck: { ...g.doneCheck, ...p.new } }).join("\n")}\n${evidence}`;
	// A weakening change needs the goal id typed, so a reflex "yes" cannot approve it.
	const ok = weakening
		? (await d.ui.input(`${title} Type ${g.id} to approve.`, body))?.trim() === g.id
		: await d.ui.confirm(title, body);
	if (!ok) return d.ui.notify(weakening ? "Not approved: the goal id was not typed. The change stays pending; /goal reject discards it." : "Not approved. The change stays pending; /goal reject discards it.", "info");
	await commitRecorded(d, applyApprovedChange(g, { now: d.now(), outcomeChecks }), `Change approved and recorded in ${g.id}.`, () => `approve ${g.id}: ${oneLine(p.reason)}`,
		(changed) => ({ event: "goal_changed", reason: oneLine(p.reason), weakening, checkHash: goalCheckHash(changed) }));
}

/**
 * `/goal reject`: discard the pending change. If a failed approve left the ref on the rejected hash, record the
 * current check's hash again (before saving) so the ref and the goal file agree; an agreeing ref is left alone.
 */
export async function rejectChange(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	const r = applyReject(g, { now: d.now() });
	if (r.ok && g.status === "active") {
		const hash = goalCheckHash(g);
		const recorded = await readRecordedHash(d.exec, d.root, g.branch);
		if (recorded.kind === "hash" && recorded.hash !== hash) {
			const rec = await recordCheckHash(d.exec, d.root, g.branch, hash, `reject ${g.id}`);
			if (!rec.ok) return d.ui.notify(`Not discarded: the current done-check could not be re-recorded on ${goalRefName(g.branch)}: ${rec.error}`, "error");
		}
	}
	commit(d, r, "Pending change discarded; the done-check is unchanged.");
}

/** `/goal check`: run the done-check now, from this checkout. */
export async function checkGoal(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	if (g.status === "active") {
		const problem = await integrityProblem(d, g);
		if (problem) return d.ui.notify(problem, "error");
	}
	if (g.doneCheck.kind === "human") return d.ui.notify("Human-confirm check: no command to run. /goal done asks you to confirm.", "info");
	if (!g.doneCheck.commands.length) return d.ui.notify("The draft has no done-check yet.", "error");
	const run = await runChecks(d.exec, g.doneCheck.commands, d.root);
	d.ui.notify(run.exit === 0 ? `Done-check green.\n${run.output}` : `Done-check red (exit ${run.exit}).\n${run.output}`, "info");
}

/** `/goal done`: close only on a green check (or the human's confirmation for a human-confirm check). */
export async function doneGoal(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	if (g.status !== "active") return d.ui.notify(`Only an active goal can be closed (the goal is ${g.status}).`, "error");
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
	const closed = commit(d, applyClose(g, { now: d.now(), closedBy: decision.closedBy }), `Goal ${g.id} closed (${decision.closedBy}).`, () => ({ event: "goal_closed", closedBy: decision.closedBy }));
	if (!closed) return;
	await d.runCommand(`/persist goal ${g.id} closed (${decision.closedBy}): ${g.outcome}`);
	d.tellAgent(
		`/goal done: goal ${g.id} is closed (${decision.closedBy}). After the /persist hand-off, capture the lessons learned from this goal ` +
		"(lessons-learned skill): what worked, what cost time, what to change next time. Keep it short.");
}

export async function dropCurrentGoal(d: Deps, reason: string): Promise<void> {
	const g = current(d);
	if (!g) return;
	commit(d, dropGoal(g, { now: d.now(), reason }), `Goal ${g.id} dropped.`, () => ({ event: "goal_dropped", reason }));
}

/** Run one /goal command. A handler that throws (a goal file that cannot be written, say) is reported to the human, never thrown. */
export async function runGoalCommand(d: Deps, raw: string): Promise<void> {
	const a = parseGoalArgs(raw);
	try {
		switch (a.kind) {
			case "show": return await showGoal(d);
			case "start": return await startGoal(d, a.outcome);
			case "lock": return await lockGoal(d);
			case "check": return await checkGoal(d);
			case "approve": return await approveChange(d);
			case "reject": return await rejectChange(d);
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
