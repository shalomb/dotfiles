/**
 * Gates
 *
 * `/gates` — assess a repo and, with the user's confirmation, install minimal
 * LOCAL git hooks (no repo files change). Subcommands:
 *   /gates status     what gates the repo has (frameworks, native hooks, pi-gates)
 *   /gates install    ASSESS first, then check in with the user, then write
 *   /gates uninstall  remove pi-gates hooks and config (restores any chained hook)
 *
 * Rules:
 *   - A hook framework (pre-commit, husky, ...) or native hook already in
 *     charge wins: we report it and install nothing.
 *   - Nothing is written until the user confirms an explicit summary.
 *   - Discovery is static: no repo code is executed to find test commands.
 *
 * Detection/discovery/installation live in ./_lib/ (shared helpers, not extensions).
 * commit-hooks-guard.ts stops the agent from editing the installed hooks/config.
 *
 * Load location: ~/.pi/agent/extensions/gates.ts (global)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type Exec, type HooksReport, detectHooks } from "./_lib/hooks-detect.ts";
import {
	type GatesConfig,
	gatesConfigPath,
	hooksNeeded,
	installGates,
	readGatesConfig,
	uninstallGates,
} from "./_lib/gates-install.ts";
import { type TestCandidate, discoverTestCommands } from "./_lib/test-discovery.ts";

const NONE = "(none)";
const FAST_TIMEOUT = 300;
const FULL_TIMEOUT = 1800;

function describeFrameworks(report: HooksReport): string[] {
	const lines: string[] = [];
	for (const f of report.frameworks) {
		if (!f.configured && !f.installed) continue;
		const state = f.installed ? "installed" : "configured, NOT installed";
		lines.push(`  - ${f.name}: ${state} (${f.evidence})${f.installed || f.informational ? "" : ` -> ${f.installHint}`}`);
	}
	if (report.nativeHooks.length > 0) lines.push(`  - native hooks: ${report.nativeHooks.join(", ")}`);
	return lines;
}

function label(c: TestCandidate): string {
	const desc = c.description ? ` — ${c.description}` : "";
	return `${c.command}  [${c.tier}, ${c.source}]${desc}`;
}

export default function (pi: ExtensionAPI) {
	const exec: Exec = (command, args, options) => pi.exec(command, args, options);

	async function status(ctx: { cwd: string; ui: { notify: (m: string, t?: "info" | "warning" | "error") => void } }) {
		const report = await detectHooks(exec, ctx.cwd);
		if (!report.isRepo) return ctx.ui.notify("Not inside a git repository.", "warning");

		const lines = [`Repo: ${report.repoRoot}`, `Hooks dir: ${report.hooksDir}${report.hooksPath ? " (core.hooksPath)" : ""}`];
		lines.push(`State: ${report.state}`);
		lines.push(...describeFrameworks(report));

		if (report.piGates) {
			const cfg = readGatesConfig(await gatesConfigPath(exec, report.repoRoot));
			if (cfg) {
				lines.push("pi-gates:");
				lines.push(`  - pre-commit (fast): ${cfg.fast?.command ?? NONE}`);
				lines.push(`  - pre-push (full): ${cfg.full?.command ?? NONE}`);
				lines.push(
					`  - commit-msg: conventional=${cfg.commitMsg.conventional}, noAiAttribution=${cfg.commitMsg.noAiAttribution}`,
				);
				lines.push(`  - requireCleanTree: ${cfg.requireCleanTree ?? true}`);
			}
		} else if (report.state === "none") {
			lines.push("No commit-time gates. `/gates install` can propose minimal local hooks.");
		}
		ctx.ui.notify(lines.join("\n"), "info");
	}

	async function install(ctx: {
		cwd: string;
		hasUI: boolean;
		ui: {
			notify: (m: string, t?: "info" | "warning" | "error") => void;
			select: (title: string, options: string[]) => Promise<string | undefined>;
			confirm: (title: string, message: string) => Promise<boolean>;
		};
	}) {
		const report = await detectHooks(exec, ctx.cwd);
		if (!report.isRepo) return ctx.ui.notify("Not inside a git repository.", "warning");

		// 1. ASSESS — nothing is written in this phase.
		if (report.state === "installed" && !report.piGates) {
			return ctx.ui.notify(
				[
					"This repo already has commit-time hooks in charge, so /gates installs nothing:",
					...describeFrameworks(report),
					"Use those. (commit-hooks-guard still blocks bypassing them.)",
				].join("\n"),
				"info",
			);
		}
		if (report.state === "configured-not-installed") {
			return ctx.ui.notify(
				[
					"This repo configures a hook framework that is not installed in git:",
					...describeFrameworks(report),
					"Install that framework's hooks yourself instead; /gates does not layer on top of it.",
				].join("\n"),
				"warning",
			);
		}
		if (!ctx.hasUI) {
			return ctx.ui.notify("/gates install needs an interactive session to check in with you.", "warning");
		}

		const candidates = await discoverTestCommands(exec, report.repoRoot);
		const fastCands = candidates.filter((c) => c.tier === "fast");
		const fullCands = candidates.filter((c) => c.tier === "full");

		// Shown in a dialog, not a toast: ui.notify is transient and the next prompt replaces it, so the
		// user would be asked to choose gates without ever seeing what was found.
		const MAX_LISTED = 8;
		const shown = candidates.slice(0, MAX_LISTED);
		const hidden = candidates.length - shown.length;
		const assessment = [
			`Hooks dir: ${report.hooksDir}`,
			`Existing gates: ${report.piGates ? "pi-gates already installed (will be reconfigured)" : "none"}`,
			`Other hooks present: ${report.nativeHooks.filter((h) => !["pre-commit", "commit-msg", "pre-push"].includes(h)).join(", ") || NONE}`,
			"",
			"Test commands found (static scan, nothing executed):",
			...(shown.length > 0 ? shown.map((c) => `  - ${label(c)}`) : ["  (none found)"]),
			...(hidden > 0 ? [`  ...and ${hidden} more (all are selectable in the next steps)`] : []),
			"",
			"Nothing is written until the final confirmation.",
		].join("\n");

		if (!(await ctx.ui.confirm(`Assessment: ${report.repoRoot} — continue?`, assessment))) {
			return ctx.ui.notify("Cancelled. Nothing was written.", "info");
		}

		// 2. CHECK IN — explicit choices, each skippable.
		const config: GatesConfig = {
			version: 1,
			commitMsg: { conventional: false, noAiAttribution: false },
			requireCleanTree: true,
		};

		const fastPick = await ctx.ui.select("Pre-commit gate: keep it FAST (seconds, mocked, no credentials)", [
			...fastCands.map((c) => c.command),
			...candidates.filter((c) => c.tier !== "fast").map((c) => c.command),
			NONE,
		]);
		if (fastPick === undefined) return ctx.ui.notify("Cancelled. Nothing was written.", "info");
		if (fastPick !== NONE) config.fast = { command: fastPick, timeoutSec: FAST_TIMEOUT };

		const fullPick = await ctx.ui.select("Pre-push gate: the full suite (optional)", [
			...fullCands.map((c) => c.command),
			...candidates.filter((c) => c.tier !== "full").map((c) => c.command),
			NONE,
		]);
		if (fullPick === undefined) return ctx.ui.notify("Cancelled. Nothing was written.", "info");
		if (fullPick !== NONE) config.full = { command: fullPick, timeoutSec: FULL_TIMEOUT };

		config.commitMsg.conventional = await ctx.ui.confirm(
			"commit-msg: require Conventional Commits?",
			"Rejects subjects that are not 'type(scope): summary'. Merge/revert/fixup commits are exempt.",
		);
		config.commitMsg.noAiAttribution = await ctx.ui.confirm(
			"commit-msg: reject AI/agent attribution?",
			"Rejects Co-authored-by: Claude/Copilot/..., 'Generated with ...' and similar markers.",
		);

		const hooks = hooksNeeded(config);
		if (hooks.length === 0) return ctx.ui.notify("No gates selected. Nothing was written.", "info");

		const summary = [
			`Install into ${report.hooksDir}:`,
			...hooks.map((h) => `  - ${h}`),
			`Config: ${await gatesConfigPath(exec, report.repoRoot)} (untracked, per worktree)`,
			`Pre-commit: ${config.fast?.command ?? NONE}`,
			`Pre-push: ${config.full?.command ?? NONE}`,
			`commit-msg: conventional=${config.commitMsg.conventional}, noAiAttribution=${config.commitMsg.noAiAttribution}`,
			"The gate refuses to run if the working tree has changes outside the commit (so only committed content is tested).",
			"No tracked repo files change. Undo anytime with /gates uninstall.",
		].join("\n");

		// 3. CONFIRM, then write.
		if (!(await ctx.ui.confirm("Install these gates?", summary))) {
			return ctx.ui.notify("Cancelled. Nothing was written.", "info");
		}
		const result = await installGates(exec, report, config);
		ctx.ui.notify(
			[
				`Installed: ${result.hooks.join(", ")}`,
				result.chained.length > 0 ? `Chained existing hook(s): ${result.chained.join(", ")} (kept as *.orig, run first)` : "",
				`Config: ${result.configPath}`,
			]
				.filter(Boolean)
				.join("\n"),
			"info",
		);
	}

	async function uninstall(ctx: {
		cwd: string;
		hasUI: boolean;
		ui: {
			notify: (m: string, t?: "info" | "warning" | "error") => void;
			confirm: (title: string, message: string) => Promise<boolean>;
		};
	}) {
		const report = await detectHooks(exec, ctx.cwd);
		if (!report.isRepo) return ctx.ui.notify("Not inside a git repository.", "warning");
		if (!report.piGates) return ctx.ui.notify("No pi-gates hooks are installed here.", "info");
		if (ctx.hasUI && !(await ctx.ui.confirm("Remove pi-gates?", `Removes pi-gates hooks and config from ${report.hooksDir}.`))) {
			return ctx.ui.notify("Cancelled.", "info");
		}
		const res = await uninstallGates(exec, report);
		ctx.ui.notify(
			`Removed: ${res.removed.join(", ") || NONE}${res.restored.length > 0 ? `; restored: ${res.restored.join(", ")}` : ""}${res.configRemoved ? "; config deleted" : ""}`,
			"info",
		);
	}

	pi.registerCommand("gates", {
		description: "Assess and manage local git commit gates: /gates [status|install|uninstall]",
		getArgumentCompletions: (prefix) =>
			["status", "install", "uninstall"]
				.filter((s) => s.startsWith(prefix))
				.map((s) => ({ value: s, label: s })),
		handler: async (args, ctx) => {
			const sub = args.trim().split(/\s+/)[0] || "status";
			if (sub === "status") return status(ctx);
			if (sub === "install") return install(ctx);
			if (sub === "uninstall") return uninstall(ctx);
			ctx.ui.notify("Usage: /gates [status|install|uninstall]", "warning");
		},
	});
}
