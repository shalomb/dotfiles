// File and git side of /goal (goal-command.ts): load/save goals, run done-checks, branch state.
// Everything takes its paths and its exec function as arguments, so tests use temp dirs. Tested in goal-io.test.ts.

import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { type Goal, branchSlug, goalPath, goalsDir, parseGoal, renderGoal, storeDir, validateGoal } from "./goal.ts";

export type Exec = (cmd: string, args: string[], opts?: { cwd?: string; timeout?: number }) => Promise<{ code: number; stdout: string; stderr: string; killed?: boolean }>;

const CHECK_TIMEOUT_MS = 600_000;
const OUTPUT_TAIL_LINES = 40;

/**
 * The goal in the file that `branch` maps to, whichever branch it records (feat/x and feat-x share a file),
 * or undefined when there is no file. An existing file that cannot be parsed throws:
 * "no goal" must never be reported for a file that is there, or /goal <outcome> could overwrite a locked goal.
 */
export function loadGoalFile(store: string, branch: string): Goal | undefined {
	const path = goalPath(store, branch);
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch (e: any) {
		if (e?.code === "ENOENT") return undefined;
		throw new Error(`Goal file ${path} cannot be read: ${e?.message ?? e}`);
	}
	const g = parseGoal(text);
	if (!g) throw new Error(`Goal file ${path} cannot be parsed. Fix or remove it by hand; /goal will not overwrite it.`);
	return g;
}

/** The goal of `branch`: the file's goal when it records this branch, else undefined. */
export function loadGoal(store: string, branch: string): Goal | undefined {
	const g = loadGoalFile(store, branch);
	return g?.branch === branch ? g : undefined;
}

/** Every goal file in the store that parses, whatever its branch. */
export function listGoals(store: string): Goal[] {
	const dir = goalsDir(store);
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith(".md"))
		.flatMap((f) => {
			try {
				return parseGoal(readFileSync(join(dir, f), "utf8")) ?? [];
			} catch {
				return [];
			}
		});
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

/**
 * Run each command with `bash -c` in `cwd`, in order. Stop at the first non-zero exit. Exit 0 means every command passed.
 * A killed (timed-out) command reports code 0 in pi's exec, so `killed` is checked first: exit is then undefined.
 */
export async function runChecks(exec: Exec, commands: string[], cwd: string): Promise<CheckRun> {
	if (!commands.length) return { exit: undefined, output: "No commands to run: an empty check is never green." };
	let output = "";
	for (const command of commands) {
		const r = await exec("bash", ["-c", command], { cwd, timeout: CHECK_TIMEOUT_MS });
		output += `$ ${command}\n${r.stdout}${r.stderr}`;
		if (r.killed) return { exit: undefined, output: tail(`${output}\n(command killed or timed out; the check did not finish)`) };
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
	const git = (...args: string[]) => exec("git", ["-C", repoRoot, ...args]);
	let added: Awaited<ReturnType<Exec>>;
	try {
		added = await git("worktree", "add", "--detach", "--force", dir, commit);
	} catch (e) {
		added = { code: 1, stdout: "", stderr: e instanceof Error ? e.message : String(e) };
	}
	if (added.code !== 0) {
		await removeWorktree(git, dir);
		return { exit: undefined, output: `git worktree add failed at ${commit}: ${added.stderr.trim()}` };
	}
	try {
		return await runChecks(exec, commands, dir);
	} finally {
		await removeWorktree(git, dir);
	}
}

/** Remove the temporary worktree. If git cannot, prune its record and delete the directory. Never throws: it must not mask the check result. */
async function removeWorktree(git: (...args: string[]) => ReturnType<Exec>, dir: string): Promise<void> {
	try {
		if ((await git("worktree", "remove", "--force", dir)).code === 0) return;
	} catch { /* fall back below */ }
	try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
	try { await git("worktree", "prune"); } catch { /* best effort */ }
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

// ---- events (ADR-009 Amendment 1) ----

export type GoalEventName = "goal_locked" | "goal_unlocked" | "goal_changed" | "goal_closed" | "goal_dropped" | "goal_started";
export interface GoalEvent { at: string; event: GoalEventName; goal: string; branch: string; [extra: string]: unknown }

/** Append one JSON line to `<store>/trajectories.jsonl` (kept for the H5 review of drop and assertion-closure rates). */
export function appendGoalEvent(store: string, e: GoalEvent): void {
	mkdirSync(store, { recursive: true });
	appendFileSync(join(store, "trajectories.jsonl"), `${JSON.stringify(e)}\n`);
}

// ---- tamper evidence (ADR-010): the hash of the approved done-check on a private ref ----

/** The private ref that holds the approved done-check hash of a branch's goal; never pushed (outside refs/heads and refs/tags). */
export const goalRefName = (branch: string): string => `refs/goals/${branchSlug(branch)}`;

/**
 * hash-object -> mktree -> commit-tree -> update-ref, so the working tree, the index and the branches stay untouched.
 * Positional args: repo root, ref, file name in the tree, file content, commit message. The new commit sits on top of the ref's old tip, if any.
 */
const RECORD_SCRIPT = `set -e
root=$1 ref=$2 name=$3 content=$4 msg=$5
blob=$(printf '%s\\n' "$content" | git -C "$root" hash-object -w --stdin)
tree=$(printf '100644 blob %s\\t%s\\n' "$blob" "$name" | git -C "$root" mktree)
old=$(git -C "$root" rev-parse --verify --quiet "$ref^{commit}" || true)
if [ -n "$old" ]; then
  commit=$(git -C "$root" commit-tree "$tree" -p "$old" -m "$msg")
  git -C "$root" update-ref -m "$msg" "$ref" "$commit" "$old"
else
  commit=$(git -C "$root" commit-tree "$tree" -m "$msg")
  git -C "$root" update-ref -m "$msg" "$ref" "$commit"
fi`;

async function recordOnRef(exec: Exec, root: string, branch: string, name: string, content: string, message: string): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		const r = await exec("bash", ["-c", RECORD_SCRIPT, "goal-ref", root, goalRefName(branch), name, content, message]);
		return r.code === 0 ? { ok: true } : { ok: false, error: (r.stderr || r.stdout).trim() || `git exited ${r.code}` };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

/** Commit `hash` to the goal's private ref in the repo's common git dir. Never throws. */
export const recordCheckHash = (exec: Exec, root: string, branch: string, hash: string, message: string) => recordOnRef(exec, root, branch, "check.sha256", hash, message);

/** Commit a tombstone (a tree with `status` only, no check hash) when the goal is closed or dropped, so an old hash cannot vouch for a later file. Never throws. */
export const recordTombstone = (exec: Exec, root: string, branch: string, status: "closed" | "dropped", message: string) => recordOnRef(exec, root, branch, "status", status, message);

export type RecordedHash = { kind: "none" } | { kind: "hash"; hash: string } | { kind: "tombstone"; status: string } | { kind: "error"; error: string };

/** The tip of the goal's private ref: its hash, a tombstone (closed or dropped), none when the ref does not exist, error when it exists but cannot be read. */
export async function readRecordedHash(exec: Exec, root: string, branch: string): Promise<RecordedHash> {
	const ref = goalRefName(branch);
	try {
		const tip = await exec("git", ["-C", root, "rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
		if (tip.code !== 0) return { kind: "none" };
		const blob = await exec("git", ["-C", root, "cat-file", "blob", `${ref}:check.sha256`]);
		if (blob.code === 0) return { kind: "hash", hash: blob.stdout.trim() };
		const status = await exec("git", ["-C", root, "cat-file", "blob", `${ref}:status`]);
		if (status.code === 0) return { kind: "tombstone", status: status.stdout.trim() };
		return { kind: "error", error: `${ref} has neither check.sha256 nor status at its tip` };
	} catch (e) {
		return { kind: "error", error: e instanceof Error ? e.message : String(e) };
	}
}

/** True for a path inside a goals directory of the todo store. The agent may reach those only through goal_propose. */
export function isGoalStorePath(path: string): boolean {
	return /\/agent-skills\/todos\/[^/]+\/goals(\/|$)/.test(resolve("/", path));
}

const GOAL_STORE_IN_COMMAND = /agent-skills\/todos\/[^\s'"]*\/goals\b/;
/** The private ref of ADR-010: any command or path naming it is blocked for the agent, reads included. */
const GOAL_REF = /refs\/goals\//;
const SHELL_WRITE = /(?:^|[\s;&|])(?:tee|sed\s+-\S*i|mv|cp|rm|truncate|install|dd|perl\s+-\S*i|python3?|node|bun)\b|>/;

/**
 * True when an agent tool call would write the goal store behind /goal's back. Best effort for bash:
 * a command that names a goals directory and contains a write verb or redirect. The rule is
 * "only /goal handlers and goal_propose write goal files"; this guard catches the direct routes.
 */
export function agentWouldWriteGoalStore(toolName: string, input: { path?: string; command?: string }): boolean {
	if (toolName === "write" || toolName === "edit") return isGoalStorePath(String(input.path ?? "")) || GOAL_REF.test(String(input.path ?? ""));
	if (toolName === "bash") {
		const command = String(input.command ?? "");
		return GOAL_REF.test(command) || (GOAL_STORE_IN_COMMAND.test(command) && SHELL_WRITE.test(command));
	}
	return false;
}

export interface RepoContext { root: string; branch: string | undefined; head: string; store: string }

/** Where /goal works: this checkout's root, branch (undefined when detached), HEAD, and the shared store. */
export async function resolveRepo(exec: Exec, cwd: string, env: Record<string, string | undefined>, home: string): Promise<RepoContext | undefined> {
	const git = async (...args: string[]) => {
		const r = await exec("git", ["-C", cwd, ...args]);
		return r.code === 0 ? r.stdout.trim() : undefined;
	};
	const [root, common, head, branch] = await Promise.all([
		git("rev-parse", "--show-toplevel"),
		git("rev-parse", "--path-format=absolute", "--git-common-dir"),
		git("rev-parse", "--short", "HEAD"),
		git("symbolic-ref", "--short", "-q", "HEAD"),
	]);
	if (!root || !common) return undefined;
	return { root, branch: branch || undefined, head: head ?? "", store: storeDir(env, home, realpathSync(common)) };
}
