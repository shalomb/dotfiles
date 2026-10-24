// Readline-style Tab for filesystem paths: complete to the longest common
// prefix of entries that literally start with the typed text. If that can't
// extend the text, fall through to Pi's normal (fuzzy) suggestion list.
import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem, AutocompleteProvider } from "@earendil-works/pi-tui";

function lcp(strs: string[]): string {
	let p = strs[0] ?? "";
	for (const s of strs) while (!s.startsWith(p)) p = p.slice(0, -1);
	return p;
}

type Result = { extend: string } | { list: AutocompleteItem[] };

function complete(token: string, cwd: string): Result | undefined {
	if (!token || /^[@"'\-]/.test(token)) return undefined;
	const isPath = token.startsWith("~") || token.includes("/");
	if (!isPath) return undefined;
	if (token.startsWith("/") && !token.slice(1).includes("/")) return undefined; // slash command
	const slash = token.lastIndexOf("/");
	const dirPart = token.slice(0, slash + 1); // keeps "~/" etc. as typed
	const base = token.slice(slash + 1);
	const real = dirPart.startsWith("~") ? homedir() + dirPart.slice(1) : dirPart;
	const dir = real ? (real.startsWith("/") ? real : join(cwd, real)) : cwd;
	let names: string[];
	try {
		names = readdirSync(dir);
	} catch {
		return undefined;
	}
	const matches = names.filter((n) => n.startsWith(base) && (base.startsWith(".") || !n.startsWith(".")));
	if (matches.length === 0) return undefined;
	let common = lcp(matches);
	if (matches.length === 1) {
		try {
			if (statSync(join(dir, common)).isDirectory()) common += "/";
		} catch {}
	}
	if (common.length > base.length) return { extend: dirPart + common };
	if (matches.length < 2) return undefined;
	// Ambiguous: keep literal matches only (no fuzzy fallback, no auto-pick).
	const list = matches.sort().map((n) => {
		let name = n;
		try {
			if (statSync(join(dir, n)).isDirectory()) name += "/";
		} catch {}
		return { value: dirPart + name, label: name };
	});
	return { list };
}

export default function (pi: ExtensionAPI): void {
	pi.on("session_start", async (_e, ctx) => {
		const ours = new WeakSet<AutocompleteItem>();
		// Editor re-requests (force) after every keystroke while a popup is open, so
		// Tab would accept the highlighted item. Only answer real Tab presses; on
		// keystrokes close the popup so the next Tab is a fresh bash-style request.
		let tabPressed = false;
		let listOpen = false; // our multi-candidate popup is showing
		ctx.ui.onTerminalInput((data) => {
			if (data === "\t" && listOpen) {
				// Popup already up: Tab cycles (like readline menu-complete) instead of accepting.
				tabPressed = false;
				return { data: "\x1b[B" };
			}
			tabPressed = data === "\t";
			if (!/^\x1b\[[AB]$|^\x1bO[AB]$/.test(data)) listOpen = false; // typing/Enter/Esc closes it
			return undefined;
		});
		ctx.ui.addAutocompleteProvider((current): AutocompleteProvider => ({
			...current,
			async getSuggestions(lines, l, c, options) {
				if (options.force) {
					if (!tabPressed) {
						listOpen = false;
						return null;
					}
					const token = (lines[l] ?? "").slice(0, c).match(/[^\s]*$/)?.[0] ?? "";
					const done = complete(token, ctx.cwd);
					if (done) {
						const items: AutocompleteItem[] =
							"extend" in done ? [{ value: done.extend, label: done.extend }] : done.list;
						for (const i of items) ours.add(i);
						listOpen = items.length > 1;
						return { prefix: token, items };
					}
				}
				return current.getSuggestions(lines, l, c, options);
			},
			applyCompletion(lines, l, c, item, prefix) {
				if (!ours.has(item)) return current.applyCompletion(lines, l, c, item, prefix);
				const line = lines[l] ?? "";
				const start = c - prefix.length;
				const out = [...lines];
				out[l] = line.slice(0, start) + item.value + line.slice(c);
				return { lines: out, cursorLine: l, cursorCol: start + item.value.length };
			},
			shouldTriggerFileCompletion: (...a) => current.shouldTriggerFileCompletion?.(...a) ?? true,
		}));
	});
}
