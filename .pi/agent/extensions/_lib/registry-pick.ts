/** fzf front end for pi-find (ADR-016): pick a session, resolve its worktree, resume in its profile. All side effects are injected. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Row } from "./registry";
import { findSessions, formatFind, parseFindArgs, runFind, type IO } from "./registry-find";
import {
	defaultResumeDeps, profileAgentDir, resolveTargetWorktree, resumeCommand,
	type ResumeCommand, type ResumeDeps, type ResumeSession, type Worktree,
} from "./registry-resume";

export const NEW_WORKTREE_LABEL = "+ create a new worktree";
const SEP = "\t";
/** Newline stand-in inside the preview field; the fzf preview command turns it back with `tr`. */
const NL = "\x1f";
const PREVIEW_COMMAND = `printf '%s' {7} | tr '\\037' '\\n'`;
export const FZF_COLUMNS = "1..6";

export interface FzfRun { status: number | null; stdout: string }
export interface FzfRunner { (args: string[], input: string): FzfRun }

export interface UseFzfInput { isTTY: boolean; json: boolean; fzfAvailable: boolean }

/** True only on a TTY, without --json, with fzf on PATH. */
export const shouldUseFzf = ({ isTTY, json, fzfAvailable }: UseFzfInput): boolean => isTTY && !json && fzfAvailable;

/** Short notice when a terminal user gets the plain table because fzf is missing; null otherwise. */
export const fzfNotice = ({ isTTY, json, fzfAvailable }: UseFzfInput): string | null =>
	isTTY && !json && !fzfAvailable ? "note: fzf not found on PATH; showing the plain table" : null;

const flat = (s: string): string => s.replace(/[\t\r\n]+/g, " ").trim();
const fit = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + "…" : s).padEnd(n);

/** Compact age: 5m, 3h, 2d, 6w. */
export function ageOf(iso: string | null, now: Date): string {
	if (!iso) return "?";
	const ms = now.getTime() - new Date(iso).getTime();
	if (!Number.isFinite(ms)) return "?";
	const m = Math.max(0, Math.floor(ms / 6e4));
	if (m < 60) return `${m}m`;
	if (m < 1440) return `${Math.floor(m / 60)}h`;
	if (m < 10080) return `${Math.floor(m / 1440)}d`;
	return `${Math.floor(m / 10080)}w`;
}

const tilde = (p: string, home: string): string => (p.startsWith(home) ? "~" + p.slice(home.length) : p);

function previewText(digest: string): string {
	const lines = digest.split("\n").map(flat).filter(Boolean);
	if (!lines.length) return "(no prompts recorded)";
	const last = lines.slice(-3);
	return [`first: ${lines[0]}`, "", "last:", ...last.map((l) => `  ${l}`)].join(NL);
}

/** One fzf line per row, in ranked order. Fields: age, status, profile, branch/worktree, cwd, prompt snippet | preview | id (last, hidden). */
export function pickerRows(rows: Row[], now: Date, home = homedir()): string[] {
	return rows.map((r) => [
		fit(ageOf(r.last_activity, now), 4),
		fit(r.status || "?", 14),
		fit(r.profile || "-", 10),
		fit(r.worktree || r.branch || "-", 20),
		fit(tilde(r.cwd, home), 30),
		flat(r.digest.split("\n")[0] ?? "").slice(0, 80),
		previewText(r.digest),
		r.id,
	].join(SEP));
}

export const fzfArgs = (header: string): string[] => [
	"--delimiter", SEP, "--with-nth", FZF_COLUMNS, "--tabstop", "1", "--no-sort", "--layout=reverse", "--height=80%",
	"--header", header, "--preview", PREVIEW_COMMAND, "--preview-window", "down,40%,wrap",
];

/** Run fzf over the rows; returns the chosen id, or null on cancel/no match. */
export function pickSession(rows: Row[], deps: { run: FzfRunner; now?: Date; home?: string }): string | null {
	if (!rows.length) return null;
	const r = deps.run(fzfArgs("enter: resume in its worktree  esc: cancel"), pickerRows(rows, deps.now ?? new Date(), deps.home).join("\n") + "\n");
	if (r.status !== 0) return null;
	const id = r.stdout.replace(/\n$/, "").split(SEP).pop() ?? "";
	return id || null;
}

export interface EnterDeps {
	run: FzfRunner;
	resume?: ResumeDeps;
	/** Ask for a worktree name; null cancels. */
	prompt: (question: string, suggestion: string) => string | null;
	/** `git worktree add`; returns the new worktree path, throws on failure. */
	createWorktree: (repo: string, name: string) => string;
	warn: (message: string) => void;
	/** Profile pi() would pick for a directory (null = unknown). Used only when the stored profile is `default`. */
	cwdProfile?: (cwd: string) => string | null;
	home?: string;
}

export interface EnterResult { command: ResumeCommand; warning?: string }

/** `default` is ambiguous: profile session dirs may be symlinks to ~/.pi/agent/sessions, so dedupe labels them all default. Resolve from cwd like pi() does. */
const profileEnv = (s: ResumeSession, home: string, deps?: Pick<EnterDeps, "cwdProfile">): Record<string, string> => {
	const stored = !s.profile || s.profile === "default";
	const profile = stored && deps?.cwdProfile ? deps.cwdProfile(s.cwd) ?? s.profile : s.profile;
	return { PI_CODING_AGENT_DIR: profileAgentDir(profile, home) };
};

/** Degrade (ADR-016): worktree creation failed, so start at the repo with a warning rather than losing the session. */
function repoFallback(s: ResumeSession, home: string, why: string, deps: EnterDeps): EnterResult {
	const warning = `${why}; resuming at the repo top level ${s.repo}`;
	deps.warn(`warning: ${warning}`);
	return { command: resumeCommand(s, { kind: "worktree", path: s.repo }, profileEnv(s, home, deps)), warning };
}

function createAndResume(s: ResumeSession, repo: string, suggested: string, home: string, deps: EnterDeps): EnterResult | null {
	const name = deps.prompt("New worktree name", suggested);
	if (name === null) return null;
	try {
		return { command: resumeCommand(s, { kind: "worktree", path: deps.createWorktree(repo, name || suggested) }, profileEnv(s, home, deps)) };
	} catch (e) {
		return repoFallback(s, home, `could not create worktree: ${(e as Error).message}`, deps);
	}
}

/** Enter on a session: resume command for its worktree, picking or creating one when the original is gone. null = cancelled. */
export function onEnter(session: ResumeSession, deps: EnterDeps): EnterResult | null {
	const home = deps.home ?? homedir();
	const target = resolveTargetWorktree(session, deps.resume ?? defaultResumeDeps);
	if (target.kind === "worktree") return { command: resumeCommand(session, target, profileEnv(session, home, deps)) };
	if (target.kind === "create") return createAndResume(session, target.repo, target.suggestedName, home, deps);

	const label = (w: Worktree) => `${w.path}${SEP}${w.branch ?? ""}`;
	const lines = [...target.candidates.map(label), NEW_WORKTREE_LABEL];
	const r = deps.run(["--delimiter", SEP, "--header", "original worktree is gone: pick one or create a new one", "--layout=reverse", "--height=40%"], lines.join("\n") + "\n");
	if (r.status !== 0) return null;
	const chosen = r.stdout.replace(/\n$/, "").split(SEP)[0];
	if (!chosen) return null;
	if (chosen === NEW_WORKTREE_LABEL) return createAndResume(session, session.repo, suggestedName(session), home, deps);
	return { command: resumeCommand(session, { kind: "worktree", path: chosen }, profileEnv(session, home, deps)) };
}

/** The name resolveTargetWorktree suggests for a new worktree (resolved against no worktrees). */
function suggestedName(s: ResumeSession): string {
	const t = resolveTargetWorktree(s, { listWorktrees: () => [], exists: () => false });
	return t.kind === "create" ? t.suggestedName : `pi-${s.id.slice(0, 8)}`;
}

export interface InteractiveDeps extends EnterDeps {
	isTTY: boolean;
	fzfAvailable: boolean;
	now?: Date;
	io: IO;
	/** Run the resume command (spawn pi in cwd with env); returns the exit code. */
	launch: (command: ResumeCommand) => number;
}

/** Whole `pi-find` run: table/JSON when piped, --json, --no-pick or fzf is missing; otherwise fzf then resume. Returns text to print and an exit code. */
export function runPicker(argv: string[], cwd: string, deps: InteractiveDeps): { output?: string; exitCode: number } {
	const { options } = parseFindArgs(argv);
	if (options.help) return { output: runFind(argv, deps.io, cwd), exitCode: 0 };
	const found = findSessions(argv, cwd);
	const state = { isTTY: deps.isTTY && !options.noPick, json: options.json, fzfAvailable: deps.fzfAvailable };
	const notice = fzfNotice(state);
	if (notice) deps.io.error(notice + "\n");
	if (!shouldUseFzf(state) || !found.rows.length) return { output: formatFind(found, deps.io), exitCode: 0 };

	if (found.note) deps.io.error(`note: ${found.note}\n`);
	const rows = found.options.all ? found.rows : found.rows.slice(0, found.options.limit ?? 500);
	const id = pickSession(rows, { run: deps.run, now: deps.now, home: deps.home });
	const row = id ? rows.find((r) => r.id === id) : undefined;
	if (!row) return { exitCode: 0 };
	const entered = onEnter(row, deps);
	return { exitCode: entered ? deps.launch(entered.command) : 0 };
}

export const spawnFzf: FzfRunner = (args, input) => {
	const r = spawnSync("fzf", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
	return { status: r.status, stdout: r.stdout ?? "" };
};

export const hasFzf = (): boolean => spawnSync("fzf", ["--version"], { stdio: "ignore" }).status === 0;

export function gitCreateWorktree(repo: string, name: string): string {
	const path = join(repo, ".worktrees", name);
	const git = (args: string[]) => spawnSync("git", ["-C", repo, "worktree", "add", ...args], { encoding: "utf8" });
	let r = git(["-b", name, path]);
	if (r.status !== 0) r = git([path, name]);
	if (r.status !== 0) throw new Error((r.stderr || "git worktree add failed").trim().split("\n").pop()!);
	return path;
}

/** Ask the shell resolver pi() uses (~/.config/bash/lib/pi/profile.sh) which profile owns a directory. */
export function shellCwdProfile(cwd: string, home = homedir()): string | null {
	const lib = join(home, ".config/bash/lib/pi/profile.sh");
	if (!existsSync(lib)) return null;
	const r = spawnSync("bash", ["-c", 'source "$1" && _pi_resolve_profile "$2"', "_", lib, cwd], { encoding: "utf8", env: { ...process.env, PI_PROFILE: "" } });
	return r.status === 0 ? r.stdout.trim() || null : null;
}

export function spawnResume(c: ResumeCommand): number {
	const r = spawnSync(c.argv[0], c.argv.slice(1), { cwd: c.cwd, env: { ...process.env, ...c.env }, stdio: "inherit" });
	return r.status ?? 1;
}
