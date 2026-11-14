/** Resume target resolution for pi-find (ADR-016): a session resumes in a worktree, never at the repo top level. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { Row } from "./registry";

export interface Worktree { path: string; branch: string | null }
export type ResumeSession = Pick<Row, "id" | "cwd" | "repo" | "worktree" | "worktree_path" | "branch" | "profile">;
export type ResumeTarget =
	| { kind: "worktree"; path: string }
	| { kind: "pick"; candidates: Worktree[] }
	| { kind: "create"; repo: string; suggestedName: string };
export interface ResumeDeps { listWorktrees(repoRoot: string): Worktree[]; exists(path: string): boolean }
export interface ResumeCommand { cwd: string; env: Record<string, string>; argv: string[] }

/** Parse `git worktree list --porcelain`. The first entry is the main working tree (the repo top level). */
export function parseWorktreeList(porcelain: string): Worktree[] {
	const out: Worktree[] = [];
	for (const block of porcelain.split(/\n\n+/)) {
		let path: string | null = null;
		let branch: string | null = null;
		let bare = false;
		for (const line of block.split("\n")) {
			if (line.startsWith("worktree ")) path = line.slice("worktree ".length);
			else if (line.startsWith("branch ")) branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
			else if (line === "bare") bare = true;
		}
		if (path) out.push(bare ? { path, branch: null } : { path, branch });
	}
	return out;
}

export function gitListWorktrees(repoRoot: string): Worktree[] {
	const r = spawnSync("git", ["-C", repoRoot, "worktree", "list", "--porcelain"], { encoding: "utf8" });
	return r.status === 0 ? parseWorktreeList(r.stdout) : [];
}

export const defaultResumeDeps: ResumeDeps = { listWorktrees: gitListWorktrees, exists: existsSync };

const norm = (p: string): string => resolve(p);
const inside = (p: string, root: string): boolean => p === root || p.startsWith(root + sep);

function suggestName(s: ResumeSession): string {
	const raw = s.worktree ?? s.branch ?? `pi-${s.id.slice(0, 8)}`;
	return raw.replace(/^refs\/heads\//, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || `pi-${s.id.slice(0, 8)}`;
}

/** Never returns the repo top level as a target. The top level is the first entry of `git worktree list`. */
export function resolveTargetWorktree(session: ResumeSession, deps: ResumeDeps = defaultResumeDeps): ResumeTarget {
	const all = deps.listWorktrees(session.repo);
	const main = all.length ? norm(all[0].path) : norm(session.repo);
	const linked = all.slice(1).filter((w) => norm(w.path) !== main && deps.exists(w.path));

	const wanted = session.worktree_path ? norm(session.worktree_path) : null;
	const original =
		(wanted && linked.find((w) => norm(w.path) === wanted)) ||
		linked.filter((w) => inside(norm(session.cwd), norm(w.path))).sort((a, b) => b.path.length - a.path.length)[0];
	if (original) return { kind: "worktree", path: original.path };
	if (linked.length) return { kind: "pick", candidates: linked };
	return { kind: "create", repo: session.repo, suggestedName: suggestName(session) };
}

/** Agent dir for a profile: `default` is ~/.pi/agent, others ~/.pi/profiles/<name>. */
export const profileAgentDir = (profile: string | null, home: string): string =>
	!profile || profile === "default" ? join(home, ".pi/agent") : join(home, ".pi/profiles", profile);

/** profileEnv is merged over a minimal env, normally { PI_CODING_AGENT_DIR: profileAgentDir(...) }. Runs `pi --session <id>` in the worktree. */
export function resumeCommand(session: Pick<ResumeSession, "id">, target: Extract<ResumeTarget, { kind: "worktree" }>, profileEnv: Record<string, string>): ResumeCommand {
	return { cwd: target.path, env: { ...profileEnv }, argv: ["pi", "--session", session.id] };
}
