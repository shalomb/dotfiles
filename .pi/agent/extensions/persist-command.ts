/**
 * /persist — write a hand-off document for the current directory, so a new session can resume.
 *   /persist [note]     collect the facts (directory, repo, branch, upstream, worktrees, recent
 *                       branches, working tree, stash, commits, pi session, backlog claims), write
 *                       them, then ask the agent to write the narrative (goal, done, decisions,
 *                       open questions, next steps). The note is kept in the document.
 *   /persist facts      the facts only; no agent turn
 *   /persist resume     hand the newest hand-off for this directory to the agent
 *   /persist list       show the newest hand-offs for this directory
 * Hand-offs live outside the repo, beside the todo-navigator shadow backlog and with its slug:
 * ${XDG_CACHE_HOME:-~/.cache}/agent-skills/handoffs/<repo_slug>/<YYYYMMDD-HHMMSS>-<session8>.md.
 * Session values are the ones pi exports to bash ($PI_SESSION_ID, $PI_SESSION_FILE, $PI_PROVIDER,
 * $PI_MODEL, $PI_REASONING_LEVEL); a $PI_SESSION_ID already in pi's own environment is the parent session.
 * Pure logic + tests: _lib/persist.ts, _lib/persist.test.ts.
 *
 * Load location: ~/.pi/agent/extensions/persist-command.ts (global)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ownerFor } from "./_lib/backlog.ts";
import {
	BRANCH_FORMAT, type Facts, HANDOFF_FILE, NARRATIVE_MARK, type Session, type Worktree,
	handoffDir, handoffName, parseBranches, parseWorktrees, renderHandoff, repoSlug,
} from "./_lib/persist.ts";

const MAX_WORKTREE_STATUS = 10;

export default function (pi: ExtensionAPI) {
	const run = async (cmd: string, args: string[], cwd: string): Promise<string | undefined> => {
		const r = await pi.exec(cmd, args, { cwd, timeout: 5000 });
		return r.code === 0 ? r.stdout.replace(/\s+$/, "") : undefined;
	};
	const git = (cwd: string, ...args: string[]) => run("git", ["-C", cwd, ...args], cwd);
	const lines = (s: string | undefined) => (s ? s.split("\n").filter((l) => l.trim()) : []);

	const sessionOf = (ctx: any): Session => {
		const env = process.env;
		const id = ctx.sessionManager.getSessionId() || env.PI_SESSION_ID || "";
		return {
			id,
			file: ctx.sessionManager.getSessionFile() ?? env.PI_SESSION_FILE,
			provider: ctx.model?.provider ?? env.PI_PROVIDER,
			model: ctx.model?.id ?? env.PI_MODEL,
			thinking: pi.getThinkingLevel?.() ?? env.PI_REASONING_LEVEL,
			parentId: env.PI_SESSION_ID && env.PI_SESSION_ID !== id ? env.PI_SESSION_ID : undefined,
		};
	};

	const collect = async (ctx: any, note?: string): Promise<Facts> => {
		const cwd: string = ctx.cwd;
		const session = sessionOf(ctx);
		const root = await git(cwd, "rev-parse", "--show-toplevel");
		const facts: Facts = { at: new Date(), cwd, root, worktrees: [], branches: [], status: [], stash: [], commits: [], session, note };
		if (!root) return facts;

		const [branch, upstream, head, wt, refs, status, stash, commits] = await Promise.all([
			git(root, "symbolic-ref", "--short", "-q", "HEAD"),
			git(root, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"),
			git(root, "log", "-1", "--format=%h %s"),
			git(root, "worktree", "list", "--porcelain"),
			git(root, "for-each-ref", "--sort=-committerdate", "--count=10", `--format=${BRANCH_FORMAT}`, "refs/heads"),
			git(root, "status", "--short"),
			git(root, "stash", "list", "-n", "5", "--format=%gd %cr %s"),
			git(root, "log", "--oneline", "-10"),
		]);
		Object.assign(facts, {
			branch, upstream, head,
			branches: parseBranches(refs ?? ""),
			status: lines(status), stash: lines(stash), commits: lines(commits),
		});
		if (upstream) {
			const counts = await git(root, "rev-list", "--left-right", "--count", "@{u}...HEAD");
			const [behind, ahead] = (counts ?? "").split(/\s+/);
			if (ahead !== undefined) facts.aheadBehind = `ahead ${ahead}, behind ${behind}`;
		}
		const worktrees: Worktree[] = parseWorktrees(wt ?? "");
		const countDirty = async (w: Worktree): Promise<void> => {
			if (w.bare || w.prunable || !existsSync(w.path)) return;
			const s = await git(w.path, "status", "--porcelain");
			if (s !== undefined) w.dirty = lines(s).length;
		};
		await Promise.all(worktrees.slice(0, MAX_WORKTREE_STATUS).map(countDirty));
		facts.worktrees = worktrees;
		if (session.id) facts.backlog = await run("todo", ["brief", "--as", ownerFor(session.id)], cwd);
		return facts;
	};

	const dirFor = async (ctx: any) => {
		const root = (await git(ctx.cwd, "rev-parse", "--show-toplevel")) ?? ctx.cwd;
		return handoffDir(process.env, homedir(), repoSlug(root));
	};
	const newest = (dir: string, n: number) =>
		existsSync(dir) ? readdirSync(dir).filter((f) => HANDOFF_FILE.test(f)).sort().slice(-n).reverse() : [];
	const send = (ctx: any, message: string) =>
		ctx.isIdle() ? pi.sendUserMessage(message) : pi.sendUserMessage(message, { deliverAs: "followUp" });

	pi.registerCommand("persist", {
		description: "/persist [note] | facts | resume | list — hand-off document for this directory (branches, worktrees, pi session)",
		getArgumentCompletions: (prefix) => {
			const hits = ["facts", "resume", "list"].filter((o) => o.startsWith(prefix));
			return hits.length ? hits.map((value) => ({ value, label: value })) : null;
		},
		handler: async (args, ctx) => {
			const arg = args.trim();
			const dir = await dirFor(ctx);

			if (arg === "list") {
				const files = newest(dir, 5);
				return ctx.ui.notify(files.length ? `Hand-offs in ${dir}:\n${files.join("\n")}` : `No hand-offs for this directory (${dir}).`, "info");
			}
			if (arg === "resume") {
				const [file] = newest(dir, 1);
				if (!file) return ctx.ui.notify(`No hand-off for this directory (${dir}). /persist writes one.`, "error");
				return send(ctx,
					`Resume work from the hand-off at ${join(dir, file)}. Read it. Check its facts against the repo now ` +
					"(branch, worktree, uncommitted changes, backlog claims) and report what differs. Then summarise the goal " +
					"and the next steps in 3 to 5 lines, and continue with the next steps unless something important differs.");
			}

			const factsOnly = arg === "facts";
			const facts = await collect(ctx, factsOnly ? undefined : arg || undefined);
			mkdirSync(dir, { recursive: true });
			const path = join(dir, handoffName(facts.at, facts.session.id));
			writeFileSync(path, renderHandoff(facts));
			ctx.ui.notify(`Hand-off written: ${path}`, "info");
			if (factsOnly) return;
			send(ctx,
				`/persist: I wrote the facts of a hand-off to ${path}. Write its narrative now: replace each ` +
				`"${NARRATIVE_MARK}" under "## Narrative" (Goal, Done, Decisions, Open questions and blockers, Next steps) ` +
				"from what this session did. A new agent with no memory of this session must be able to continue from it. " +
				"Use short STE-flavored bullets; put paths, commands and ids in backticks; link specs, ADRs, issues and PRs. " +
				"Say what is verified and what is not. Do not change the other sections: the extension collected them. " +
				"Edit only that file, then reply with its path.");
		},
	});
}
