/**
 * Shared test-file classification (helper — NOT an extension).
 *
 * Used by tdd-order.ts and test-hygiene.ts so both agree on what counts as a
 * test file, a production file, and a test run.
 */

import { existsSync, readdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export type Mode = "off" | "warn" | "block";

export function readMode(envName: string, fallback: Mode): Mode {
	const raw = (process.env[envName] ?? process.env.PI_TDD ?? "").toLowerCase();
	return raw === "off" || raw === "warn" || raw === "block" ? raw : fallback;
}

const TEST_DIR = /(?:^|\/)(?:tests?|__tests__|spec|specs|e2e|integration)(?:\/|$)/i;
const TEST_NAME = [
	/^test_.+\.py$/,
	/_test\.(?:py|go|rb|rs|exs?)$/,
	/\.(?:test|spec)\.[cm]?[jt]sx?$/,
	/Tests?\.(?:java|kt|cs|swift)$/,
	/_spec\.rb$/,
	/\.tftest\.hcl$/,
	/\.bats$/,
	/^conftest\.py$/,
];

export function isTestFile(path: string): boolean {
	return TEST_DIR.test(path) || TEST_NAME.some((re) => re.test(basename(path)));
}

const CODE_EXT = /\.(?:[cm]?[jt]sx?|py|go|rs|rb|java|kt|cs|swift|php|scala|c|cc|cpp|h|hpp|sh|bash|zsh|tf|lua|ex|exs)$/i;

function realOrSelf(path: string): string {
	try {
		return realpathSync(path);
	} catch {
		return path;
	}
}

const SCRATCH = [...new Set(["/tmp", tmpdir()].map(realOrSelf))];

export function isScratchPath(fullPath: string): boolean {
	const real = realOrSelf(dirname(fullPath));
	return SCRATCH.some((root) => real === root || real.startsWith(`${root}/`));
}

/** Production code: a code file that is neither a test nor scratch. Docs/config are not production code. */
export function isProductionFile(fullPath: string): boolean {
	if (isScratchPath(fullPath)) return false;
	if (!CODE_EXT.test(fullPath)) return false;
	if (/\.d\.ts$/.test(fullPath)) return false;
	if (/(?:^|\/)(?:\.git|node_modules|\.terraform|\.venv|dist|build)(?:\/|$)/.test(fullPath)) return false;
	return !isTestFile(fullPath);
}

const RUNNER =
	/\b(?:pytest|py\.test|vitest|jest|mocha|bats|phpunit|rspec|go\s+test|cargo\s+(?:test|nextest)|terraform\s+test|tofu\s+test|(?:npm|pnpm|yarn)\s+(?:run\s+)?test[\w:-]*|(?:make|just|task)\s+(?:[\w-]*:)?[\w-]*test[\w-]*|(?:make|just|task)\s+(?:check|verify|ci|pre-pr))\b/;

export function isTestRunCommand(command: string): boolean {
	return RUNNER.test(command);
}

/**
 * Directory a bash command actually runs in: a leading `cd X &&`/`;`, else `make|just|task -C X`
 * (or `--directory X`), else the session cwd. Agents routinely `cd` into the repo they are
 * working on, which is not the session cwd.
 */
export function commandWorkdir(command: string, cwd: string): string {
	const unquote = (s: string) => s.replace(/^["']|["']$/g, "");
	const cd = /^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*(?:&&|;)/.exec(command);
	if (cd) return resolve(cwd, unquote(cd[1]));
	const dashC = /\b(?:make|just|task)\b[^|;&]*?\s(?:-C|--directory)[=\s]+("[^"]+"|'[^']+'|\S+)/.exec(command);
	if (dashC) return resolve(cwd, unquote(dashC[1]));
	return cwd;
}

const SKIP_DIRS = new Set([".git", "node_modules", ".terraform", ".venv", "venv", "dist", "build", "target"]);

function hasTestFile(dir: string, depth: number): boolean {
	let entries: import("node:fs").Dirent[];
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return false;
	}
	for (const e of entries) {
		if (e.isFile() && TEST_NAME.some((re) => re.test(e.name))) return true;
	}
	if (depth === 0) return false;
	for (const e of entries) {
		if (e.isDirectory() && !e.name.startsWith(".") && !SKIP_DIRS.has(e.name) && hasTestFile(join(dir, e.name), depth - 1)) {
			return true;
		}
	}
	return false;
}

const hasTestsCache = new Map<string, boolean>();

/** Cheap check: does this repo already have a test directory or test files? Cached per root. */
export function repoHasTests(root: string): boolean {
	const cached = hasTestsCache.get(root);
	if (cached !== undefined) return cached;
	const result =
		["tests", "test", "__tests__", "spec"].some((d) => existsSync(join(root, d))) || hasTestFile(root, 2);
	hasTestsCache.set(root, result);
	return result;
}

/** Text a write/edit adds to a file: write.content, or the newText of every edit. */
export function addedText(toolName: string, input: Record<string, unknown>): string {
	if (toolName === "write") return String(input.content ?? "");
	const edits = Array.isArray(input.edits) ? (input.edits as Array<Record<string, unknown>>) : [];
	const fromEdits = edits.map((e) => String(e.newText ?? "")).join("\n");
	return fromEdits || String(input.newText ?? "");
}
