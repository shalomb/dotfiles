/**
 * Commit Hooks Guard
 *
 * Keeps the repo's own commit-time quality gates (pre-commit, husky,
 * lefthook, native git hooks, ...) in force:
 *   - blocks every way of bypassing them: --no-verify / commit -n, hook env
 *     switches (SKIP=, HUSKY=0, LEFTHOOK=0, ...), `git -c core.hooksPath=`,
 *     changing core.hooksPath, uninstalling hook frameworks
 *   - blocks agent writes to .git/hooks and to pi-gates data (gates are set by
 *     the user, so the agent cannot lower the bar)
 *   - on `git commit`, if a hook framework is configured in the repo but not
 *     installed into git, blocks ONCE per repo per session and tells the agent
 *     to ask the user whether to install it
 *
 * It never installs anything and adds no files to repos. Detection lives in
 * ./_lib/hooks-detect.ts (shared helper, not an extension).
 *
 * Not airtight: shell indirection (variables, eval, scripts) can evade the
 * pattern checks. It targets normal agent behaviour, not a determined attacker.
 *
 * Load location: ~/.pi/agent/extensions/commit-hooks-guard.ts (global)
 */

import { basename, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { detectHooks, type Exec } from "./_lib/hooks-detect.ts";
import { segmentsDeep, stripPrefixes, tokenize } from "./_lib/shell-segments.ts";

const FIX_HINT = "Fix the cause of the failing hook instead. If a hook is genuinely wrong, ask the user.";

// Env switches that disable hook runners, matched against a single NAME=value token (never against
// free text, so a commit message or heredoc that merely mentions HUSKY=0 is not a bypass). SKIP is
// pre-commit's and only counts when the script involves git/pre-commit, or is exported.
const ENV_BYPASS: Array<{ re: RegExp; label: string; gitOnly: boolean }> = [
	{ re: /^SKIP=/, label: "SKIP=", gitOnly: true },
	{ re: /^HUSKY=0$/, label: "HUSKY=0", gitOnly: false },
	{ re: /^HUSKY_SKIP_HOOKS=/, label: "HUSKY_SKIP_HOOKS", gitOnly: false },
	{ re: /^LEFTHOOK=(?:0|false)$/, label: "LEFTHOOK=0", gitOnly: false },
	{ re: /^LEFTHOOK_EXCLUDE=/, label: "LEFTHOOK_EXCLUDE", gitOnly: false },
	{ re: /^PRE_COMMIT_ALLOW_NO_CONFIG=/, label: "PRE_COMMIT_ALLOW_NO_CONFIG", gitOnly: false },
	{ re: /^SKIP_SIMPLE_GIT_HOOKS=/, label: "SKIP_SIMPLE_GIT_HOOKS", gitOnly: false },
	{ re: /^SIMPLE_GIT_HOOKS=0$/, label: "SIMPLE_GIT_HOOKS=0", gitOnly: false },
	{ re: /^OVERCOMMIT_DISABLE=/, label: "OVERCOMMIT_DISABLE", gitOnly: false },
];

// Subcommands that run hooks and accept --no-verify.
const HOOKED_SUBCOMMANDS = new Set(["commit", "push", "merge", "rebase", "am", "cherry-pick", "revert"]);

const MUTATING_WORD = /(?:^|\s)(?:tee|chmod|chown|rm|mv|cp|ln|install|touch|truncate|dd|perl|sd|sed|awk|patch)\s/;
// A real file redirect (> or >>). Excludes fd duplication like `2>&1` and writes to /dev/null.
const REDIRECT = /\d*>>?\s*(?![&>]|\/dev\/null\b)\S/;

// Command splitting, tokenizing and prefix stripping come from ./_lib/shell-segments.ts (quote-aware).

interface GitInvocation {
	sub: string;
	args: string[];
	configs: string[];
	dir?: string;
}

function parseGit(tokens: string[]): GitInvocation | undefined {
	const t = stripPrefixes(tokens);
	if (t.length === 0 || basename(t[0]) !== "git") return undefined;

	const configs: string[] = [];
	let dir: string | undefined;
	let i = 1;
	while (i < t.length && t[i].startsWith("-")) {
		const opt = t[i];
		if (opt === "-C") {
			dir = t[i + 1];
			i += 2;
		} else if (opt === "-c") {
			configs.push(t[i + 1] ?? "");
			i += 2;
		} else if (opt === "--config-env") {
			configs.push(t[i + 1] ?? "");
			i += 2;
		} else if (opt.startsWith("--config-env=")) {
			configs.push(opt.slice("--config-env=".length));
			i += 1;
		} else if (opt === "--git-dir" || opt === "--work-tree" || opt === "--namespace") {
			i += 2;
		} else {
			i += 1;
		}
	}
	const sub = t[i];
	if (!sub) return undefined;
	return { sub, args: t.slice(i + 1), configs, dir };
}

// `-n` on `git commit` means --no-verify. Scan short-flag clusters, stopping at
// flags whose argument is the rest of the cluster (-m, -F, -c, -C, -t).
function commitShortNoVerify(args: string[]): boolean {
	for (const a of args) {
		if (!/^-[A-Za-z]+$/.test(a)) continue;
		for (const ch of a.slice(1)) {
			if ("mFcCt".includes(ch)) break;
			if (ch === "n") return true;
		}
	}
	return false;
}

function findGitBypass(inv: GitInvocation): string | undefined {
	if (inv.configs.some((c) => /^core\.hookspath=/i.test(c))) {
		return "`git -c core.hooksPath=...` redirects or disables hooks";
	}

	if (HOOKED_SUBCOMMANDS.has(inv.sub) && inv.args.includes("--no-verify")) {
		return `\`git ${inv.sub} --no-verify\` skips hooks`;
	}
	if (inv.sub === "commit" && commitShortNoVerify(inv.args)) {
		return "`git commit -n` is --no-verify and skips hooks";
	}

	if (inv.sub === "config") {
		const keyIdx = inv.args.findIndex((a) => /^core\.hookspath$/i.test(a));
		if (keyIdx !== -1) {
			const unsetting = inv.args.some((a) => a === "--unset" || a === "--unset-all" || a === "--replace-all");
			const hasValue = inv.args.slice(keyIdx + 1).some((a) => !a.startsWith("-"));
			if (unsetting || hasValue) return "changing `core.hooksPath` redirects or disables hooks";
		}
	}
	return undefined;
}

function findFrameworkUninstall(tokens: string[]): string | undefined {
	const t = stripPrefixes(tokens);
	if (t.length < 2) return undefined;
	const bin = basename(t[0]);
	if ((bin === "pre-commit" || bin === "lefthook" || bin === "overcommit") && t[1].startsWith("uninstall")) {
		return `\`${bin} uninstall\` removes the repo's hooks`;
	}
	return undefined;
}

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const ENV_PREFIX_WORDS = new Set(["env", "export", "command", "builtin", "exec", "time"]);

/** NAME=value tokens that lead a segment (`SKIP=x git ...`, `env A=1 cmd`, `export A=1`), and whether it was an export. */
function leadingAssignments(tokens: string[]): { assignments: string[]; exporting: boolean } {
	const assignments: string[] = [];
	let exporting = false;
	for (const tok of tokens) {
		if (ASSIGNMENT.test(tok)) assignments.push(tok);
		else if (ENV_PREFIX_WORDS.has(tok)) exporting = exporting || tok === "export";
		else break;
	}
	return { assignments, exporting };
}

function findEnvBypass(command: string): string | undefined {
	const segments = segmentsDeep(command).map(tokenize);
	const scriptTouchesGit = segments.some((t) => {
		const real = stripPrefixes(t);
		return real.length > 0 && ["git", "pre-commit"].includes(basename(real[0]));
	});
	for (const tokens of segments) {
		const { assignments, exporting } = leadingAssignments(tokens);
		for (const assignment of assignments) {
			for (const { re, label, gitOnly } of ENV_BYPASS) {
				if (!re.test(assignment)) continue;
				if (gitOnly && !(exporting || scriptTouchesGit)) continue;
				return `${label} disables commit hooks`;
			}
		}
	}
	return undefined;
}

function isProtectedPath(path: string, cwd: string): boolean {
	const full = resolve(cwd, path);
	return /(?:^|\/)\.git\/hooks(?:\/|$)/.test(full) || basename(full) === "pi-gates.json";
}

function commandDir(command: string, inv: GitInvocation | undefined, cwd: string): string {
	if (inv?.dir) return resolve(cwd, inv.dir);
	const cd = command.match(/^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/);
	if (cd) return resolve(cwd, cd[1].replace(/^["']|["']$/g, ""));
	return cwd;
}

export default function (pi: ExtensionAPI) {
	const exec: Exec = (command, args, options) => pi.exec(command, args, options);
	// Repos already told (once) about configured-but-not-installed hooks this session.
	const notified = new Set<string>();

	const deny = (ctx: { hasUI: boolean; ui: { notify: (m: string, t: "warning") => void } }, reason: string) => {
		if (ctx.hasUI) ctx.ui.notify(reason, "warning");
		return { block: true as const, reason };
	};

	pi.on("tool_call", async (event, ctx) => {
		// --- Tamper protection for file tools ---
		if (event.toolName === "write" || event.toolName === "edit") {
			const path = String((event.input as { path?: string }).path ?? "");
			if (path && isProtectedPath(path, ctx.cwd)) {
				return deny(
					ctx,
					`Blocked: "${path}" is a git hook or gate-config file. Commit gates are managed by the user ` +
						"(via /gates or the repo's own hook framework), not edited by the agent.",
				);
			}
			return undefined;
		}

		if (event.toolName !== "bash") return undefined;
		const command = String((event.input as { command?: string }).command ?? "");
		if (!command.trim()) return undefined;

		const envBypass = findEnvBypass(command);
		if (envBypass) return deny(ctx, `Blocked: ${envBypass}. ${FIX_HINT}`);

		let commitInvocation: GitInvocation | undefined;

		for (const segment of segmentsDeep(command)) {
			const tokens = tokenize(segment);
			if (tokens.length === 0) continue;

			// Bash tamper: mutating command aimed at .git/hooks or pi-gates data.
			if (/\.git\/hooks|pi-gates\.json/.test(segment) && (MUTATING_WORD.test(` ${segment} `) || REDIRECT.test(segment))) {
				return deny(
					ctx,
					"Blocked: modifying .git/hooks or gate config from the agent. Commit gates are managed by the user " +
						"(via /gates or the repo's own hook framework).",
				);
			}

			const uninstall = findFrameworkUninstall(tokens);
			if (uninstall) return deny(ctx, `Blocked: ${uninstall}. ${FIX_HINT}`);

			const inv = parseGit(tokens);
			if (!inv) continue;

			const bypass = findGitBypass(inv);
			if (bypass) return deny(ctx, `Blocked: ${bypass}. ${FIX_HINT}`);

			if (inv.sub === "commit") commitInvocation = inv;
		}

		// --- Configured-but-not-installed hooks: tell the agent once per repo ---
		if (commitInvocation) {
			try {
				const report = await detectHooks(exec, commandDir(command, commitInvocation, ctx.cwd));
				if (report.isRepo && report.state === "configured-not-installed" && !notified.has(report.repoRoot)) {
					notified.add(report.repoRoot);
					const missing = report.frameworks.filter((f) => !f.informational && f.configured && !f.installed);
					const list = missing.map((f) => `${f.name} (${f.evidence}) -> ${f.installHint}`).join("; ");
					return deny(
						ctx,
						`Blocked (once per session): this repo configures commit hooks that are not installed in git, ` +
							`so this commit would silently skip them: ${list}. Ask the user whether to install them; ` +
							"do not install without their confirmation. After they decide, retry the commit — this notice will not repeat.",
					);
				}
			} catch {
				// Detection is best-effort; never block a commit because detection failed.
			}
		}

		return undefined;
	});
}
