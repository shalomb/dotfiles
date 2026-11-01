// File and git side of /goal (goal-command.ts): load/save goals, run done-checks, branch state.
// Everything takes its paths and its exec function as arguments, so tests use temp dirs. Tested in goal-io.test.ts.

import { mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { type Goal, goalPath, goalsDir, parseGoal, renderGoal, validateGoal } from "./goal.ts";

export type Exec = (cmd: string, args: string[], opts?: { cwd?: string; timeout?: number }) => Promise<{ code: number; stdout: string; stderr: string }>;

const CHECK_TIMEOUT_MS = 600_000;
const OUTPUT_TAIL_LINES = 40;

export function loadGoal(store: string, branch: string): Goal | undefined {
	try {
		return parseGoal(readFileSync(goalPath(store, branch), "utf8"));
	} catch {
		return undefined;
	}
}

/** Write the goal atomically. Throws, writing nothing, if it has no outcome or (once not a draft) no done-check. */
export function saveGoal(store: string, g: Goal): void {
	const why = validateGoal(g);
	if (why) throw new Error(`Goal not saved: ${why}.`);
	mkdirSync(goalsDir(store), { recursive: true });
	const path = goalPath(store, g.branch);
	const tmp = `${path}.tmp`;
	writeFileSync(tmp, renderGoal(g));
	renameSync(tmp, path);
}

export interface CheckRun { exit: number | undefined; output: string }

const tail = (s: string) => s.split("\n").slice(-OUTPUT_TAIL_LINES).join("\n").trim();

/** Run each command with `bash -c` in `cwd`, in order. Stop at the first non-zero exit. Exit 0 means every command passed. */
export async function runChecks(exec: Exec, commands: string[], cwd: string): Promise<CheckRun> {
	let output = "";
	for (const command of commands) {
		const r = await exec("bash", ["-c", command], { cwd, timeout: CHECK_TIMEOUT_MS });
		output += `$ ${command}\n${r.stdout}${r.stderr}`;
		if (r.code !== 0) return { exit: r.code, output: tail(output) };
	}
	return { exit: 0, output: tail(output) };
}

/**
 * Run the check in a temporary detached worktree at `commit` (made under `tmpParent`), then remove it.
 * `exit` is undefined when the worktree could not be made: that must never read as "failed on base".
 */
export async function runChecksAtCommit(exec: Exec, repoRoot: string, commit: string, commands: string[], tmpParent: string): Promise<CheckRun> {
	const dir = mkdtempSync(join(tmpParent, "goal-base-"));
	const added = await exec("git", ["-C", repoRoot, "worktree", "add", "--detach", "--force", dir, commit]);
	if (added.code !== 0) {
		await exec("git", ["-C", repoRoot, "worktree", "prune"]);
		return { exit: undefined, output: `git worktree add failed at ${commit}: ${added.stderr.trim()}` };
	}
	try {
		return await runChecks(exec, commands, dir);
	} finally {
		await exec("git", ["-C", repoRoot, "worktree", "remove", "--force", dir]);
	}
}

export interface BranchState { exists: boolean; merged: boolean }

/**
 * Whether the goal's branch still exists and whether its work is merged into the default branch.
 * A branch whose tip is still the goal's base commit has no work yet, so it is not "merged".
 * Squash and rebase merges leave the tip outside the default branch: they show up only once the branch is deleted.
 */
export async function branchState(exec: Exec, repoRoot: string, branch: string, baseCommit: string): Promise<BranchState> {
	const git = (...args: string[]) => exec("git", ["-C", repoRoot, ...args]);
	const tip = await git("rev-parse", "--verify", "--quiet", `refs/heads/${branch}^{commit}`);
	if (tip.code !== 0) return { exists: false, merged: false };
	const tipSha = tip.stdout.trim();
	const base = baseCommit ? await git("rev-parse", "--verify", "--quiet", `${baseCommit}^{commit}`) : undefined;
	if (base?.code === 0 && base.stdout.trim() === tipSha) return { exists: true, merged: false };
	const head = await git("symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD");
	const candidates = [...(head.code === 0 ? [head.stdout.trim()] : []), "main", "master"].filter((c) => c !== branch);
	for (const target of candidates) {
		if ((await git("rev-parse", "--verify", "--quiet", target)).code !== 0) continue;
		return { exists: true, merged: (await git("merge-base", "--is-ancestor", tipSha, target)).code === 0 };
	}
	return { exists: true, merged: false };
}

/** True for a path inside a goals directory of the todo store. The agent may reach those only through goal_propose. */
export function isGoalStorePath(path: string): boolean {
	return /\/agent-skills\/todos\/[^/]+\/goals(\/|$)/.test(resolve("/", path));
}
