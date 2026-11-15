/**
 * Append-only JSONL log of guard activity (blocks and injected prompt sections), so the effect of
 * guard/prompt changes can be measured without scanning session files. Never throws: logging must
 * not break a tool call. Analyse with scripts/analyze-guard-hits.py or jq.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const GUARD_LOG = join(process.env.XDG_STATE_HOME ?? join(homedir(), ".local/state"), "pi", "guard-hits.jsonl");

export interface GuardEvent {
	guard: string;
	kind: "block" | "prompt";
	rule?: string;
	command?: string;
	fix?: string | null;
	sections?: string[];
}

export function logGuardEvent(e: GuardEvent, file: string = GUARD_LOG): void {
	try {
		const { fix, command, ...rest } = e;
		const row = { ts: new Date().toISOString(), session: process.env.PI_SESSION_ID ?? null, ...rest, hadFix: !!fix, command: command?.slice(0, 500) };
		mkdirSync(dirname(file), { recursive: true });
		appendFileSync(file, `${JSON.stringify(row)}\n`);
	} catch {
		// logging is best-effort
	}
}
