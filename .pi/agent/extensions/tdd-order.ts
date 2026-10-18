/**
 * TDD Order
 *
 * Nudges red-before-green on production code, per repo, per session:
 *   - production edit with no test edited yet          -> "write a failing test first"
 *   - test edited but no FAILING test run seen since   -> "see it fail first"
 * A failing run is the only proof the test can fail, so it is what counts as red.
 *
 * Only active in repos that already have tests, so it never nags in scripts,
 * docs-only repos or greenfield spikes. Scratch paths (/tmp) are ignored.
 *
 * Mode (env PI_TDD_ORDER, or PI_TDD for all TDD guards): off | warn (default) | block.
 * warn appends a note to the edit's result; block refuses the production edit.
 *
 * Heuristic by nature: it sees edits and test-runner commands in this session
 * only. Refactoring under green tests legitimately edits production code with
 * no new test, so the default is to warn, not block.
 *
 * Load location: ~/.pi/agent/extensions/tdd-order.ts (global)
 */

import { resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { Exec } from "./_lib/hooks-detect.ts";
import { commandWorkdir, isProductionFile, isScratchPath, isTestFile, isTestRunCommand, readMode, repoHasTests } from "./_lib/test-files.ts";

interface RepoState {
	testEdited: boolean;
	redSeen: boolean; // a failing test run happened after the latest test edit
	warnedFiles: Set<string>;
}

const PROOF_HINT =
	"If this is a refactor under green tests, a characterisation test, a spike, or infra/config where " +
	"executable verification (validate/plan/dry-run) is the proof, say which — do not skip silently.";

export default function (pi: ExtensionAPI) {
	const exec: Exec = (command, args, options) => pi.exec(command, args, options);
	const states = new Map<string, RepoState>();
	const rootCache = new Map<string, string>();

	async function repoRootFor(dir: string): Promise<string | undefined> {
		const cached = rootCache.get(dir);
		if (cached !== undefined) return cached || undefined;
		const res = await exec("git", ["rev-parse", "--show-toplevel"], { cwd: dir, timeout: 5000 }).catch(() => undefined);
		const root = res && res.code === 0 ? res.stdout.trim() : "";
		rootCache.set(dir, root);
		return root || undefined;
	}

	const stateFor = (root: string): RepoState => {
		let s = states.get(root);
		if (!s) {
			s = { testEdited: false, redSeen: false, warnedFiles: new Set() };
			states.set(root, s);
		}
		return s;
	};

	function adviceFor(state: RepoState, path: string): string | undefined {
		if (!state.testEdited) {
			return (
				`TDD note: editing production file "${path}" but no test has been written or changed in this session. ` +
				`Red first: add or adjust a failing test, run the repo's fast test target, then make it pass. ${PROOF_HINT}`
			);
		}
		if (!state.redSeen) {
			return (
				`TDD note: a test was edited but no failing test run has been seen since. Run the repo's fast test ` +
				`target and watch it fail before writing "${path}" — otherwise the test is unproven. ${PROOF_HINT}`
			);
		}
		return undefined;
	}

	const targetPath = (ctx: { cwd: string }, input: Record<string, unknown>) =>
		resolve(ctx.cwd, String(input.path ?? ""));

	pi.on("tool_call", async (event, ctx) => {
		const mode = readMode("PI_TDD_ORDER", "warn");
		if (mode === "off") return undefined;
		if (event.toolName !== "write" && event.toolName !== "edit") return undefined;

		const input = event.input as Record<string, unknown>;
		if (!input.path) return undefined;
		const full = targetPath(ctx, input);
		if (isScratchPath(full)) return undefined;

		const root = await repoRootFor(resolve(full, ".."));
		if (!root || !repoHasTests(root)) return undefined;
		const state = stateFor(root);

		if (isTestFile(full)) {
			state.testEdited = true;
			state.redSeen = false; // the new/changed test has not been seen failing yet
			return undefined;
		}

		if (mode === "block" && isProductionFile(full)) {
			const advice = adviceFor(state, String(input.path));
			if (advice) {
				if (ctx.hasUI) ctx.ui.notify(advice, "warning");
				return { block: true, reason: `Blocked: ${advice}` };
			}
		}
		return undefined;
	});

	pi.on("tool_result", async (event, ctx) => {
		const mode = readMode("PI_TDD_ORDER", "warn");
		if (mode === "off") return undefined;

		// Red/green tracking from test-runner commands (synchronous bash runs only).
		if (event.toolName === "bash") {
			const command = String((event.input as { command?: string }).command ?? "");
			if (!isTestRunCommand(command)) return undefined;
			const root = await repoRootFor(commandWorkdir(command, ctx.cwd));
			if (!root) return undefined;
			const state = stateFor(root);
			// Pipes/`|| true` can mask the status; only a clearly failing run counts as red.
			if (event.isError && state.testEdited) state.redSeen = true;
			return undefined;
		}

		if (mode !== "warn") return undefined;
		if (event.toolName !== "write" && event.toolName !== "edit") return undefined;
		if (event.isError) return undefined;

		const input = event.input as Record<string, unknown>;
		if (!input.path) return undefined;
		const full = targetPath(ctx, input);
		if (!isProductionFile(full)) return undefined;

		const root = await repoRootFor(resolve(full, ".."));
		if (!root || !repoHasTests(root)) return undefined;
		const state = stateFor(root);
		if (state.warnedFiles.has(full)) return undefined; // once per file, to avoid nagging

		const advice = adviceFor(state, String(input.path));
		if (!advice) return undefined;
		state.warnedFiles.add(full);
		if (ctx.hasUI) ctx.ui.notify(advice, "warning");
		return { content: [...event.content, { type: "text" as const, text: `\n\n${advice}` }] };
	});
}
