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

const jsonOrNull = (c: CheckSpec | undefined) => JSON.stringify(c ?? null);

function renderEntry(e: HistoryEntry): string {
	const base = `- ${e.at} ${e.by}: ${oneLine(e.reason)}`;
	return e.old || e.new ? `${base} | old: ${jsonOrNull(e.old)} | new: ${jsonOrNull(e.new)}` : base;
}

function parseEntry(line: string): HistoryEntry | undefined {
	const m = line.match(/^- (\S+) (\S+): (.*?)(?: \| old: (null|\{.*?\}) \| new: (null|\{.*\}))?$/);
	if (!m) return undefined;
	const e: HistoryEntry = { at: m[1], by: m[2], reason: m[3] };
	// Greedy-last split: a reason that itself contains " | old: " is rare; JSON must parse or the line stays plain text.
	const old = m[4] && JSON.parse(m[4]);
	const next = m[5] && JSON.parse(m[5]);
	if (old) e.old = old;
	if (next) e.new = next;
	return e;
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
	const entries = (title: string) => bullets(title).flatMap((b) => parseEntry(`- ${b}`) ?? []);
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
