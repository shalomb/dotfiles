import { describe, expect, test } from "bun:test";
import {
	addExclude,
	assertOutsideGitTree,
	captureFile,
	docRef,
	formatNote,
	makeNote,
	parseNotes,
	planCapture,
} from "./doc-capture.ts";

describe("doc-capture", () => {
	test("docRef is a safe refs/doc/* name", () => {
		expect(docRef("Q3 Review/Deck v2")).toBe("refs/doc/q3-review-deck-v2");
		expect(docRef("..//x")).toBe("refs/doc/x");
		expect(() => docRef("///")).toThrow();
	});

	test("captureFile lives under the shadow root", () => {
		expect(captureFile("/s", "repo1", "My Doc")).toBe("/s/repo1/my-doc.notes.jsonl");
		expect(() => captureFile("/s", "../x", "d")).toThrow();
	});

	test("assertOutsideGitTree rejects paths inside a git root", () => {
		expect(() => assertOutsideGitTree("/r/wt/a.jsonl", ["/r/wt"])).toThrow(/git tree/);
		expect(() => assertOutsideGitTree("/r/wt", ["/r/wt"])).toThrow();
		expect(() => assertOutsideGitTree("/r/wt2/a", ["/r/wt"])).not.toThrow();
		expect(() => assertOutsideGitTree("/s/a", ["/r/wt"])).not.toThrow();
	});

	test("notes round-trip and skip junk lines", () => {
		const n = makeNote({ section: "Risks", text: " CTO wants table \n", kind: "decision", at: "2025-01-01T00:00:00Z" });
		expect(n.text).toBe("CTO wants table");
		const raw = `${formatNote(n)}\nnot json\n{"x":1}\n`;
		expect(parseNotes(raw)).toEqual([n]);
		expect(() => makeNote({ section: "s", text: "  ", at: "t" })).toThrow();
		expect(makeNote({ section: "s", text: "q", at: "t" }).kind).toBe("note");
	});

	test("addExclude is idempotent", () => {
		const a = addExclude("# c\n*.log\n", "/doc/");
		expect(a).toBe("# c\n*.log\n/doc/\n");
		expect(addExclude(a, "/doc/")).toBe(a);
		expect(addExclude("", "x")).toBe("x\n");
	});

	test("planCapture targets shadow store, never the git tree", () => {
		const p = planCapture({
			shadowRoot: "/s",
			repoKey: "r",
			docId: "Deck",
			gitRoots: ["/r/wt"],
			note: { section: "A", text: "hi", at: "t" },
		});
		expect(p.file).toBe("/s/r/deck.notes.jsonl");
		expect(p.ref).toBe("refs/doc/deck");
		expect(p.line.endsWith("\n")).toBe(true);
		expect(() =>
			planCapture({ shadowRoot: "/r/wt/.shadow", repoKey: "r", docId: "d", gitRoots: ["/r/wt"], note: { section: "A", text: "hi", at: "t" } }),
		).toThrow(/git tree/);
	});
});
