/**
 * Pure helpers for /view and the show_file tool: parse "file[:line[:col]] [+N] [--edit]" and build the
 * editor argv for a tmux popup. No shell is involved (argv only), so spaces/quotes in paths are safe.
 * Tested in view-file.test.ts.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { splitArgs } from "./args.ts";

export type ViewTarget = { path: string; line?: number; edit: boolean };
export type ViewParse = ({ ok: true } & ViewTarget) | { ok: false; error: string };

const USAGE = "usage: /view <file>[:line] [--edit]";

function expand(p: string, cwd: string, home: string): string {
	const bare = p.startsWith("@") ? p.slice(1) : p;
	if (bare === "~" || bare.startsWith("~/")) return join(home, bare.slice(1));
	return isAbsolute(bare) ? bare : resolve(cwd, bare);
}

export function parseViewArgs(input: string, cwd: string, home: string = homedir()): ViewParse {
	let edit = false;
	let line: number | undefined;
	let raw: string | undefined;
	for (const a of splitArgs(input)) {
		if (a === "--edit" || a === "-e") edit = true;
		else if (/^\+\d+$/.test(a)) line = Number(a.slice(1));
		else raw ??= a;
	}
	if (!raw) return { ok: false, error: USAGE };
	let path = expand(raw, cwd, home);
	const m = /^(.*?):(\d+)(?::\d+)?$/.exec(path);
	// a real file literally named "x:12" wins over the file:line reading
	if (m && !existsSync(path)) {
		path = m[1];
		line = Number(m[2]);
	}
	return { ok: true, path, line, edit };
}

/** The popup editor: $PI_VIEW_EDITOR, then $VISUAL, then $EDITOR, then vi. A bare `vim` may be a shim on this host. */
export function pickEditor(env: Record<string, string | undefined> = process.env): string {
	return [env.PI_VIEW_EDITOR, env.VISUAL, env.EDITOR].find((e) => e?.trim())?.trim() ?? "vi";
}

export function viewArgv(t: ViewTarget, editor: string = pickEditor()): string[] {
	return [editor, ...(t.edit ? [] : ["-R"]), ...(t.line ? [`+${t.line}`] : []), "--", t.path];
}

/** What the agent hears after an editable popup closes: whether the human saved a change (contents before vs after). */
export function editOutcome(path: string, before: string | undefined, after: string | undefined): string {
	if (before === undefined && after !== undefined) return `edited ${path} in the editor: file created; re-read it before acting`;
	return before === after ? `edited ${path} in the editor: no changes saved` : `edited ${path} in the editor: changes saved; re-read it before acting`;
}
