/**
 * Pure + git logic for /worktree (spec: .pi/docs/specs/worktree-cwd/spec.md). Tested in worktree.test.ts.
 * Slice 1 (hop core): --branch and --base flags, worktree under <common root>/.worktrees, shared exclude, brief.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { splitArgs } from "./args";

export type Exec = (cmd: string, args: string[], opts?: { cwd?: string }) => Promise<{ code: number; stdout: string; stderr: string }>;

/** `target` = first word when no --branch: the command resolves it as an existing worktree; `text` is then the rest. */
export interface Parsed { back: boolean; target?: string; branch?: string; base?: string; text: string; error?: string }

export function parseWorktreeArgs(raw: string): Parsed {
	const t = splitArgs(raw);
	const out: Parsed = { back: false, text: "" };
	if (t.length === 1 && t[0] === "back") return { ...out, back: true };
	const words: string[] = [];
	for (let i = 0; i < t.length; i++) {
		if (t[i] === "--branch" || t[i] === "--base") {
			const v = t[i + 1];
			if (!v || v.startsWith("--")) return { ...out, error: `${t[i]} needs a value` };
			if (t[i] === "--branch") out.branch = v; else out.base = v;
			i++;
		} else words.push(t[i]);
	}
	if (!out.branch && words.length) { out.target = words[0]; out.text = words.slice(1).join(" "); return out; }
	out.text = words.join(" ");
	if (!out.branch) out.error = "usage: /worktree --branch <type/name> [--base <ref>] <instructions>  |  /worktree <existing path|dir|branch> [instructions]  |  /worktree back  (--branch is required until naming defaults exist)";
	return out;
}

export const dirNameFor = (branch: string) => branch.replace(/\//g, "-");

export type SetupResult =
	| { ok: true; dir: string; base: string; branch: string; status: string; commonRoot: string }
	| { ok: false; error: string };

export async function setupWorktree(exec: Exec, cwd: string, o: { branch: string; base?: string }): Promise<SetupResult> {
	const git = (args: string[]) => exec("git", args, { cwd });
	const common = await git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
	if (common.code !== 0) return { ok: false, error: `not a git repository (git: ${common.stderr.trim()})` };
	const commonDir = common.stdout.trim();
	const commonRoot = dirname(commonDir);

	// Never create a worktree in .worktrees/ before it is ignored (using-git-worktrees, Step 1).
	const ignored = await exec("git", ["check-ignore", "-q", ".worktrees/x"], { cwd: commonRoot });
	if (ignored.code !== 0) {
		mkdirSync(join(commonDir, "info"), { recursive: true });
		const f = join(commonDir, "info", "exclude");
		const cur = existsSync(f) ? readFileSync(f, "utf8") : "";
		appendFileSync(f, `${cur && !cur.endsWith("\n") ? "\n" : ""}.worktrees/\n`);
	}

	const status = (await git(["status", "--short"])).stdout.trimEnd();
	const base = o.base ?? "HEAD";
	const dir = join(commonRoot, ".worktrees", dirNameFor(o.branch));
	mkdirSync(join(commonRoot, ".worktrees"), { recursive: true });
	const add = await exec("git", ["worktree", "add", dir, "-b", o.branch, base], { cwd: commonRoot });
	if (add.code !== 0) return { ok: false, error: `git worktree add failed: ${add.stderr.trim()}` };
	return { ok: true, dir, base, branch: o.branch, status, commonRoot };
}

export function buildBrief(f: { origin: string; base: string; branch: string; parentSession?: string; status: string; text: string }): string {
	return [
		`You are now in a new git worktree. Work only here.`,
		``,
		`Origin checkout: ${f.origin}`,
		`Base: ${f.base}`,
		`Branch: ${f.branch}`,
		`Parent session: ${f.parentSession ?? "(none)"}`,
		`Origin working tree at hop time: ${f.status ? "NOT clean; these edits are not in this worktree:\n" + f.status : "clean"}`,
		``,
		`First, install what the project needs and run its fast checks (the baseline). Report the result, then do the task.`,
		``,
		`Task: ${f.text || "(none given)"}`,
	].join("\n");
}

export type FindResult = { ok: true; dir: string; branch: string } | { ok: false; error: string };

/** Resolve an existing worktree by path (relative to cwd or common root), dir name, or branch. */
export async function findWorktree(exec: Exec, cwd: string, target: string): Promise<FindResult> {
	const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd });
	if (common.code !== 0) return { ok: false, error: `not a git repository (git: ${common.stderr.trim()})` };
	const commonRoot = dirname(common.stdout.trim());
	const list = await exec("git", ["worktree", "list", "--porcelain"], { cwd });
	const wts: { dir: string; branch: string }[] = [];
	for (const block of list.stdout.split(/\n\n+/)) {
		const dir = /^worktree (.+)$/m.exec(block)?.[1];
		if (!dir) continue;
		wts.push({ dir, branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? "(detached)" });
	}
	const t = target.replace(/\/+$/, "");
	const paths = new Set([resolve(cwd, t), resolve(commonRoot, t), resolve(commonRoot, ".worktrees", t)]);
	const hit = wts.find((w) => paths.has(w.dir)) ?? wts.find((w) => w.branch === t || basename(w.dir) === t);
	if (hit) return { ok: true, ...hit };
	return { ok: false, error: `no worktree matches "${target}". Known:\n${wts.map((w) => `  ${w.dir} [${w.branch}]`).join("\n")}` };
}
