// The /goal command flows (goal-command.ts is the thin pi wiring around these). Tested in goal-flow.test.ts.
// Rule: only the handlers below that the human drives (lock, approve, reject, done, drop, start) change a goal's
// state; the agent reaches proposeFromAgent only, which writes a draft or a pending change and never locks.

import {
	type CheckSpec, type DraftFields, type Goal, type Result,
	applyApprovedChange, applyClose, applyLock, applyReject, closeDecision, dropGoal, fillDraft, newDraft, oneLine,
	proposeChange, reminderLine, staleGoal,
} from "./goal.ts";
import { type Exec, branchState, listGoals, loadGoal, runChecks, runChecksAtCommit, saveGoal } from "./goal-io.ts";

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
	ui: { notify(message: string, level?: "info" | "warning" | "error"): void; confirm(title: string, message: string): Promise<boolean> };
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

function current(d: Deps): Goal | undefined {
	if (!d.branch) {
		d.ui.notify(NEEDS_BRANCH, "error");
		return undefined;
	}
	const g = loadGoal(d.store, d.branch);
	if (!g) d.ui.notify(NO_GOAL, "error");
	return g;
}

/** Save the result of a transition, or tell the human why it was refused. */
function commit(d: Deps, r: Result, done: string): Goal | undefined {
	if (!r.ok) {
		d.ui.notify(r.reason, "error");
		return undefined;
	}
	saveGoal(d.store, r.goal);
	d.ui.notify(done, "info");
	return r.goal;
}

export function summary(g: Goal): string {
	const lines = [
		`${g.id} [${g.status}] ${g.outcome}`,
		`Done-check (${g.doneCheck.kind}${g.doneCheck.lockedAt ? `, locked ${g.doneCheck.lockedAt}, failed on base ${g.doneCheck.baseCommit}` : ", not locked"}):`,
		...checkLines(g),
		"Anti-goals:", bullets(g.antiGoals),
		"Scope anchors:", bullets(g.scopeAnchors),
		"Spec links:", bullets(g.specLinks),
	];
	if (g.pending?.new) lines.push(`Pending change from ${g.pending.by} (${g.pending.reason}); /goal approve or /goal reject:`, ...checkLines({ ...g, doneCheck: { ...g.doneCheck, ...g.pending.new } }));
	if (g.closedBy) lines.push(`Closed ${g.closedAt} by ${g.closedBy}.`);
	return lines.join("\n");
}

export async function showGoal(d: Deps): Promise<void> {
	if (!d.branch) return d.ui.notify(NEEDS_BRANCH, "error");
	const g = loadGoal(d.store, d.branch);
	d.ui.notify(g ? summary(g) : NO_GOAL, "info");
}

/** `/goal <outcome>`: save a draft at the current HEAD and ask the agent to fill in the contract. */
export async function startGoal(d: Deps, outcome: string): Promise<void> {
	if (!d.branch) return d.ui.notify(NEEDS_BRANCH, "error");
	const existing = loadGoal(d.store, d.branch);
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

export interface Proposal { doneCheck?: CheckSpec; antiGoals?: string[]; scopeAnchors?: string[]; specLinks?: string[]; reason?: string }

/**
 * The goal_propose tool. On a draft: fill the contract fields. On an active goal: park a change to the
 * done-check for the human to approve. Never locks, approves or closes.
 */
export async function proposeFromAgent(d: Deps, p: Proposal): Promise<{ ok: boolean; message: string }> {
	const out = (ok: boolean, message: string) => ({ ok, message });
	if (!d.branch) return out(false, NEEDS_BRANCH);
	const g = loadGoal(d.store, d.branch);
	if (!g) return out(false, `${NO_GOAL} Only the user starts a goal.`);
	let r: Result;
	if (g.status === "draft") {
		const f: DraftFields = { doneCheck: p.doneCheck, antiGoals: p.antiGoals, scopeAnchors: p.scopeAnchors, specLinks: p.specLinks };
		r = fillDraft(g, f);
	} else if (g.status === "active") {
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

/** `/goal lock`: run the check at the base commit; refuse when it passes; else ask the human and lock. */
export async function lockGoal(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	if (g.status !== "draft") return d.ui.notify(`Only a draft can be locked (the goal is ${g.status}).`, "error");
	let baseExit: number | undefined;
	let evidence = "(human-confirm check; no command runs)";
	if (g.doneCheck.kind === "command") {
		if (!g.doneCheck.commands.length) return d.ui.notify("Not locked: the draft has no done-check yet (ask the agent, or use goal_propose).", "error");
		const run = await runChecksAtCommit(d.exec, d.root, g.doneCheck.baseCommit, g.doneCheck.commands, d.tmpParent);
		baseExit = run.exit;
		const refused = applyLock(g, { now: d.now(), baseCommit: g.doneCheck.baseCommit, baseExit });
		if (!refused.ok) return d.ui.notify(`${refused.reason}\n${run.output}`, "error");
		evidence = `On base ${g.doneCheck.baseCommit} it fails (exit ${baseExit}):\n${run.output}`;
	}
	const ok = await d.ui.confirm(
		`Lock the done-check of ${g.id}?`,
		`${g.outcome}\n${checkLines(g).join("\n")}\n${evidence}\nOnce locked, only you can change it.`);
	if (!ok) return d.ui.notify("Not locked. The goal stays a draft.", "info");
	commit(d, applyLock(g, { now: d.now(), baseCommit: g.doneCheck.baseCommit, baseExit }), `Goal ${g.id} locked.`);
}

export async function approveChange(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	if (!g.pending?.new) return d.ui.notify("No change is pending.", "info");
	const ok = await d.ui.confirm(
		`Approve the change to the done-check of ${g.id}?`,
		`Proposed by ${g.pending.by}: ${g.pending.reason}\nOld:\n${checkLines({ ...g, doneCheck: { ...g.doneCheck, ...g.pending.old } }).join("\n")}\nNew:\n${checkLines({ ...g, doneCheck: { ...g.doneCheck, ...g.pending.new } }).join("\n")}`);
	if (!ok) return d.ui.notify("Not approved. The change stays pending; /goal reject discards it.", "info");
	commit(d, applyApprovedChange(g, { now: d.now() }), `Change approved and recorded in ${g.id}.`);
}

export async function rejectChange(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
	commit(d, applyReject(g, { now: d.now() }), "Pending change discarded; the done-check is unchanged.");
}

/** `/goal check`: run the done-check now, from this checkout. */
export async function checkGoal(d: Deps): Promise<void> {
	const g = current(d);
	if (!g) return;
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
	const closed = commit(d, applyClose(g, { now: d.now(), closedBy: decision.closedBy }), `Goal ${g.id} closed (${decision.closedBy}).`);
	if (!closed) return;
	await d.runCommand(`/persist goal ${g.id} closed (${decision.closedBy}): ${g.outcome}`);
	d.tellAgent(
		`/goal done: goal ${g.id} is closed (${decision.closedBy}). After the /persist hand-off, capture the lessons learned from this goal ` +
		"(lessons-learned skill): what worked, what cost time, what to change next time. Keep it short.");
}

export async function dropCurrentGoal(d: Deps, reason: string): Promise<void> {
	const g = current(d);
	if (!g) return;
	commit(d, dropGoal(g, { now: d.now(), reason }), `Goal ${g.id} dropped.`);
}

/** The one-line reminder for the prompt, or undefined unless the current branch has an active goal. */
export function promptReminder(d: Deps): string | undefined {
	if (!d.branch) return undefined;
	const g = loadGoal(d.store, d.branch);
	return g ? reminderLine(g) : undefined;
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
