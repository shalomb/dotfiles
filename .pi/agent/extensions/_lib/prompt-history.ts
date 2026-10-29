import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface HistoryPrompt {
	text: string;
	timestamp?: number;
}

/**
 * Collect unique user prompts from the session JSONL logs in ~/.pi/agent/sessions.
 * Returns most recent prompts first.
 */
export function loadPromptHistory(options: { maxSessions?: number; maxPrompts?: number; root?: string } = {}): string[] {
	const maxSessions = options.maxSessions ?? 40;
	const maxPrompts = options.maxPrompts ?? 1000;
	const root = options.root ?? join(homedir(), ".pi", "agent", "sessions");

	if (!existsSync(root)) return [];

	// Collect all session directories
	const jsonlFiles: { path: string; mtime: number }[] = [];

	try {
		const walk = (dir: string, depth = 0) => {
			if (depth > 3) return;
			const entries = readdirSync(dir);
			for (const entry of entries) {
				if (entry.startsWith(".")) continue;
				const full = join(dir, entry);
				try {
					const st = statSync(full);
					if (st.isDirectory()) {
						walk(full, depth + 1);
					} else if (entry.endsWith(".jsonl")) {
						jsonlFiles.push({ path: full, mtime: st.mtimeMs });
					}
				} catch {
					// Ignore unreadable files
				}
			}
		};
		walk(root);
	} catch {
		return [];
	}

	// Sort files by newest first
	jsonlFiles.sort((a, b) => b.mtime - a.mtime);

	const prompts: string[] = [];
	const seen = new Set<string>();

	for (const file of jsonlFiles.slice(0, maxSessions)) {
		try {
			const content = readFileSync(file.path, "utf-8");
			// Process line by line from the end to prioritize recent prompts
			const lines = content.split("\n");
			for (let i = lines.length - 1; i >= 0; i--) {
				const line = lines[i].trim();
				if (!line || !line.includes('"role":"user"')) continue;
				try {
					const obj = JSON.parse(line);
					if (obj.type === "message" && obj.message?.role === "user") {
						const raw = obj.message.content;
						let txt = "";
						if (typeof raw === "string") {
							txt = raw.trim();
						} else if (Array.isArray(raw)) {
							for (const part of raw) {
								if (part.type === "text" && typeof part.text === "string") {
									txt += part.text;
								}
							}
							txt = txt.trim();
						}
						// Ignore slash commands or empty inputs if desired, or keep all
						if (txt && !seen.has(txt)) {
							seen.add(txt);
							prompts.push(txt);
							if (prompts.length >= maxPrompts) break;
						}
					}
				} catch {
					// Malformed JSON line
				}
			}
		} catch {
			// Read error
		}
		if (prompts.length >= maxPrompts) break;
	}

	return prompts;
}
