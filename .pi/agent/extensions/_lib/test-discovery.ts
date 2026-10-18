/**
 * Static test-command discovery (shared helper — NOT an extension).
 *
 * Finds how a repo runs its tests WITHOUT executing anything from the repo:
 * Makefile targets (parsed as text), justfile recipes (`just --list` only
 * prints, it does not run recipes), package.json scripts, and a few
 * convention fallbacks. Each candidate is classified fast / full / other so
 * the caller can propose the cheap tier for commit-time gates.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Exec } from "./hooks-detect.ts";

export type Tier = "fast" | "full" | "other";

export interface TestCandidate {
	command: string;
	tier: Tier;
	source: string;
	description: string;
}

const TESTISH = /test|check|verify|spec|unit|^ci$|pre-pr|pre-push/i;
const NOT_FAST_NAME = /watch|e2e|integration|acceptance|slow|smoke|deploy|coverage/i;
const FAST_NAME = /^(test[-_:.]?(fast|unit|quick|short)|(fast|unit|quick)[-_:.]?tests?|unit|quick|fast)$/i;
const FULL_NAME = /^(test|tests|check|ci|verify|pre-pr|pre-push|test[-_:.]?all|all)$/i;
const FAST_DESC = /\b(fast|quick|mocked|no credentials|unit)\b/i;

export function classify(name: string, description: string): Tier | undefined {
	if (!TESTISH.test(name)) return undefined;
	if (NOT_FAST_NAME.test(name)) return "other";
	if (FAST_NAME.test(name)) return "fast";
	if (/test/i.test(name) && FAST_DESC.test(description)) return "fast";
	if (FULL_NAME.test(name)) return "full";
	return "other";
}

function readText(path: string): string {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
}

function firstExisting(root: string, names: string[]): string | undefined {
	return names.find((n) => existsSync(join(root, n)));
}

const SKIP_DIRS = new Set([".git", "node_modules", ".terraform", ".venv", "venv", "dist", "build", "target"]);

function findFile(root: string, ext: RegExp, depth: number): string | undefined {
	let entries: import("node:fs").Dirent[];
	try {
		entries = readdirSync(root, { withFileTypes: true });
	} catch {
		return undefined;
	}
	const hit = entries.find((e) => e.isFile() && ext.test(e.name));
	if (hit) return join(root, hit.name);
	if (depth === 0) return undefined;
	for (const e of entries) {
		if (!e.isDirectory() || e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
		const found = findFile(join(root, e.name), ext, depth - 1);
		if (found) return found;
	}
	return undefined;
}

function fromMakefile(root: string): TestCandidate[] {
	const file = firstExisting(root, ["Makefile", "makefile", "GNUmakefile"]);
	if (!file) return [];
	const out: TestCandidate[] = [];
	const seen = new Set<string>();
	for (const line of readText(join(root, file)).split("\n")) {
		const m = /^([A-Za-z0-9][A-Za-z0-9_.-]*)\s*:(?![=:])[^#\n]*?(?:##\s*(.*))?$/.exec(line);
		if (!m || seen.has(m[1])) continue;
		const tier = classify(m[1], m[2] ?? "");
		if (!tier) continue;
		seen.add(m[1]);
		out.push({ command: `make ${m[1]}`, tier, source: file, description: (m[2] ?? "").trim() });
	}
	return out;
}

async function fromJustfile(exec: Exec, root: string): Promise<TestCandidate[]> {
	const file = firstExisting(root, ["justfile", "Justfile", ".justfile"]);
	if (!file) return [];
	const res = await exec("just", ["--list", "--unsorted", "--list-heading", "", "--list-prefix", ""], {
		cwd: root,
		timeout: 10000,
	}).catch(() => undefined);
	if (!res || res.code !== 0) return [];
	const out: TestCandidate[] = [];
	for (const line of res.stdout.split("\n")) {
		const m = /^(\S+)(?:\s+[^#]*?)?\s*(?:#\s*(.*))?$/.exec(line.trim());
		if (!m) continue;
		const tier = classify(m[1], m[2] ?? "");
		if (!tier) continue;
		out.push({ command: `just ${m[1]}`, tier, source: file, description: (m[2] ?? "").trim() });
	}
	return out;
}

function fromPackageJson(root: string): TestCandidate[] {
	let scripts: Record<string, string> = {};
	try {
		scripts = (JSON.parse(readText(join(root, "package.json"))) as { scripts?: Record<string, string> }).scripts ?? {};
	} catch {
		return [];
	}
	const out: TestCandidate[] = [];
	for (const [name, body] of Object.entries(scripts)) {
		const tier = classify(name.replace(/:/g, "-"), "");
		if (!tier) continue;
		out.push({
			command: name === "test" ? "npm test --silent" : `npm run ${name} --silent`,
			tier,
			source: "package.json",
			description: body.slice(0, 60),
		});
	}
	return out;
}

function fromConventions(root: string): TestCandidate[] {
	const out: TestCandidate[] = [];
	const note = "convention; speed unverified";
	const pyproject = readText(join(root, "pyproject.toml"));
	const hasPytest =
		existsSync(join(root, "pytest.ini")) ||
		existsSync(join(root, "conftest.py")) ||
		/\[tool\.pytest/.test(pyproject) ||
		findFile(join(root, "tests"), /^test_.*\.py$/, 1) !== undefined;
	if (hasPytest) {
		const uv = existsSync(join(root, "uv.lock"));
		out.push({ command: uv ? "uv run pytest -x -q" : "pytest -x -q", tier: "fast", source: "convention", description: note });
	}
	if (existsSync(join(root, "go.mod"))) {
		out.push({ command: "go test ./...", tier: "fast", source: "convention", description: note });
	}
	if (existsSync(join(root, "Cargo.toml"))) {
		out.push({ command: "cargo test", tier: "fast", source: "convention", description: note });
	}
	if (findFile(root, /\.tftest\.hcl$/, 2)) {
		out.push({ command: "terraform test", tier: "other", source: "convention", description: `${note}; may need credentials` });
	}
	const bats = findFile(root, /\.bats$/, 2);
	if (bats) {
		out.push({ command: "bats -r .", tier: "fast", source: "convention", description: note });
	}
	return out;
}

const TIER_ORDER: Record<Tier, number> = { fast: 0, full: 1, other: 2 };

export async function discoverTestCommands(exec: Exec, root: string): Promise<TestCandidate[]> {
	const all = [
		...fromMakefile(root),
		...(await fromJustfile(exec, root)),
		...fromPackageJson(root),
		...fromConventions(root),
	];
	const seen = new Set<string>();
	const unique = all.filter((c) => {
		if (seen.has(c.command)) return false;
		seen.add(c.command);
		return true;
	});
	return unique.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
}
