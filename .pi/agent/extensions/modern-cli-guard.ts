/**
 * Modern CLI Guard
 *
 * Blocks traditional coreutils invocations (grep/find/sed) as the command
 * of a bash segment, redirecting to their modern equivalents (rg/fd/sd/sg). awk is deliberately allowed: it has no true modern equivalent
 * (jq/yq only cover JSON/YAML, not columnar text).
 * Enforces the `modern-cli-overrides` skill mechanically instead of relying on
 * the model remembering it.
 *
 * Commands are found with the shared quote-aware splitter
 * (./_lib/shell-segments.ts), so a word inside a quoted regex (`rg 'a|grep'`)
 * is not mistaken for a command, and commands on later lines are not missed.
 *
 * Load location: ~/.pi/agent/extensions/modern-cli-guard.ts (global, every project)
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { commandsOf } from "./_lib/shell-segments.ts";
import { blockReason } from "./_lib/modern-cli-message.ts";

const MODERN_REPLACEMENTS: Record<string, string> = {
	grep: "rg (ripgrep)",
	find: "fd",
	sed: "sd (or `sg` for structural/AST edits)",
};

const SKILL_PATH = join(homedir(), ".pi/agent/skills/modern-cli-overrides/SKILL.md");

// A bare "use rg" does not make the agent load the skill, so it keeps hitting this block. A soft
// "before retrying, load..." was tested live and ignored: the agent already knew rg and treated
// "do not retry as written" as the whole instruction. So make the load an explicit, first, required step.
const SKILL_INSTRUCTION =
	`REQUIRED NEXT STEP: your next tool call must be \`read ${SKILL_PATH}\` (the modern-cli-overrides skill, ` +
	"also available as /skill:modern-cli-overrides). Do this before anything else, even if you already know " +
	"the replacement: it has the exact rg/fd/sd/sg/jq syntax and the flag differences from the traditional " +
	"tools, and it is a global non-negotiable that you read it. Then run the corrected command. " +
	"Do not retry the blocked command as written.";

// The skill body (frontmatter stripped) is appended to the system prompt every turn, so the rules are
// always in context and the block message only needs a short pointer. Re-read per turn so edits apply live.
function skillBody(): string {
	try {
		return readFileSync(SKILL_PATH, "utf8").replace(/^---[\s\S]*?---\s*/, "").trim();
	} catch {
		return "";
	}
}

// `sed -n '196,212p' file` only prints a line range; sd is for substitutions, so point at the right tool.
const SED_PRINT_RANGE = /^\$?\d*(,\$|,\d+)?p$/;

function hintFor(cmd: string, args: string[]): string {
	if (cmd === "sed" && args.includes("-n") && args.some((a) => SED_PRINT_RANGE.test(a))) {
		return "the `read` tool (offset/limit) or `bat -r START:END file`";
	}
	return MODERN_REPLACEMENTS[cmd];
}

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event) => {
		const body = skillBody();
		if (!body) return undefined;
		// A prompt *section* (rendered as <modern_cli_overrides>…</modern_cli_overrides>), not a forced
		// `systemPrompt`: forcing makes the prompt opaque, so later before_agent_start hooks (e.g. the
		// skills-loader tier filter) could no longer change it.
		event.systemPromptOptions.sections = { ...event.systemPromptOptions.sections, modern_cli_overrides: body };
		return undefined;
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;

		const command = String((event.input as { command?: string }).command ?? "");
		if (!command.trim()) return undefined;

		for (const tokens of commandsOf(command)) {
			const cmd = basename(tokens[0]);
			if (!(cmd in MODERN_REPLACEMENTS)) continue;
			const reason = blockReason({ cmd, tokens, hint: hintFor(cmd, tokens.slice(1)), hasBody: !!skillBody(), skillInstruction: SKILL_INSTRUCTION });
			if (ctx.hasUI) ctx.ui.notify(reason, "warning");
			return { block: true, reason };
		}

		return undefined;
	});
}
