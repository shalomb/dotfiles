/** Resolve a session UUID to its pi session file(s). Pure fs; tested in resume-id.test.ts. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isSessionId = (s: string): boolean => UUID.test(s.trim());

/** Top-level `<project>/<timestamp>_<uuid>.jsonl` files only (no subagent runs/artifacts). */
export function resolveSessionId(id: string, sessionsRoot: string): string[] {
	if (!isSessionId(id) || !existsSync(sessionsRoot)) return [];
	const suffix = `_${id.trim().toLowerCase()}.jsonl`;
	const hits: string[] = [];
	for (const proj of readdirSync(sessionsRoot, { withFileTypes: true })) {
		if (!proj.isDirectory()) continue;
		const dir = join(sessionsRoot, proj.name);
		for (const f of readdirSync(dir, { withFileTypes: true }))
			if (f.isFile() && f.name.toLowerCase().endsWith(suffix)) hits.push(join(dir, f.name));
	}
	return hits;
}
