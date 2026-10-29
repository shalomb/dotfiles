import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import { loadPromptHistory } from "./_lib/prompt-history";

let cachedPrompts: string[] | null = null;
let lastLoadedTime = 0;

function getPrompts(currentSessionEntries?: any[]): string[] {
	const now = Date.now();
	// Refresh cache at most once every 30 seconds
	if (!cachedPrompts || now - lastLoadedTime > 30000) {
		cachedPrompts = loadPromptHistory();
		lastLoadedTime = now;
	}

	// Prepend recent in-memory prompts from the current session if available
	const sessionPrompts: string[] = [];
	if (currentSessionEntries && Array.isArray(currentSessionEntries)) {
		for (let i = currentSessionEntries.length - 1; i >= 0; i--) {
			const e = currentSessionEntries[i];
			if (e.type === "message" && e.message?.role === "user") {
				const raw = e.message.content;
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
				if (txt) sessionPrompts.push(txt);
			}
		}
	}

	const combined: string[] = [];
	const seen = new Set<string>();
	for (const p of [...sessionPrompts, ...cachedPrompts]) {
		if (!seen.has(p)) {
			seen.add(p);
			combined.push(p);
		}
	}
	return combined;
}

export async function openHistorySearch(ctx: ExtensionContext): Promise<void> {
	let entries: any[] = [];
	try {
		entries = ctx.sessionManager?.getEntries() ?? [];
	} catch {
		// Ignore if getEntries fails
	}

	const prompts = getPrompts(entries);
	if (prompts.length === 0) {
		ctx.ui.notify("No prompt history available", "info");
		return;
	}

	// Format options: show single-line preview in list
	const previewMap = new Map<string, string>();
	const options = prompts.map((p) => {
		const single = p.replace(/[\r\n]+/g, " ");
		const preview = single.length > 90 ? `${single.slice(0, 87)}...` : single;
		// If duplicate preview strings exist, ensure mapping key is unique
		let key = preview;
		let counter = 1;
		while (previewMap.has(key) && previewMap.get(key) !== p) {
			key = `${preview} (${counter++})`;
		}
		previewMap.set(key, p);
		return key;
	});

	const selected = await ctx.ui.select("Search Prompt History (↑/↓ to navigate, Enter to choose):", options);
	if (selected) {
		const full = previewMap.get(selected) ?? selected;
		ctx.ui.setEditorText(full);
	}
}

export default function (pi: ExtensionAPI): void {
	// Register official Pi shortcut for Ctrl-R
	pi.registerShortcut(Key.ctrl("r"), {
		description: "Search prompt history (Readline Ctrl-R)",
		handler: async (ctx) => {
			await openHistorySearch(ctx);
		},
	});

	// Also register /history slash command for discoverability
	pi.registerCommand("history", {
		description: "Browse and select from prompt history (Readline Ctrl-R)",
		handler: async (_args, ctx) => {
			await openHistorySearch(ctx);
		},
	});
}
