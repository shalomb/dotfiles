// Run: bun test ./doc-search.test.ts
// Behaviour from tests/features/doc-search.feature (spec unit 2 of docs/specs/doc-system/handoff-slice-1.md).
import { describe, expect, it } from "bun:test";
import { renderSearchPage } from "./doc-search.ts";

interface Card {
	title: string;
	kind: string;
	date: string;
	summary: string;
	tags: string[];
	repo: string;
	origin: string;
	path: string;
}
const card = (i: number, extra: Partial<Card> = {}): Card => ({
	title: `Doc ${i}`,
	kind: "report",
	date: "2026-11-14",
	summary: `Summary ${i}`,
	tags: [`tag${i % 7}`],
	repo: "org/repo",
	origin: "",
	path: `report/2026-11-14-doc-${i}/index.html`,
	...extra,
});
const KINDS = ["brief", "report"];

class El {
	value = "";
	textContent = "";
	innerHTML = "";
	hidden = false;
	open = false;
	classes = new Set<string>();
	listeners: Record<string, ((e: any) => void)[]> = {};
	classList = {
		add: (c: string) => this.classes.add(c),
		remove: (c: string) => this.classes.delete(c),
		contains: (c: string) => this.classes.has(c),
		toggle: (c: string, on: boolean) => (on ? this.classes.add(c) : this.classes.delete(c)),
	};
	addEventListener(t: string, f: (e: any) => void) {
		(this.listeners[t] ??= []).push(f);
	}
	fire(t: string, e: any = {}) {
		for (const f of this.listeners[t] ?? []) f(e);
	}
	focus() {}
}

/** Run the page's inline script against a stub document; return the stub elements. */
function boot(cards: Card[], hash = "") {
	const html = renderSearchPage(JSON.stringify(cards), KINDS);
	const els: Record<string, El> = {};
	for (const id of ["q", "n", "cards", "legend", "guidance", "page"]) els[id] = new El();
	els.legend.open = true;
	const doc = new El() as any;
	doc.getElementById = (id: string) => (id === "data" ? { textContent: JSON.stringify(cards) } : els[id]);
	doc.activeElement = null;
	const win = new El() as any;
	win.location = { hash };
	win.history = { replaceState() {} };
	const scripts = [...html.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
	expect(scripts.length).toBe(1);
	new Function("document", "window", "location", "history", "addEventListener", scripts[0])(doc, win, win.location, win.history, (t: string, f: any) => doc.addEventListener(t, f));
	return { els, doc, html };
}
const type = (els: Record<string, El>, v: string) => {
	els.q.value = v;
	els.q.fire("input");
};
const docked = (els: Record<string, El>) => els.page.classes.has("docked");

describe("renderSearchPage markup", () => {
	it("reads index data only: no network calls, no external resources", () => {
		const html = renderSearchPage("[]", KINDS);
		expect(html).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|src="http|href="http/);
	});
	it("holds the legend in a details element listing every kind", () => {
		const html = renderSearchPage("[]", KINDS);
		expect(html).toMatch(/<details[^>]*id="legend"[\s\S]*brief[\s\S]*report[\s\S]*<\/details>/);
	});
	it("escapes a closing script tag inside the data", () => {
		const html = renderSearchPage(JSON.stringify([card(1, { summary: "</script><b>" })]), KINDS);
		expect(html).not.toContain("</script><b>");
	});
});

describe("empty library", () => {
	it("shows guidance on how to file a document", () => {
		const { els } = boot([]);
		expect(els.guidance.hidden).toBe(false);
		expect(els.n.textContent).toBe("0 of 0 documents");
	});
	it("hides the guidance when documents exist", () => {
		const { els } = boot([card(1)]);
		expect(els.guidance.hidden).toBe(true);
	});
	it("carries guidance text naming /doc file", () => {
		expect(renderSearchPage("[]", KINDS)).toMatch(/id="guidance"[^>]*>[\s\S]*\/doc file/);
	});
});

describe("Landing and Docked states", () => {
	it("starts in Landing with the legend open", () => {
		const { els } = boot([card(1), card(2)]);
		expect(docked(els)).toBe(false);
		expect(els.legend.open).toBe(true);
	});
	it("typing docks the box, folds the legend and filters", () => {
		const { els } = boot([card(1, { title: "Alpha" }), card(2, { title: "Beta" })]);
		type(els, "beta");
		expect(docked(els)).toBe(true);
		expect(els.legend.open).toBe(false);
		expect(els.cards.innerHTML).toContain("Beta");
		expect(els.cards.innerHTML).not.toContain("Alpha");
		expect(els.n.textContent).toBe("1 of 2 documents");
	});
	it("clearing the query restores Landing with the full legend", () => {
		const { els } = boot([card(1)]);
		type(els, "x");
		type(els, "");
		expect(docked(els)).toBe(false);
		expect(els.legend.open).toBe(true);
	});
	it("Escape clears the query and returns to Landing", () => {
		const { els, doc } = boot([card(1)]);
		type(els, "doc");
		els.q.fire("keydown", { key: "Escape", preventDefault() {} });
		expect(els.q.value).toBe("");
		expect(docked(els)).toBe(false);
		expect(els.legend.open).toBe(true);
		expect(doc).toBeDefined();
	});
	it("a whitespace-only query stays in Landing", () => {
		const { els } = boot([card(1)]);
		type(els, "   ");
		expect(docked(els)).toBe(false);
	});
	it("opens straight into Docked when the URL hash carries a query", () => {
		const { els } = boot([card(1, { title: "Alpha" }), card(2, { title: "Beta" })], "#alpha");
		expect(docked(els)).toBe(true);
		expect(els.cards.innerHTML).toContain("Alpha");
		expect(els.cards.innerHTML).not.toContain("Beta");
	});
});

describe("filtering", () => {
	it("matches words across title, summary, kind, repo, date and tags", () => {
		const { els } = boot([card(1, { title: "One", tags: ["alpha"] }), card(2, { title: "Two" })]);
		type(els, "alpha org/repo report");
		expect(els.cards.innerHTML).toContain("One");
		expect(els.cards.innerHTML).not.toContain("Two");
	});
	it("escapes card text", () => {
		const { els } = boot([card(1, { title: "<img onerror=x>" })]);
		type(els, "img");
		expect(els.cards.innerHTML).not.toContain("<img");
	});
	it("filters 2000 cards within 50 ms", () => {
		const { els } = boot(Array.from({ length: 2000 }, (_, i) => card(i)));
		const t0 = performance.now();
		type(els, "doc 1999");
		expect(performance.now() - t0).toBeLessThan(50);
		expect(els.cards.innerHTML).toContain("Doc 1999");
	});
});
