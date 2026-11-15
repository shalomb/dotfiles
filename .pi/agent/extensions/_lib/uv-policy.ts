/**
 * uv policy: which Python-tooling invocations are disallowed, and the sanctioned replacement.
 * Pure (no pi imports) so it is unit-tested; used by uv-guard.ts. Segments come from the shared
 * quote-aware splitter, so words inside quotes/args are not mistaken for commands.
 */
import { basename } from "node:path";
import { deepSegments, stripPrefixes, tokenize } from "./shell-segments.ts";

export interface UvViolation {
	rule: string;
	use: string;
	why: string;
	segment: string;
}

const ADD = "uv add PKG (project) | uv run --with PKG python script.py (one-off)";

const BARE: Record<string, { rule: string; use: string; why: string }> = {
	pip: { rule: "pip", use: ADD, why: "uv owns the environment; pip bypasses the lockfile" },
	pip3: { rule: "pip", use: ADD, why: "uv owns the environment; pip bypasses the lockfile" },
	pipx: { rule: "pipx", use: "uvx TOOL (run) | uv tool install TOOL (install)", why: "uv manages tool environments" },
	poetry: { rule: "poetry", use: "uv init | uv add PKG | uv sync | uv run CMD", why: "this repo standardises on uv, not poetry" },
	virtualenv: { rule: "virtualenv", use: "uv venv", why: "uv creates and manages venvs" },
	easy_install: { rule: "easy_install", use: ADD, why: "deprecated; uv owns the environment" },
};

const MODULES: Record<string, { rule: string; use: string; why: string }> = {
	pip: { rule: "python -m pip", use: ADD, why: "uv owns the environment; pip bypasses the lockfile" },
	venv: { rule: "python -m venv", use: "uv venv", why: "uv creates and manages venvs" },
	py_compile: { rule: "python -m py_compile", use: "uv run python -m ast path/to/file.py >/dev/null", why: "py_compile writes .pyc files into __pycache__" },
};

const PYTHON = /^python(\d+(\.\d+)?)?$/;

/** Module named by `-m mod` or `-mmod` at token i, if any. */
function moduleArg(t: string[], i: number): string | undefined {
	if (t[i] === "-m") return t[i + 1];
	return /^-m.+/.test(t[i]) ? t[i].slice(2) : undefined;
}

/** First violation in a shell script, or null. */
export function uvViolation(script: string): UvViolation | null {
	for (const seg of deepSegments(script)) {
		const t = stripPrefixes(tokenize(seg.text));
		if (t.length === 0) continue;
		const cmd = basename(t[0]);
		const bare = BARE[cmd];
		if (bare) return { ...bare, segment: t.join(" ") };
		if (!PYTHON.test(cmd)) continue;
		for (let i = 1; i < t.length; i++) {
			const m = moduleArg(t, i);
			if (m && MODULES[m]) return { ...MODULES[m], segment: t.join(" ") };
		}
	}
	return null;
}

/** Block message: says nothing ran, names the replacement and the reason. */
export function uvBlockReason(v: UvViolation): string {
	const seg = v.segment.length > 160 ? `${v.segment.slice(0, 160)}…` : v.segment;
	return (
		`WARNING: NOT RUN. \`${v.rule}\` is disallowed (this repo uses uv): ${v.why}.\n` +
		`Use: ${v.use}\n` +
		`Segment: ${seg}. Nothing in the command ran; fix it and resubmit the whole command.`
	);
}
