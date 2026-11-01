// Pure helpers for /goal (goal-command.ts): where a branch's Goal Contract lives, and its file format.
// Contract: docs/specs/agentic-coding/contracts/goal-todo-contract.md sections 1 and 2.
// Tested in goal.test.ts. File I/O lives in goal-store.ts; the command wiring in ../goal-command.ts.

import { isAbsolute, join } from "node:path";
import { repoSlug } from "./persist.ts";

export type GoalStatus = "draft" | "active" | "closed" | "dropped";
export type CheckKind = "command" | "human";

/** The part of a done-check that a change replaces. */
export interface CheckSpec { kind: CheckKind; commands: string[] }

export interface DoneCheck extends CheckSpec { lockedAt: string; lockedBy: string; baseCommit: string }

/** `old` and `new` are set on a done-check change; a pending proposal has `new` only. */
export interface HistoryEntry { at: string; by: string; reason: string; old?: CheckSpec; new?: CheckSpec }

export interface Goal {
	id: string;
	branch: string;
	status: GoalStatus;
	outcome: string;
	doneCheck: DoneCheck;
	createdAt: string;
	closedAt: string;
	closedBy: "" | "check" | "assertion";
	antiGoals: string[];
	scopeAnchors: string[];
	specLinks: string[];
	history: HistoryEntry[];
	/** An agent proposal for the locked done-check; waits for the human. Kept in a "## Pending change" section. */
	pending?: HistoryEntry;
}

/** `${XDG_CACHE_HOME:-~/.cache}/agent-skills/todos/<repo_slug>/`, slug from the MAIN worktree root. */
export function storeDir(env: Record<string, string | undefined>, home: string, gitCommonDir: string): string {
	const xdg = env.XDG_CACHE_HOME;
	const cache = xdg && isAbsolute(xdg) ? xdg : join(home, ".cache");
	const mainRoot = gitCommonDir.replace(/\/+$/, "").replace(/\/[^/]*$/, "") || "/";
	return join(cache, "agent-skills", "todos", repoSlug(mainRoot));
}

export const branchSlug = (branch: string): string => branch.replace(/\//g, "-");
export const goalsDir = (store: string): string => join(store, "goals");
export const goalPath = (store: string, branch: string): string => join(goalsDir(store), `${branchSlug(branch)}.md`);

/** ISO-8601 UTC without milliseconds, as in the contract. */
export const stamp = (now: Date): string => now.toISOString().replace(/\.\d{3}Z$/, "Z");

export function newDraft(input: { branch: string; outcome: string; baseCommit: string }, now: Date): Goal {
	return {
		id: `g-${branchSlug(input.branch)}`,
		branch: input.branch,
		status: "draft",
		outcome: oneLine(input.outcome),
		doneCheck: { kind: "command", commands: [], lockedAt: "", lockedBy: "", baseCommit: input.baseCommit },
		createdAt: stamp(now),
		closedAt: "",
		closedBy: "",
		antiGoals: [],
		scopeAnchors: [],
		specLinks: [],
		history: [],
	};
}

/** Why the goal may not be saved, or undefined. A draft may still lack its done-check; an active goal may not. */
export function validateGoal(g: Goal): string | undefined {
	if (!g.outcome.trim()) return "a goal needs an outcome";
	if (g.status !== "draft" && g.doneCheck.kind === "command" && !g.doneCheck.commands.length) return "a goal needs a done-check (at least one command, or kind human)";
	return undefined;
}

export const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();

// ---- file format ----

const NUMBER_LIKE = /^[+-]?[\d_.]+(?:[eE][+-]?\d+)?$/;
const RESERVED = /^(?:true|false|null|yes|no|on|off|~)$/i;

function quoteIfNeeded(v: string): string {
	const risky = v === "" || v !== v.trim() || /: |\s#|:$|^[-?:,[\]{}#&*!|>'"%@`]/.test(v) || RESERVED.test(v) || NUMBER_LIKE.test(v);
	return risky ? JSON.stringify(v) : v;
}

function unquote(raw: string): string {
	const v = raw.trim();
	if (v.startsWith('"')) {
		try { return JSON.parse(v); } catch { return v; }
	}
	if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) return v.slice(1, -1).replace(/''/g, "'");
	return v;
}

const isCheckSpec = (c: unknown): c is CheckSpec =>
	!!c && typeof c === "object" && ((c as CheckSpec).kind === "command" || (c as CheckSpec).kind === "human") &&
	Array.isArray((c as CheckSpec).commands) && (c as CheckSpec).commands.every((x) => typeof x === "string");

/**
 * A change entry is one JSON object per line, so free text (a reason) cannot break the parse.
 * An entry without a change stays a plain `- <at> <by>: <reason>` line; a degraded entry (no at/by) is just its text.
 */
function renderEntry(e: HistoryEntry): string {
	if (e.old || e.new) return `- ${JSON.stringify({ at: e.at, by: e.by, reason: oneLine(e.reason), ...(e.old ? { old: e.old } : {}), ...(e.new ? { new: e.new } : {}) })}`;
	return e.at || e.by ? `- ${e.at} ${e.by}: ${oneLine(e.reason)}` : `- ${oneLine(e.reason)}`;
}

/** `line` is the text after "- ". Never throws: a line that is not a valid entry degrades to a plain-text reason. */
function parseEntry(line: string): HistoryEntry {
	if (line.startsWith("{")) {
		try {
			const j = JSON.parse(line);
			if (typeof j?.at === "string" && typeof j.by === "string" && typeof j.reason === "string" &&
				(j.old === undefined || isCheckSpec(j.old)) && (j.new === undefined || isCheckSpec(j.new))) {
				return { at: j.at, by: j.by, reason: j.reason, ...(j.old ? { old: j.old } : {}), ...(j.new ? { new: j.new } : {}) };
			}
		} catch { /* degrade below */ }
	} else {
		const m = line.match(/^(\S+) (\S+): (.*)$/);
		if (m) return { at: m[1], by: m[2], reason: m[3] };
	}
	return { at: "", by: "", reason: line };
}

export function renderGoal(g: Goal): string {
	const d = g.doneCheck;
	const list = (items: string[]) => items.map((i) => `- ${oneLine(i)}`).join("\n");
	const section = (title: string, body: string) => `## ${title}\n${body ? `${body}\n` : ""}\n`;
	const commands = d.commands.length ? `\n${d.commands.map((c) => `    - ${quoteIfNeeded(oneLine(c))}`).join("\n")}` : " []";
	const front = [
		"---",
		`id: ${quoteIfNeeded(g.id)}`,
		`branch: ${quoteIfNeeded(g.branch)}`,
		`status: ${g.status}`,
		`outcome: ${quoteIfNeeded(oneLine(g.outcome))}`,
		"done_check:",
		`  kind: ${d.kind}`,
		`  commands:${commands}`,
		`  locked_at: ${quoteIfNeeded(d.lockedAt)}`,
		`  locked_by: ${quoteIfNeeded(d.lockedBy)}`,
		`  base_commit: ${quoteIfNeeded(d.baseCommit)}`,
		`created_at: ${quoteIfNeeded(g.createdAt)}`,
		`closed_at: ${quoteIfNeeded(g.closedAt)}`,
		`closed_by: ${quoteIfNeeded(g.closedBy)}`,
		"---",
		"",
	].join("\n");
	return (
		front +
		section("Anti-goals", list(g.antiGoals)) +
		section("Scope anchors", list(g.scopeAnchors)) +
		section("Spec links", list(g.specLinks)) +
		(g.pending ? section("Pending change", renderEntry(g.pending)) : "") +
		section("History", g.history.map(renderEntry).join("\n"))
	).replace(/\n+$/, "\n");
}

const STATUSES: GoalStatus[] = ["draft", "active", "closed", "dropped"];

export function parseGoal(text: string): Goal | undefined {
	const fm = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!fm) return undefined;
	const top: Record<string, string> = {};
	const check: Record<string, string> = {};
	const commands: string[] = [];
	let scope: "top" | "check" | "commands" = "top";
	for (const line of fm[1].split("\n")) {
		let m: RegExpMatchArray | null;
		if (scope === "commands" && (m = line.match(/^ {4}- (.*)$/))) { commands.push(unquote(m[1])); continue; }
		if (scope !== "top" && (m = line.match(/^ {2}([a-z_]+):(?: (.*))?$/))) {
			if (m[1] === "commands") {
				scope = "commands";
				if ((m[2] ?? "").trim() !== "[]" && m[2]) return undefined; // flow lists other than [] are not part of the format
			} else { scope = "check"; check[m[1]] = unquote(m[2] ?? ""); }
			continue;
		}
		if ((m = line.match(/^([a-z_]+):(?: (.*))?$/))) {
			if (m[1] === "done_check") scope = "check";
			else { scope = "top"; top[m[1]] = unquote(m[2] ?? ""); }
		}
	}
	const status = top.status as GoalStatus;
	if (!top.id || !STATUSES.includes(status)) return undefined;
	const sections = splitSections(fm[2]);
	const bullets = (title: string) => (sections[title] ?? []).flatMap((l) => (l.startsWith("- ") ? [l.slice(2)] : []));
	const entries = (title: string) => bullets(title).map(parseEntry);
	return {
		id: top.id,
		branch: top.branch ?? "",
		status,
		outcome: top.outcome ?? "",
		doneCheck: {
			kind: check.kind === "human" ? "human" : "command",
			commands,
			lockedAt: check.locked_at ?? "",
			lockedBy: check.locked_by ?? "",
			baseCommit: check.base_commit ?? "",
		},
		createdAt: top.created_at ?? "",
		closedAt: top.closed_at ?? "",
		closedBy: top.closed_by === "check" || top.closed_by === "assertion" ? top.closed_by : "",
		antiGoals: bullets("Anti-goals"),
		scopeAnchors: bullets("Scope anchors"),
		specLinks: bullets("Spec links"),
		history: entries("History"),
		...(entries("Pending change")[0] ? { pending: entries("Pending change")[0] } : {}),
	};
}

function splitSections(body: string): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	let cur: string[] | undefined;
	for (const line of body.split("\n")) {
		const h = line.match(/^## (.+?)\s*$/);
		if (h) out[h[1]] = cur = [];
		else if (cur && line.trim()) cur.push(line);
	}
	return out;
}

// ---- transitions ----
// Each returns a new Goal or the reason it was refused. Only command handlers driven by the human
// may call applyLock, applyApprovedChange, applyReject, applyClose and dropGoal; the agent's tool
// reaches only fillDraft and proposeChange.

export type Result = { ok: true; goal: Goal } | { ok: false; reason: string };
const refuse = (reason: string): Result => ({ ok: false, reason });

/** The done-check may be locked only if it failed on the base commit. */
export function canLock(baseCheckExit: number | undefined): { ok: true } | { ok: false; reason: string } {
	if (baseCheckExit === undefined) return { ok: false, reason: "The check could not be run on the base commit, so it cannot be shown to fail." };
	if (baseCheckExit === 0) return { ok: false, reason: "The check passes on the base commit. It must fail before the work starts; make it test the outcome." };
	return { ok: true };
}

export interface DraftFields { doneCheck?: CheckSpec; antiGoals?: string[]; scopeAnchors?: string[]; specLinks?: string[] }

/** Agent-reachable: set draft fields. Never locks; refuses once the goal is no longer a draft. */
export function fillDraft(g: Goal, f: DraftFields): Result {
	if (g.status !== "draft") return refuse(`The goal is ${g.status}; only a draft is filled directly. Propose a change to a locked done-check instead.`);
	return {
		ok: true,
		goal: {
			...g,
			doneCheck: f.doneCheck ? { ...g.doneCheck, kind: f.doneCheck.kind, commands: f.doneCheck.commands.map(oneLine).filter(Boolean) } : g.doneCheck,
			antiGoals: f.antiGoals?.map(oneLine).filter(Boolean) ?? g.antiGoals,
			scopeAnchors: f.scopeAnchors?.map(oneLine).filter(Boolean) ?? g.scopeAnchors,
			specLinks: f.specLinks?.map(oneLine).filter(Boolean) ?? g.specLinks,
		},
	};
}

const specOf = (d: DoneCheck): CheckSpec => ({ kind: d.kind, commands: [...d.commands] });

/** Human only: lock a draft. A command check needs `baseExit` from a run on the base commit, and it must be non-zero. */
export function applyLock(g: Goal, input: { now: Date; baseCommit: string; baseExit?: number }): Result {
	if (g.status !== "draft") return refuse(`Only a draft can be locked (the goal is ${g.status}).`);
	const why = validateGoal({ ...g, status: "active" });
	if (why) return refuse(`Not locked: ${why}.`);
	let reason = "locked (human-confirm check)";
	if (g.doneCheck.kind === "command") {
		const c = canLock(input.baseExit);
		if (!c.ok) return refuse(c.reason);
		reason = `locked (base ${input.baseCommit} failed: exit ${input.baseExit})`;
	}
	const at = stamp(input.now);
	return {
		ok: true,
		goal: {
			...g,
			status: "active",
			doneCheck: { ...g.doneCheck, lockedAt: at, lockedBy: "human", baseCommit: input.baseCommit },
			history: [...g.history, { at, by: "human", reason }],
		},
	};
}

/** Agent-reachable: park a proposed replacement for the locked done-check. It changes nothing until the human approves. */
export function proposeChange(g: Goal, input: { now: Date; by: string; reason: string; check: CheckSpec }): Result {
	if (g.status !== "active") return refuse(`Changes to a done-check are proposed only for an active goal (the goal is ${g.status}).`);
	if (!oneLine(input.reason)) return refuse("A proposed change needs a reason.");
	const commands = input.check.commands.map(oneLine).filter(Boolean);
	if (input.check.kind === "command" && !commands.length) return refuse("A command check needs at least one command.");
	return {
		ok: true,
		goal: { ...g, pending: { at: stamp(input.now), by: input.by, reason: oneLine(input.reason), old: specOf(g.doneCheck), new: { kind: input.check.kind, commands } } },
	};
}

/** Human only: apply the pending change and record it. */
export function applyApprovedChange(g: Goal, input: { now: Date }): Result {
	const p = g.pending;
	if (!p?.new) return refuse("No change is pending.");
	return {
		ok: true,
		goal: {
			...g,
			doneCheck: { ...g.doneCheck, kind: p.new.kind, commands: [...p.new.commands] },
			pending: undefined,
			history: [...g.history, { at: stamp(input.now), by: "human", reason: p.reason, old: p.old, new: p.new }],
		},
	};
}

/** Human only: discard the pending change and log that it was rejected. */
export function applyReject(g: Goal, input: { now: Date }): Result {
	if (!g.pending) return refuse("No change is pending.");
	return {
		ok: true,
		goal: { ...g, pending: undefined, history: [...g.history, { at: stamp(input.now), by: "human", reason: `change rejected: ${g.pending.reason}` }] },
	};
}

/** `exit` is the done-check exit code (undefined: it could not run). For kind human the caller has the human's confirmation. */
export function closeDecision(checkExit: number | undefined, kind: CheckKind): { close: true; closedBy: "check" | "assertion" } | { close: false; reason: string } {
	if (kind === "human") return { close: true, closedBy: "assertion" };
	if (checkExit === 0) return { close: true, closedBy: "check" };
	const how = checkExit === undefined ? "could not run" : `failed (exit ${checkExit})`;
	return { close: false, reason: `The done-check ${how}. The goal stays active; see the check output above.` };
}

/** Human only. */
export function applyClose(g: Goal, input: { now: Date; closedBy: "check" | "assertion" }): Result {
	if (g.status !== "active") return refuse(`Only an active goal can be closed (the goal is ${g.status}).`);
	const at = stamp(input.now);
	return { ok: true, goal: { ...g, status: "closed", closedAt: at, closedBy: input.closedBy, pending: undefined, history: [...g.history, { at, by: "human", reason: `closed (${input.closedBy})` }] } };
}

/** Human only: abandon a draft or active goal. */
export function dropGoal(g: Goal, input: { now: Date; reason: string }): Result {
	if (g.status !== "draft" && g.status !== "active") return refuse(`The goal is already ${g.status}.`);
	const at = stamp(input.now);
	const why = oneLine(input.reason) || "no reason given";
	return { ok: true, goal: { ...g, status: "dropped", pending: undefined, history: [...g.history, { at, by: "human", reason: `dropped: ${why}` }] } };
}

/** The one line added to each prompt; none unless the goal is active. */
export function reminderLine(g: Goal): string | undefined {
	return g.status === "active" ? `Goal: ${g.id} ${oneLine(g.outcome)}; run /goal to refresh` : undefined;
}

/** Why the goal of a branch needs a decision at session start, or undefined. */
export function staleGoal(branchExists: boolean, merged: boolean): string | undefined {
	if (!branchExists) return "its branch was deleted";
	return merged ? "its branch is merged" : undefined;
}
