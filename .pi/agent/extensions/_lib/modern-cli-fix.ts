/**
 * Computes the exact modern replacement for a blocked grep/sed/find segment, so the guard's block
 * message can say "run THIS" instead of making the agent work it out. Returns null whenever the
 * translation is not clearly safe (the guard then falls back to its generic hint).
 * Pure; unit-tested in modern-cli-fix.test.ts.
 */
import { basename } from "node:path";

const q = (s: string): string => (/^[\w./:=@%+,-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);
// Always-quoted form for sd's pattern/replacement arguments.
const qa = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

function sedFix(args: string[], pipedIn: boolean): string | null {
	let quiet = false;
	let inPlace = false;
	const rest: string[] = [];
	for (const a of args) {
		if (a === "-n") quiet = true;
		else if (a === "-E" || a === "-r") continue;
		else if (a === "-i" || a.startsWith("-i") || a === "--in-place") inPlace = true;
		else if (a.startsWith("-")) return null;
		else rest.push(a);
	}
	const [script, ...files] = rest;
	if (script === undefined) return null;

	const range = /^(\d+)(?:,(\d+|\$))?p$/.exec(script);
	if (quiet && range) return sedRange(Number(range[1]), range[2], files, pipedIn);
	if (quiet) return null;

	const sub = /^s([^\w\s\\])(.+?)\1(.*?)\1(g?)$/.exec(script);
	if (!sub) return null;
	const [, , pat, rep, g] = sub;
	if (/\\[(){}|]/.test(pat) || /&|\\\d/.test(rep)) return null; // BRE groups / sed-only replacement syntax
	const cmd = `sd ${qa(pat)} ${qa(rep)}`;
	const note = g ? "" : " (sd replaces every match, not just the first per line)";
	if (inPlace) return files.length > 0 ? `${cmd} ${files.join(" ")}${note}` : null;
	if (files.length > 1) return null;
	return `${files.length === 1 ? `${cmd} < ${files[0]}` : cmd}${note}`;
}

/** Line count of a sed range: 1 for `Np`, undefined (to EOF) for `N,$p`. */
function rangeLimit(start: number, end: string | undefined): number | undefined {
	if (end === undefined) return 1;
	return end === "$" ? undefined : Number(end) - start + 1;
}

function sedRange(start: number, end: string | undefined, files: string[], pipedIn: boolean): string | null {
	const limit = rangeLimit(start, end);
	if (limit !== undefined && limit < 1) return null;
	if (files.length === 1 && !pipedIn) {
		return `the \`read\` tool: path=${files[0]} offset=${start}${limit === undefined ? "" : ` limit=${limit}`}`;
	}
	if (files.length > 0) return null;
	return `tail -n +${start}${limit === undefined ? "" : ` | head -n ${limit}`}`;
}

function grepFix(args: string[]): string | null {
	const out: string[] = [];
	for (const a of args) {
		if (a.startsWith("--include") || a.startsWith("--exclude")) return null;
		if (a === "--recursive") continue;
		if (/^-[A-Za-z]+$/.test(a)) {
			const kept = a.slice(1).replace(/[rRE]/g, "");
			if (kept) out.push(`-${kept}`);
			continue;
		}
		out.push(q(a));
	}
	return `rg ${out.join(" ")}`.trimEnd();
}

function findFix(args: string[]): string | null {
	const paths: string[] = [];
	let i = 0;
	while (i < args.length && !args[i].startsWith("-")) paths.push(args[i++]);
	let depth: string | undefined;
	let type: string | undefined;
	let glob: string | undefined;
	let ci = false;
	for (; i < args.length; i += 2) {
		const v = args[i + 1];
		if (v === undefined) return null;
		if (args[i] === "-maxdepth" && /^\d+$/.test(v)) depth = v;
		else if (args[i] === "-type" && /^[fdl]$/.test(v)) type = v;
		else if (args[i] === "-name") glob = v;
		else if (args[i] === "-iname") [glob, ci] = [v, true];
		else return null;
	}
	if (paths.length > 1) return null;
	const parts = ["fd"];
	if (depth) parts.push("-d", depth);
	if (type) parts.push("-t", type);
	if (ci) parts.push("-i");
	parts.push(...(glob === undefined ? ["."] : ["-g", q(glob)]));
	parts.push(paths[0] ?? ".");
	return parts.join(" ");
}

/** Exact replacement for one blocked command segment (tokens = real command first), or null. */
export function fixFor(tokens: string[], pipedIn: boolean): string | null {
	const args = tokens.slice(1);
	switch (basename(tokens[0])) {
		case "sed":
			return sedFix(args, pipedIn);
		case "grep":
			return grepFix(args);
		case "find":
			return findFix(args);
		default:
			return null;
	}
}
