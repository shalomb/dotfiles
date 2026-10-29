import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	Container,
	type Focusable,
	fuzzyFilter,
	getKeybindings,
	Input,
	type SelectItem,
	SelectList,
	Spacer,
	Text,
	truncateToWidth,
} from "@earendil-works/pi-tui";
import { loadPromptHistory } from "./_lib/prompt-history";

class HistorySearchComponent extends Container implements Focusable {
	private searchInput: Input;
	private selectList: SelectList;
	private allItems: SelectItem[];
	private onSelectCb: (text: string) => void;
	private onCancelCb: () => void;
	private _focused = false;

	get focused(): boolean {
		return this._focused;
	}

	set focused(value: boolean) {
		this._focused = value;
		this.searchInput.focused = value;
	}

	constructor(
		prompts: string[],
		theme: any,
		onSelect: (text: string) => void,
		onCancel: () => void,
	) {
		super();
		this.onSelectCb = onSelect;
		this.onCancelCb = onCancel;

		this.allItems = prompts.map((p) => {
			const singleLine = p.replace(/[\r\n]+/g, " ");
			return {
				value: p,
				label: singleLine,
			};
		});

		// Header title
		const title = theme.bold(theme.fg("accent", " reverse-i-search (prompt history): "));
		this.addChild(new Text(title, 0, 0));

		// Input box
		this.searchInput = new Input();
		this.searchInput.onSubmit = () => this.selectList.handleInput("\r");
		this.addChild(this.searchInput);
		this.addChild(new Spacer(1));

		// SelectList for items
		const selectTheme = {
			selectedPrefix: () => theme.fg("accent", "> "),
			unselectedPrefix: () => "  ",
			selectedText: (s: string) => theme.bold(s),
			unselectedText: (s: string) => s,
			descriptionText: (s: string) => theme.fg("dim", s),
			scrollIndicator: () => theme.fg("dim", "↕"),
		};

		this.selectList = new SelectList(this.allItems, Math.min(Math.max(1, this.allItems.length), 10), selectTheme);
		this.selectList.onSelect = (item) => this.onSelectCb(item.value);
		this.selectList.onCancel = () => this.onCancelCb();

		this.addChild(this.selectList);
		this.addChild(new Spacer(1));

		// Footer hints
		const hint = theme.fg("dim", "  Enter to select · Esc / Ctrl-G to cancel · Up / Down / Ctrl-P / Ctrl-N to navigate");
		this.addChild(new Text(hint, 0, 0));
	}

	private applyFilter(query: string): void {
		const filtered = query
			? fuzzyFilter(this.allItems, query, (item) => item.label)
			: this.allItems;

		this.selectList.setFilter(filtered);
	}

	handleInput(data: string): void {
		const kb = getKeybindings();

		// Handle navigation keys
		const isNav =
			kb.matches(data, "tui.select.up") ||
			kb.matches(data, "tui.select.down") ||
			kb.matches(data, "tui.select.confirm") ||
			kb.matches(data, "tui.select.cancel") ||
			data === "\x10" || // Ctrl-P
			data === "\x0e" || // Ctrl-N
			data === "\x07"; // Ctrl-G (cancel in readline)

		if (data === "\x07") {
			this.onCancelCb();
			return;
		}

		if (isNav) {
			if (data === "\x10") {
				this.selectList.handleInput("\x1b[A"); // map Ctrl-P to Up
			} else if (data === "\x0e") {
				this.selectList.handleInput("\x1b[B"); // map Ctrl-N to Down
			} else {
				this.selectList.handleInput(data);
			}
			return;
		}

		// Text input for search
		this.searchInput.handleInput(data);
		this.applyFilter(this.searchInput.getValue());
	}
}

export default function (pi: ExtensionAPI): void {
	let cachedPrompts: string[] | null = null;
	let lastLoadedTime = 0;

	// Load history in background or on first use
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

	pi.on("session_start", (_event, ctx) => {
		// Listen for terminal input: Ctrl-R is \x12
		let isSearching = false;

		ctx.ui.onTerminalInput(async (data) => {
			if (data === "\x12" && !isSearching) {
				// Ctrl-R pressed
				isSearching = true;

				// Fetch entries from current session
				let entries: any[] = [];
				try {
					entries = ctx.sessionManager.getEntries();
				} catch {
					// In case getEntries fails
				}

				const prompts = getPrompts(entries);
				if (prompts.length === 0) {
					ctx.ui.notify("No prompt history available", "info");
					isSearching = false;
					return { data: "" }; // Swallow Ctrl-R
				}

				// Launch overlay
				const selected = await ctx.ui.custom<string | undefined>((tui, theme, _kb, done) => {
					const comp = new HistorySearchComponent(
						prompts,
						theme,
						(chosen) => done(chosen),
						() => done(undefined),
					);
					comp.focused = true;
					return {
						render: (w) => comp.render(w).map((l) => truncateToWidth(l, w)),
						handleInput: (d) => {
							comp.handleInput(d);
							tui.requestRender();
						},
						invalidate: () => comp.invalidate(),
					};
				}, { overlay: true });

				isSearching = false;

				if (selected !== undefined) {
					ctx.ui.setEditorText(selected);
				}

				return { data: "" }; // Swallow Ctrl-R
			}
			return undefined;
		});
	});
}
