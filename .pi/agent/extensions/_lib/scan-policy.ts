/**
 * Scan policy (shared helper — NOT an extension). Guidance, not security.
 *
 * Only *recursive* scans of broad roots are blocked. Targeted subpaths
 * (/usr/share/doc/x, /var/log/app) and non-recursive ls/grep are allowed.
 */
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { commandsOf } from "./shell-segments.ts";

const ALWAYS_RECURSIVE = new Set(["fd", "find", "rg", "du", "tree"]);
const BROAD_ROOTS = new Set(["/", "/proc", "/sys", "/dev", "/mnt", "/media", "/usr", "/etc", "/var", "/opt", "/boot", "/home"]);

function realOrSelf(p: string): string {
	try { return realpathSync(p); } catch { return p; }
}
const ALLOWED = [...new Set(["/tmp", tmpdir()].map(realOrSelf))];
const inScratch = (p: string) => { const r = realOrSelf(p); return ALLOWED.some((a) => r === a || r.startsWith(`${a}/`)); };

function isRecursive(cmd: string, flags: string[]): boolean {
	if (ALWAYS_RECURSIVE.has(cmd)) return true;
	if (cmd === "grep") return flags.some((f) => f === "--recursive" || f === "--dereference-recursive" || /^-[a-zA-Z]*[rR]/.test(f) && !f.startsWith("--"));
	if (cmd === "ls") return flags.some((f) => f === "--recursive" || /^-[a-zA-Z]*R/.test(f) && !f.startsWith("--"));
	return false;
}

/** Returns a block reason, or undefined if the command is fine. */
export function checkScan(command: string, cwd: string, home: string): string | undefined {
	for (const tokens of commandsOf(command)) {
		const cmd = basename(tokens[0]);
		const args = tokens.slice(1);
		const flags = args.filter((t) => t.startsWith("-"));
		if (!isRecursive(cmd, flags)) continue;

		let paths = args.filter((t) => !t.startsWith("-"));
		if (cmd === "rg" || cmd === "grep") paths = paths.slice(1); // first positional is the pattern
		if (paths.length === 0) paths = ["."];

		for (const raw of paths) {
			const resolved = resolve(cwd, raw);
			if (inScratch(resolved)) continue;
			if (BROAD_ROOTS.has(resolved) && resolved !== home && resolved !== cwd) {
				return (
					`Blocked: recursive "${cmd}" rooted at "${resolved}" is a broad filesystem scan. ` +
					`Scope it to a specific subdirectory (e.g. /usr/share/<pkg>, /var/log/<app>) or $HOME (${home || "~"}) project.`
				);
			}
		}
	}
	return undefined;
}
