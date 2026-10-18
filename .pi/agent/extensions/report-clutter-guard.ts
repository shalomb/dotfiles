/**
 * Report Clutter Guard
 *
 * Blocks creating new ALL_CAPS_SCRATCH_REPORT.md-style files in a repo —
 * the disposable "SUMMARY.md" / "IMPLEMENTATION_REPORT.md" / "FINAL_REVIEW.md"
 * files agents habitually drop at the repo root to narrate their own work.
 * These were never asked for, clutter git history, and go stale immediately.
 *
 * A small allowlist of genuinely conventional ALL_CAPS docs (README,
 * LICENSE, CHANGELOG, SKILL, ...) is permitted. Everything else in that shape is
 * redirected to better homes: the commit/PR description, an ADR (see the
 * `architecture-decision-records` skill), a docs/ file with a normal
 * lowercase name, or a scratch location outside the repo (/tmp).
 *
 * Only creating a new file is blocked. Rewriting a file that already exists is
 * allowed: it is already part of the repository, and blocking it only gets in
 * the way of maintaining it.
 *
 * Load location: ~/.pi/agent/extensions/report-clutter-guard.ts (global, every project)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";

// Conventional ALL_CAPS docs with an established, recognized purpose.
// Matched case-insensitively against the filename stem (without .md).
const ALLOWED_STEMS = new Set([
	"readme",
	"license",
	"licence",
	"changelog",
	"contributing",
	"code_of_conduct",
	"security",
	"authors",
	"notice",
	"maintainers",
	"codeowners",
	"agents",
	"agents.override",
	"claude",
	"gemini",
	"support",
	"governance",
	"roadmap",
	"todo",
	// Agent skills: the file name the skill format requires.
	"skill",
	// GitHub community and template files.
	"pull_request_template",
	"issue_template",
	"funding",
	// Long-standing project-root conventions.
	"history",
	"changes",
	"news",
	"install",
	"upgrading",
	"copying",
	"contributors",
	"acknowledgments",
	"acknowledgements",
]);

// Scratch locations outside any repo: /tmp plus $TMPDIR. Compared after symlink
// resolution so a link inside scratch space cannot smuggle a repo path in.
function realOrSelf(path: string): string {
	try {
		return realpathSync(path);
	} catch {
		return path; // may not exist yet
	}
}

const SCRATCH_ROOTS = [...new Set(["/tmp", tmpdir()].map(realOrSelf))];

function isScratch(fullPath: string): boolean {
	// The file usually does not exist yet, so resolve its directory instead.
	const real = realOrSelf(dirname(fullPath));
	return SCRATCH_ROOTS.some((root) => real === root || real.startsWith(`${root}/`));
}

// Filename looks like SHOUTY_SNAKE_CASE.md: at least one letter, no
// lowercase letters, made up of uppercase/digits/underscore/dash.
function isShoutySnakeCaseMd(filename: string): boolean {
	if (!/\.md$/i.test(filename)) return false;
	const stem = filename.replace(/\.md$/i, "");
	if (!/[A-Za-z]/.test(stem)) return false;
	if (/[a-z]/.test(stem)) return false; // any lowercase letter disqualifies it
	return /^[A-Z0-9_-]+$/.test(stem);
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "write") return undefined;

		const path = String((event.input as { path?: string }).path ?? "");
		if (!path) return undefined;

		// Scratch space outside any repo is exactly where disposable reports belong.
		const full = resolve(ctx.cwd, path);
		if (isScratch(full)) return undefined;

		const filename = basename(path);
		if (!isShoutySnakeCaseMd(filename)) return undefined;

		const stem = filename.replace(/\.md$/i, "").toLowerCase();
		if (ALLOWED_STEMS.has(stem)) return undefined;

		// Rewriting an existing file is maintenance, not new clutter.
		if (existsSync(full)) return undefined;

		const reason =
			`Blocked: creating "${filename}" — ALL_CAPS scratch/report markdown files are not ` +
			"wanted in the repo. Prefer, in order: (1) put the summary in the commit message or PR " +
			"description instead of a file; (2) if it's a real architectural decision, write an ADR " +
			"(architecture-decision-records skill); (3) if it's lasting documentation, use docs/ with " +
			"a normal lowercase-kebab-case filename; (4) if it's disposable scratch, write it outside " +
			"the repo (e.g. /tmp).";
		if (ctx.hasUI) ctx.ui.notify(reason, "warning");
		return { block: true, reason };
	});
}
