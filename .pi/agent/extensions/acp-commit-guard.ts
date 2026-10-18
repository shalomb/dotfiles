/**
 * ACP Commit Guard
 *
 * Enforces the Atomic Commit Protocol (ACP) on `git commit` calls:
 *   - the commit subject (first line of the first message) must be a
 *     Conventional Commits header; later -m flags are body paragraphs
 *   - no AI/agent co-author or generated-by attribution markers
 *   (hook-bypass flags are handled by commit-hooks-guard.ts)
 *
 * Enforces the `git-commit-formatter` skill mechanically instead of
 * relying on the model remembering it.
 *
 * Commits are found with the quote-aware splitter in ./_lib/shell-segments.ts
 * (the same one commit-hooks-guard.ts uses), so text that merely mentions
 * `git commit` inside a string, a search or a heredoc is not mistaken for one.
 *
 * What it can read: -m/--message (also -am, -m<text>, --message=<text>) and
 * the heredoc form `-m "$(cat <<'EOF' ... EOF)"`. What it cannot read, and so
 * blocks with an explanation: -F/--file, $VARIABLES, other $(...) and no
 * message at all.
 *
 * Tests: bun test ~/.pi/agent/extensions/_lib/acp-commit-guard.test.ts
 *
 * Load location: ~/.pi/agent/extensions/acp-commit-guard.ts (global, every project)
 */

import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { segmentsDeep, stripPrefixes, tokenize } from "./_lib/shell-segments.ts";

function isConventionalCommitHeader(msg: string): boolean {
	// type(scope)!: description. Scope and ! are optional. Only the first line counts.
	const firstLine = msg.trim().split("\n", 1)[0] ?? "";
	return /^[a-z]+(\([\w.\/-]+\))?!?:\s.+/.test(firstLine);
}

// git global options that take a separate value (`git -C dir commit`).
const GLOBAL_OPTS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env"]);

/** Arguments after `commit` for every real `git ... commit` in the script (including inside `bash -c`). */
function findCommitArgs(script: string): string[][] {
	const found: string[][] = [];
	for (const segment of segmentsDeep(script)) {
		const t = stripPrefixes(tokenize(segment));
		if (t.length === 0 || basename(t[0]) !== "git") continue;
		let i = 1;
		while (i < t.length && t[i].startsWith("-")) i += GLOBAL_OPTS_WITH_VALUE.has(t[i]) ? 2 : 1;
		if (t[i] === "commit") found.push(t.slice(i + 1));
	}
	return found;
}

interface ReadMessages {
	messages: string[];
	/** -F / --file was used: the text is in a file this guard cannot see. */
	fromFile: boolean;
}

function readMessages(args: string[]): ReadMessages {
	const messages: string[] = [];
	let fromFile = false;
	for (let j = 0; j < args.length; j++) {
		const a = args[j];
		if (a === "--") break;
		if (a === "-F" || a === "--file") {
			fromFile = true;
			j += 1;
		} else if (a.startsWith("--file=")) {
			fromFile = true;
		} else if (a === "--message") {
			messages.push(args[++j] ?? "");
		} else if (a.startsWith("--message=")) {
			messages.push(a.slice("--message=".length));
		} else if (/^-[A-Za-z]*m$/.test(a)) {
			messages.push(args[++j] ?? ""); // -m, -am, -sm ...
		} else if (/^-m./.test(a)) {
			messages.push(a.slice(2)); // -m"text"
		}
	}
	return { messages, fromFile };
}

/**
 * The message text when it can be known, else undefined. Handles the heredoc idiom
 * `$(cat <<'EOF' ... EOF)`; any other `$...` or backtick text is not knowable here.
 */
function resolveMessage(raw: string): string | undefined {
	if (!/^\s*[$`]/.test(raw)) return raw;
	const heredoc = /^\s*\$\(\s*cat\s+<<-?\s*(['"]?)(\w+)\1[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*\n?\s*\)\s*$/.exec(raw);
	return heredoc ? heredoc[3] : undefined;
}

// Markers that indicate AI/agent authorship attribution. These are banned
// from commit trailers, messages, and the full command text regardless of
// formatting, since they are never explicitly requested and must never be
// added to code, commits, or docs.
const AI_ATTRIBUTION_PATTERNS: RegExp[] = [
	/co-authored-by:\s*claude/i,
	/co-authored-by:\s*copilot/i,
	/co-authored-by:\s*gemini/i,
	/co-authored-by:\s*chatgpt/i,
	/co-authored-by:\s*openai/i,
	/co-authored-by:\s*[^<\n]*\bai\b/i,
	/generated\s+(with|by)\s+(claude|copilot|gemini|chatgpt|cursor|codex|an?\s+ai)/i,
	/written\s+(with|by)\s+(claude|copilot|gemini|chatgpt|cursor|codex|an?\s+ai)/i,
	/\bai[\s-]generated\b/i,
	/🤖/,
];

function findAiAttribution(text: string): string | undefined {
	for (const pattern of AI_ATTRIBUTION_PATTERNS) {
		const match = text.match(pattern);
		if (match) return match[0];
	}
	return undefined;
}

const CANNOT_VERIFY_HINT =
	"Use an inline literal message instead: " +
	'`git commit -m "type(scope): summary" -m "body paragraph"`, or a heredoc: ' +
	"`git commit -m \"$(cat <<'EOF'` ... `EOF` `)\"`.";

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;

		const command = String((event.input as { command?: string }).command ?? "");
		const commits = findCommitArgs(command);
		if (commits.length === 0) return undefined;

		const block = (reason: string) => {
			if (ctx.hasUI) ctx.ui.notify(reason, "warning");
			return { block: true, reason };
		};

		// Check the whole command text (covers every -m flag, heredoc bodies and
		// trailers appended after the subject line). Only reached for a real commit.
		const attribution = findAiAttribution(command);
		if (attribution) {
			return block(
				`Blocked: commit text contains an AI/agent attribution marker ("${attribution}"). ` +
					"Never add co-author or AI markers/attributions to commits, per policy.",
			);
		}

		for (const args of commits) {
			const { messages, fromFile } = readMessages(args);

			if (messages.length === 0) {
				return block(
					fromFile
						? "Blocked: cannot verify a commit message given with -F/--file, so the Conventional Commits header is unchecked. " +
								CANNOT_VERIFY_HINT
						: "Blocked: `git commit` without an inline -m message. Use ACP: " +
								'`git commit -m "type(scope): summary"` with a Conventional Commits header.',
				);
			}

			// The first message is the subject; later -m flags are body paragraphs.
			const raw = messages[0];
			const subject = resolveMessage(raw);
			if (subject === undefined) {
				return block(
					`Blocked: cannot verify the commit message "${raw.slice(0, 60)}" (a variable or command substitution is not expanded here), ` +
						"so the Conventional Commits header is unchecked. " +
						CANNOT_VERIFY_HINT,
				);
			}
			if (!isConventionalCommitHeader(subject)) {
				return block(
					`Blocked: commit message "${subject.trim().split("\n", 1)[0]}" is not a Conventional Commits header ` +
						'(expected "type(scope): summary", e.g. "fix(auth): handle expired token"). ACP requires this.',
				);
			}
		}

		return undefined;
	});
}
