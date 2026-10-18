/**
 * AWS Read-Only Guard
 *
 * Blocks mutating `aws` CLI commands, allowing only read-only operations
 * through. Ported from the allowlist logic in ~/shalomb/aws-cli-ro (a
 * containerized read-only AWS CLI wrapper) — same verb-prefix check,
 * applied directly to the bash tool's `aws ...` invocations instead of
 * requiring a container.
 *
 * Rationale (from that project's README): elevated AWS credentials make it
 * easy to accidentally run a destructive command. IAM ReadOnlyAccess roles
 * are the ideal fix but aren't always available, so this is a client-side
 * backstop — not a security boundary. Credentials with write access can
 * still be used directly outside the bash tool; this only stops the agent
 * from issuing a mutating call through its own aws CLI invocations.
 *
 * Commands are found with the shared quote-aware splitter
 * (./_lib/shell-segments.ts), so `aws` on a later line is not missed and
 * `|` inside quotes does not split a command.
 *
 * Load location: ~/.pi/agent/extensions/aws-readonly-guard.ts (global, every project)
 */

import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { commandsOf } from "./_lib/shell-segments.ts";

// Command verbs that start with any of these prefixes are treated as
// read-only (mirrors ~/shalomb/aws-cli-ro/aws-readonly).
const READONLY_PREFIXES = [
	"list",
	"ls",
	"describe",
	"get",
	"head",
	"show",
	"explain",
	"help",
	"version",
	"query",
	"scan",
	"lookup",
	"search",
	"export",
	"view",
];

function startsWithReadonlyPrefix(word: string): boolean {
	return READONLY_PREFIXES.some((prefix) => word.startsWith(prefix));
}

// Finds the `aws` subcommand verb (the second non-flag token after the
// service name), e.g. "aws s3 rm ..." -> "rm".
function findAwsCommandVerb(args: string[]): string | undefined {
	let service: string | undefined;
	for (const tok of args) {
		if (tok.startsWith("-")) continue;
		if (!service) {
			service = tok;
		} else {
			return tok;
		}
	}
	return undefined;
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;

		const command = String((event.input as { command?: string }).command ?? "");
		if (!command.trim()) return undefined;

		for (const tokens of commandsOf(command)) {
			if (basename(tokens[0]) !== "aws") continue;

			const args = tokens.slice(1);

			// No args, or a help/version flag anywhere: always read-only.
			if (args.length === 0) continue;
			if (args.some((a) => a === "--help" || a === "-h" || a === "--version")) continue;
			if (args[0] === "help" || args[0] === "version") continue;

			const verb = findAwsCommandVerb(args);
			if (verb && startsWithReadonlyPrefix(verb)) continue;

			// No identifiable verb (e.g. just "aws s3") or a non-readonly verb:
			// block, mirroring the wrapper's fail-closed default.
			const reason =
				`Blocked: "aws ${args.join(" ")}" is not a read-only operation ` +
				`(allowed verb prefixes: ${READONLY_PREFIXES.join(", ")}). ` +
				"This is a client-side backstop against accidental writes with elevated AWS credentials, " +
				"not a security boundary — see the aws-cli skill and ~/shalomb/aws-cli-ro for the stronger " +
				"containerized version. If this call is genuinely intended, confirm explicitly and it can be re-run manually.";
			if (ctx.hasUI) ctx.ui.notify(reason, "warning");
			return { block: true, reason };
		}

		return undefined;
	});
}
