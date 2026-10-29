/**
 * /help — categorised reference in a tmux popup, paged with $PAGER (default `less -R`).
 * Sections: built-in + extension slash commands, repo-local skills, global skills, `todo status` for cwd.
 * No agent turn. Rendering/categories: _lib/help.ts (tested). Needs tmux; falls back to a notify otherwise.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { renderHelp, stripAnsi, type Entry } from "./_lib/help";
import { discoverRepoSkills, parseFrontmatter } from "./_lib/repo-skills";

// pi does not export its built-in command table to extensions; mirror of BUILTIN_SLASH_COMMANDS (pi 1.4).
const BUILTINS: Entry[] = [
	["settings", "Open settings menu"], ["model", "Select model"], ["tree", "Navigate session tree"],
	["thinking", "Set thinking level"], ["scoped-models", "Enable/disable models for Ctrl+P cycling"],
	["export", "Export session"], ["import", "Import a session from JSONL"], ["share", "Share session"],
	["bug", "Report a bug"], ["copy", "Copy last agent message"], ["name", "Set session name"],
	["session", "Session info and stats"], ["changelog", "Show changelog"], ["hotkeys", "Keyboard shortcuts"],
	["fork", "Fork from a previous message"], ["clone", "Duplicate session at this position"],
	["trust", "Save project trust decision"], ["login", "Provider authentication"], ["logout", "Remove authentication"],
	["new", "New session"], ["compact", "Compact context"], ["resume", "Resume another session"],
	["reload", "Reload extensions, skills, prompts, themes"], ["quit", "Quit"],
].map(([name, description]) => ({ name, description }));

const globalSkills = (): Entry[] => {
	const dir = join(homedir(), ".pi", "agent", "skills");
	const out: Entry[] = [];
	for (const n of readdirSync(dir).sort()) {
		try {
			const fm = parseFrontmatter(readFileSync(join(dir, n, "SKILL.md"), "utf8"));
			out.push({ name: fm.name || n, description: fm.description });
		} catch { /* not a skill dir */ }
	}
	return out;
};

export default function (pi: ExtensionAPI) {
	pi.registerCommand("help", {
		description: "Categorised help (commands, skills, todo) in a tmux popup, paged with $PAGER",
		handler: async (_args: string, ctx: any) => {
			if (!process.env.TMUX) return ctx.ui.notify("/help needs a tmux session (popup).", "error");
			const todo = await pi.exec("todo", ["status"], { cwd: ctx.cwd, timeout: 5000 } as any).catch(() => undefined);
			const text = renderHelp({
				builtins: BUILTINS,
				commands: pi.getCommands().map((c: any) => ({ name: c.name, description: c.description, source: c.source })),
				globalSkills: globalSkills(),
				repoSkills: discoverRepoSkills(ctx.cwd, homedir()).map((s) => ({ name: s.name, description: s.description, source: s.source })),
				todo: todo && todo.code === 0 ? stripAnsi(todo.stdout).trimEnd().split("\n").map((l) => "  " + l).join("\n") : "",
				cwd: ctx.cwd,
			});
			const dir = mkdtempSync(join(tmpdir(), "pi-help-"));
			const file = join(dir, "help.txt");
			try {
				writeFileSync(file, text);
				const pager = process.env.PAGER?.trim() || "less -R";
				const cmd = /less/.test(pager) && !/\s-\S*R/.test(pager) ? `${pager} -R` : pager;
				const res = await pi.exec("tmux", ["display-popup", "-E", "-d", ctx.cwd, "-w", "90%", "-h", "90%", "-T", " pi help ", `${cmd} ${JSON.stringify(file)}`]);
				if (res.code !== 0) ctx.ui.notify(`/help popup failed (${res.code}): ${res.stderr.trim()}`, "error");
			} finally { rmSync(dir, { recursive: true, force: true }); }
		},
	});
}
