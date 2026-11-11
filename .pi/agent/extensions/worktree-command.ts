/**
 * /worktree --branch <type/name> [--base <ref>] <instructions> — make a git worktree under
 * <repo>/.worktrees and move this pi session into it (new session, header cwd = worktree).
 * Spec: .pi/docs/specs/worktree-cwd/spec.md. Logic and tests: _lib/worktree.ts.
 * Order matters: the Brief is appended as a user message BEFORE switchSession(); pi writes the
 * session file only once a message exists, and without a file open() falls back to process.cwd().
 * `/worktree <existing path|dir|branch> [instructions]` hops into that worktree; `back` returns to the parent session.
 * `back`, naming defaults and the extra guards are separate tickets (wt-back, wt-naming, wt-guards).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { notShownNote, openPopup } from "./_lib/ui-gate.ts";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { addWorktreeForBranch, buildBrief, findWorktree, searchCandidates, parseWorktreeArgs, setupWorktree } from "./_lib/worktree";

const PICKER = join(dirname(fileURLToPath(import.meta.url)), "_lib", "worktree-picker.sh");
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export default function (pi: ExtensionAPI) {
	pi.registerCommand("worktree", {
		description: "Hop into a worktree: --branch <type/name> [--base <ref>] <instructions> (new) | <existing path|dir|branch> [instructions] | back | switch|find <instructions>",
		handler: async (args: string, ctx: any) => {
			let p = parseWorktreeArgs(args);
			if (!args.trim()) {
				// No args: pick an existing worktree with fzf (tmux popup), falling back to pi's select list.
				const list = await pi.exec("git", ["worktree", "list", "--porcelain"], { cwd: ctx.cwd } as any);
				if (list.code !== 0) return ctx.ui.notify(`/worktree: not a git repository (${list.stderr.trim()})`, "error");
				const wts: { dir: string; label: string }[] = [];
				for (const block of list.stdout.split(/\n\n+/)) {
					const dir = /^worktree (.+)$/m.exec(block)?.[1];
					if (!dir || dir === ctx.cwd) continue;
					const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? "(detached)";
					wts.push({ dir, label: `${branch}  ${dir}` });
				}
				if (!wts.length) return ctx.ui.notify("/worktree: no other worktrees. Create one with --branch <type/name>", "warning");
				let dir: string | undefined;
				if (process.env.TMUX) {
					const tmp = mkdtempSync(join(tmpdir(), "worktree-picker-"));
					const rows = join(tmp, "rows.tsv"), out = join(tmp, "out.txt");
					writeFileSync(rows, wts.map((w) => `${w.dir}\t${w.label}`).join("\n") + "\n");
					const shown = await openPopup(pi.exec.bind(pi) as any, { name: "/worktree (⏎=hop)", cwd: ctx.cwd, width: "90%", height: "80%", argv: ["sh", "-c", `bash ${q(PICKER)} ${q(rows)} ${q(out)}`] }, process.env, ctx.hasUI !== false);
					if (shown.status !== "shown") ctx.ui.notify(notShownNote(shown, "/worktree"), "info");
					try { dir = readFileSync(out, "utf8").trim() || undefined; } catch {}
					rmSync(tmp, { recursive: true, force: true });
				} else {
					const c: string | undefined = await ctx.ui.select("/worktree: pick a worktree", wts.map((w) => w.label));
					dir = wts.find((w) => w.label === c)?.dir;
				}
				if (!dir) return ctx.ui.notify("/worktree: nothing selected", "info");
				p = { back: false, target: dir, text: "" };
			}
			if (p.back) {
				const parent: string | undefined = ctx.sessionManager.getHeader?.()?.parentSession;
				if (!parent || !existsSync(parent)) return ctx.ui.notify("/worktree back: this session has no parent session to return to", "error");
				const res = await ctx.switchSession(parent, { withSession: async (c: any) => c.ui.notify(`/worktree: back in ${c.cwd}`, "info") });
				if (res.cancelled) ctx.ui.notify("/worktree back: switch cancelled", "error");
				return;
			}
			if (p.error && !p.target) return ctx.ui.notify(p.error, "error");
			const origin: string = ctx.cwd;
			const exec = (cmd: string, a: string[], o: unknown) => pi.exec(cmd, a, o as any) as any;
			let r: any;
			if (p.search) {
				const found = await searchCandidates(exec, origin, p.text);
				if (!Array.isArray(found)) return ctx.ui.notify(`/worktree: ${found.error}`, "error");
				if (!found.length) return ctx.ui.notify(`/worktree: nothing matches "${p.text}" (worktrees, branches, open PRs)`, "warning");
				let pick = found[0];
				if (found.length > 1) {
					const choice: string | undefined = await ctx.ui.select(`/worktree: ${found.length} candidates for "${p.text}"`, found.map((c) => c.label));
					if (!choice) return ctx.ui.notify("/worktree: selection cancelled", "info");
					pick = found.find((c) => c.label === choice)!;
				}
				if (pick.dir) r = { ok: true, dir: pick.dir, base: "(existing worktree)", branch: pick.branch, status: "" };
				else {
					r = await addWorktreeForBranch(exec, origin, pick.branch);
					if (!r.ok) return ctx.ui.notify(`/worktree: ${r.error}`, "error");
				}
				p.text = "";
			}
			if (!r && p.target) {
				const f = await findWorktree(exec, origin, p.target);
				if (!f.ok) return ctx.ui.notify(`/worktree: ${f.error}\n(to create a new worktree use --branch <type/name>)`, "error");
				r = { ok: true, dir: f.dir, base: "(existing worktree)", branch: f.branch, status: "" };
			}
			if (!r && !p.branch) return ctx.ui.notify(p.error ?? "usage: /worktree --branch <name> <instructions>", "error");

			if (!r) r = await setupWorktree(exec, origin, { branch: p.branch!, base: p.base });
			if (!r.ok) return ctx.ui.notify(`/worktree: ${r.error}`, "error");
			if (r.status) ctx.ui.notify(`/worktree: origin has uncommitted changes; they are not in the worktree:\n${r.status}`, "warning");

			const parentSession: string | undefined = ctx.sessionManager.getSessionFile();
			const sm = SessionManager.create(r.dir, ctx.sessionManager.getSessionDir(), { parentSession });
			const brief = buildBrief({ origin, base: r.base, branch: r.branch, parentSession, status: r.status, text: p.text });
			sm.appendMessage({ role: "user", content: [{ type: "text", text: brief }], timestamp: Date.now() });
			const file = sm.getSessionFile();
			if (!file) return ctx.ui.notify("/worktree: could not create a session file", "error");

			const res = await ctx.switchSession(file, {
				withSession: async (c: any) => {
					c.ui.notify(`/worktree: now in ${c.cwd} on ${r.branch}`, "info");
					await c.sendUserMessage(p.text || "Begin.");
				},
			});
			if (res.cancelled) ctx.ui.notify("/worktree: switch cancelled (worktree was kept)", "error");
		},
	});
}
