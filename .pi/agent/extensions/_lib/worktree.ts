/**
 * Pure + git logic for /worktree (spec: .pi/docs/specs/worktree-cwd/spec.md). Tested in worktree.test.ts.
 * Slice 1 (hop core): --branch and --base flags, worktree under <common root>/.worktrees, shared exclude, brief.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { splitArgs } from "./args";

export type Exec = (cmd: string, args: string[], opts?: { cwd?: string }) => Promise<{ code: number; stdout: string; stderr: string }>;

export interface Parsed { back: boolean; branch?: string; base?: string; text: string; error?: string }

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
	out.text = words.join(" ");
	if (!out.branch) out.error = "usage: /worktree --branch <type/name> [--base <ref>] <instructions>  |  /worktree back  (--branch is required until naming defaults exist)";
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
