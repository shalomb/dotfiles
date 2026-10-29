// Pure helpers for /persist (persist-command.ts): where hand-offs live, git output parsing,
// and the hand-off document. Tested in persist.test.ts.
// Hand-offs live outside the repo, next to the todo-navigator shadow backlog, with the same slug.

import { isAbsolute, join } from "node:path";

/** Same slug as todo-navigator's get_repo_slug(): the absolute path with separators as dashes. */
export function repoSlug(root: string): string {
	return root.replace(/^\/+|\/+$/g, "").replace(/[/\\:]/g, "-").replace(/-+/g, "-") || "default-repo";
}

export function handoffRoot(env: Record<string, string | undefined>, home: string): string {
	const xdg = env.XDG_CACHE_HOME;
	return join(xdg && isAbsolute(xdg) ? xdg : join(home, ".cache"), "agent-skills", "handoffs");
}

export function handoffDir(env: Record<string, string | undefined>, home: string, slug: string): string {
	return join(handoffRoot(env, home), slug);
}

export const HANDOFF_FILE = /^\d{8}-\d{6}-.+\.md$/;

export interface HandoffMeta {
	sessionId: string;
	created: Date;
	directory: string;
	branch?: string;
	goal: string;
	next: string;
}

/** Front matter plus the Goal and Next steps text. Sections still marked for the agent read as "". */
export function parseHandoff(text: string): HandoffMeta | undefined {
	const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
	if (!fm) return undefined;
	const meta: Record<string, string> = {};
	for (const line of fm[1].split("\n")) {
		const m = line.match(/^([a-z_]+):\s*(.*)$/);
		if (m) meta[m[1]] = m[2].trim();
	}
	if (meta.type !== "handoff") return undefined;
	const section = (title: string) => {
		const m = text.match(new RegExp(`^### ${title}\\n([\\s\\S]*?)(?=^#{1,3} |(?![\\s\\S]))`, "m"));
		const body = (m?.[1] ?? "").replace(NARRATIVE_MARK, "").trim();
		return body.replace(/\s+/g, " ");
	};
	const created = new Date(meta.created ?? "");
	return {
		sessionId: meta.pi_session_id && meta.pi_session_id !== "-" ? meta.pi_session_id : "",
		created: Number.isNaN(created.getTime()) ? new Date(0) : created,
		directory: meta.directory ?? "",
		branch: meta.branch,
		goal: section("Goal"),
		next: section("Next steps"),
	};
}

/** `20261025-143005-1a2b3c4d.md`: sorts by time; the session prefix tells parallel sessions apart. */
export function handoffName(at: Date, sessionId: string): string {
	const p = (n: number) => String(n).padStart(2, "0");
	const stamp = `${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}${p(at.getSeconds())}`;
	return `${stamp}-${sessionId.slice(0, 8) || "nosession"}.md`;
}

export interface Worktree { path: string; head: string; branch?: string; detached: boolean; bare: boolean; locked: boolean; prunable: boolean; dirty?: number }

/** Parse `git worktree list --porcelain`. */
export function parseWorktrees(porcelain: string): Worktree[] {
	const out: Worktree[] = [];
	for (const block of porcelain.trim().split(/\n\s*\n/)) {
		if (!block.trim()) continue;
		const w: Worktree = { path: "", head: "", detached: false, bare: false, locked: false, prunable: false };
		for (const line of block.split("\n")) {
			const [k, ...rest] = line.split(" ");
			const v = rest.join(" ");
			if (k === "worktree") w.path = v;
			else if (k === "HEAD") w.head = v.slice(0, 7);
			else if (k === "branch") w.branch = v.replace(/^refs\/heads\//, "");
			else if (k === "detached") w.detached = true;
			else if (k === "bare") w.bare = true;
			else if (k === "locked") w.locked = true;
			else if (k === "prunable") w.prunable = true;
		}
		if (w.path) out.push(w);
	}
	return out;
}

export interface Branch { name: string; upstream: string; track: string; date: string; sha: string; subject: string }

/** The field order of BRANCH_FORMAT, tab-separated. */
export const BRANCH_FORMAT = "%(refname:short)%09%(upstream:short)%09%(upstream:track)%09%(committerdate:short)%09%(objectname:short)%09%(subject)";

export function parseBranches(out: string): Branch[] {
	return out.split("\n").filter((l) => l.trim()).map((l) => {
		const [name = "", upstream = "", track = "", date = "", sha = "", ...subject] = l.split("\t");
		return { name, upstream, track, date, sha, subject: subject.join("\t") };
	});
}

export interface Session { id: string; file?: string; provider?: string; model?: string; thinking?: string; parentId?: string }

export interface Facts {
	at: Date;
	cwd: string;
	root?: string;
	branch?: string;
	upstream?: string;
	aheadBehind?: string;
	head?: string;
	worktrees: Worktree[];
	branches: Branch[];
	status: string[];
	stash: string[];
	commits: string[];
	backlog?: string;
	session: Session;
	note?: string;
}

const MAX_STATUS = 40;
const cell = (s: string | undefined) => (s ?? "").replace(/\|/g, "\\|") || "-";
const code = (s: string | undefined) => (s ? `\`${s}\`` : "-");
const block = (lines: string[], empty: string) => (lines.length ? ["```", ...lines, "```"] : [empty]);

export const NARRATIVE_MARK = "_(to be written by the agent)_";

export function renderHandoff(f: Facts): string {
	const name = (f.root ?? f.cwd).split("/").pop();
	const where = f.branch ? `${name} (${f.branch})` : name;
	const s = f.session;
	const L: string[] = [
		"---",
		"type: handoff",
		`created: ${f.at.toISOString()}`,
		`directory: ${f.cwd}`,
		...(f.root ? [`repo_root: ${f.root}`] : []),
		...(f.branch ? [`branch: ${f.branch}`] : []),
		`pi_session_id: ${s.id || "-"}`,
		...(s.file ? [`pi_session_file: ${s.file}`] : []),
		...(s.parentId ? [`pi_parent_session_id: ${s.parentId}`] : []),
		"---",
		"",
		`# Hand-off: ${where}`,
		"",
		`> Written ${f.at.toISOString().replace("T", " ").slice(0, 16)} UTC by pi session \`${s.id.slice(0, 8) || "-"}\`.`,
		"> To resume: run `/persist resume` in a new pi session in this directory, or read this file.",
		...(s.id ? [`> To reopen the old session: \`pi --session ${s.id}\`. To branch from it: \`pi --fork ${s.id}\`.`] : []),
		"",
	];
	if (f.note?.trim()) L.push("## Note from the user", "", f.note.trim(), "");

	L.push(
		"## Narrative",
		"",
		"### Goal", "", NARRATIVE_MARK, "",
		"### Done", "", NARRATIVE_MARK, "",
		"### Decisions", "", NARRATIVE_MARK, "",
		"### Open questions and blockers", "", NARRATIVE_MARK, "",
		"### Next steps", "", NARRATIVE_MARK, "",
		"## Where",
		"",
		"| Item | Value |",
		"| :--- | :--- |",
		`| Directory | ${code(f.cwd)} |`,
		`| Repo root | ${code(f.root)} |`,
		`| Branch | ${code(f.branch ?? (f.root ? "(detached)" : undefined))} |`,
		`| Upstream | ${f.upstream ? `${code(f.upstream)} ${cell(f.aheadBehind)}` : "-"} |`,
		`| HEAD | ${cell(f.head)} |`,
		`| pi session | ${code(s.id)} |`,
		`| Session file | ${code(s.file)} |`,
		`| Model | ${s.provider || s.model ? code([s.provider, s.model].filter(Boolean).join("/")) : "-"}${s.thinking ? ` (thinking: ${s.thinking})` : ""} |`,
		"",
	);

	if (f.worktrees.length) {
		L.push("## Worktrees", "", "| | Path | Branch | HEAD | Uncommitted |", "| :-: | :--- | :--- | :--- | :-: |");
		for (const w of f.worktrees) {
			const here = f.root && w.path === f.root ? "▶" : "";
			const branch = w.bare ? "(bare)" : w.detached ? "(detached)" : w.branch;
			const flags = [w.locked && "locked", w.prunable && "prunable"].filter(Boolean).join(", ");
			L.push(`| ${here} | ${code(w.path)} | ${code(branch)}${flags ? ` ${flags}` : ""} | ${code(w.head)} | ${w.dirty ?? "-"} |`);
		}
		L.push("");
	}
	if (f.branches.length) {
		L.push("## Recent branches", "", "| Branch | Upstream | Last commit | Subject |", "| :--- | :--- | :--- | :--- |");
		for (const b of f.branches)
			L.push(`| ${code(b.name)}${b.name === f.branch ? " ▶" : ""} | ${b.upstream ? `${code(b.upstream)} ${cell(b.track)}` : "-"} | ${b.date} ${code(b.sha)} | ${cell(b.subject)} |`);
		L.push("");
	}
	if (f.root) {
		const shown = f.status.slice(0, MAX_STATUS);
		const more = f.status.length - shown.length;
		L.push("## Working tree", "", ...block(more > 0 ? [...shown, `… ${more} more`] : shown, "Clean."), "");
		L.push("## Stash", "", ...block(f.stash, "Empty."), "");
		L.push("## Recent commits", "", ...block(f.commits, "None."), "");
	}
	if (f.backlog) L.push("## Backlog", "", f.backlog, "");
	return `${L.join("\n").replace(/\n+$/, "")}\n`;
}
