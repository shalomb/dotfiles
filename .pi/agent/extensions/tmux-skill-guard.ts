/**
 * Tmux Skill Guard
 *
 * Forces interactive/long-lived process work through the tmux-remote-control
 * skill's scripts instead of improvised raw commands:
 *   - raw `tmux new-session`/`new-window`/`attach`/`kill-session` calls
 *     (always improvised; the skill never needs these)
 *   - raw `tmux send-keys` used blind, with no paired `tmux-read.sh` or
 *     `tmux-exec.sh` call to scrape/verify the result. The skill documents
 *     raw send-keys as the *correct* way to source credentials into a
 *     pane's own shell (e.g. `aws-login`), since tmux-exec.sh always runs
 *     in a throwaway subshell that can't export env vars back to the pane.
 *     What's banned is typing blind with no verification step at all, not
 *     the send-keys + tmux-read.sh combo the skill calls out as correct.
 *   - bare interactive REPLs/debuggers (python, node, irb, gdb, lldb,
 *     sqlite3, ssh) launched directly in the bash tool, which has no terminal
 *     to interact with them in. A command whose stdin is a pipe
 *     (`cat x | python3`) is not interactive and is left alone.
 *   - backgrounding a long-lived/interactive process with `&`/`nohup`/
 *     `disown` instead of a tmux pane the skill can drive
 *
 * Commands are found with the shared quote-aware splitter
 * (./_lib/shell-segments.ts): a command name inside quotes or a heredoc body
 * (`rg 'tmux send-keys' docs`) is data, not a command, and `sh -c '...'`
 * bodies are inspected.
 *
 * Enforces the `tmux-remote-control` skill mechanically instead of relying
 * on the model remembering it.
 *
 * Load location: ~/.pi/agent/extensions/tmux-skill-guard.ts (global, every project)
 */

import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { deepSegments, stripPrefixes, tokenize } from "./_lib/shell-segments.ts";

const SKILL_HINT =
	"Use the tmux-remote-control skill's scripts (tmux-exec.sh -d -w PATTERN, " +
	"tmux-read.sh, tmux-list.sh) instead of improvising directly.";

const SKILL_SCRIPT_PATTERN = /tmux-(exec|read|list|dispatch|clear-state)\.sh\b/;

// tmux accepts aliases and unique prefixes for subcommands.
const TMUX_LIFECYCLE = new Set(["new-session", "new", "new-window", "neww", "attach-session", "attach", "at", "a", "kill-session"]);
const TMUX_BLIND = new Set(["send-keys", "send", "capture-pane", "capturep"]);
const TMUX_GLOBAL_FLAGS_WITH_VALUE = new Set(["-L", "-S", "-f", "-c", "-T"]);

function tmuxSubcommand(args: string[]): string | undefined {
	for (let i = 0; i < args.length; i++) {
		if (TMUX_GLOBAL_FLAGS_WITH_VALUE.has(args[i])) {
			i += 1;
		} else if (!args[i].startsWith("-")) {
			return args[i];
		}
	}
	return undefined;
}

// Flags that take a separate value, so the value is not mistaken for a host or script.
const SSH_VALUE_FLAGS = new Set(["-i", "-p", "-l", "-o", "-F", "-J", "-L", "-R", "-D", "-b", "-c", "-e", "-m", "-S", "-w", "-W", "-E", "-B", "-O", "-Q", "-I"]);
const SSH_NON_SESSION = new Set(["-O", "-W", "-G", "-V", "-Q"]);
const PYTHON_REPL_FLAGS = new Set(["-q", "-i", "-u", "-B", "-E", "-s", "-S", "-I", "-O", "-OO", "-b", "-d"]);
const GDB_NON_INTERACTIVE = new Set(["-batch", "--batch", "-ex", "--ex", "-x", "--command", "-iex", "--version", "-v", "--help", "-h"]);

function positional(args: string[], valueFlags: Set<string> = new Set()): string[] {
	const out: string[] = [];
	for (let i = 0; i < args.length; i++) {
		if (valueFlags.has(args[i])) i += 1;
		else if (!args[i].startsWith("-") || args[i] === "-") out.push(args[i]);
	}
	return out;
}

/** True when this simple command would start an interactive session the bash tool cannot drive. */
function isInteractiveLaunch(tokens: string[], pipedIn: boolean): boolean {
	if (pipedIn) return false; // stdin is a pipe, not a terminal
	const cmd = basename(tokens[0]);
	const args = tokens.slice(1);

	if (/^python[\d.]*$/.test(cmd)) return args.every((a) => PYTHON_REPL_FLAGS.has(a));
	if (cmd === "node") return args.every((a) => a === "-i" || a === "--interactive");
	if (cmd === "irb" || cmd === "lldb") return args.length === 0;
	if (cmd === "gdb") return !args.some((a) => GDB_NON_INTERACTIVE.has(a));
	if (cmd === "sqlite3") return args.length === 1 && !args[0].startsWith("-");
	if (cmd === "ssh") {
		if (args.some((a) => SSH_NON_SESSION.has(a))) return false;
		return positional(args, SSH_VALUE_FLAGS).length === 1; // host only, no remote command
	}
	return false;
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;

		const command = String((event.input as { command?: string }).command ?? "");
		if (!command.trim()) return undefined;

		const segments = deepSegments(command).map((seg) => ({ seg, tokens: stripPrefixes(tokenize(seg.text)) }));
		const hasSkillScript = segments.some(({ seg }) => tokenize(seg.text).some((t) => SKILL_SCRIPT_PATTERN.test(t)));

		const deny = (reason: string) => {
			if (ctx.hasUI) ctx.ui.notify(reason, "warning");
			return { block: true as const, reason };
		};

		for (const { seg, tokens } of segments) {
			if (tokens.length === 0) continue;
			const cmd = basename(tokens[0]);

			if (cmd === "tmux") {
				const sub = tmuxSubcommand(tokens.slice(1));
				// Raw session/window lifecycle commands: never legitimate outside the
				// skill scripts themselves, which never call these directly either.
				if (sub && TMUX_LIFECYCLE.has(sub)) {
					return deny(`Blocked: raw "tmux ${sub}" call. ${SKILL_HINT}`);
				}
				// Raw send-keys/capture-pane: allowed only when paired with a scrape
				// (tmux-read.sh/tmux-exec.sh) in the same call, matching the skill's
				// documented env-sourcing pattern (e.g. aws-login). Blind send-keys
				// with no verification step is what's banned.
				if (sub && TMUX_BLIND.has(sub) && !hasSkillScript) {
					return deny(
						`Blocked: raw "tmux send-keys"/"capture-pane" with no tmux-read.sh/tmux-exec.sh scrape ` +
							`to verify the result. ${SKILL_HINT} ` +
							"(Raw send-keys is fine *only* when paired with tmux-read.sh to confirm the outcome — " +
							"e.g. sourcing credentials with aws-login, per the skill's documented pattern.)",
					);
				}
			}

			if (isInteractiveLaunch(tokens, seg.pipedIn)) {
				return deny(`Blocked: "${tokens.join(" ")}" launches an interactive process the bash tool cannot drive. ${SKILL_HINT}`);
			}
		}

		// Backgrounding a long-lived process instead of using a tmux pane.
		if (!hasSkillScript) {
			const backgrounded = segments.some(({ seg, tokens }) => {
				if (tokens.length === 0) return false;
				const cmd = basename(tokens[0]);
				return seg.background || cmd === "nohup" || cmd === "disown";
			});
			if (backgrounded) {
				return deny(
					"Blocked: backgrounding a process with &/nohup/disown instead of a tmux pane. " +
						`${SKILL_HINT} For non-interactive long-running shell commands, use the bg_run tool instead.`,
				);
			}
		}

		return undefined;
	});
}
