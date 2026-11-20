// Tests for view-file.ts. Run: cd .pi/agent/extensions/_lib && bun test view-file
import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { editOutcome, parseViewArgs, pickEditor, viewArgv } from "./view-file";

const dir = mkdtempSync(join(tmpdir(), "view-"));
const f = join(dir, "a b.ts");
writeFileSync(f, "x\n");

test("plain path resolves against cwd, read-only by default", () => {
	const r = parseViewArgs("a.ts", "/w");
	expect(r).toEqual({ ok: true, path: "/w/a.ts", line: undefined, edit: false });
});

test("file:line and file:line:col give a line", () => {
	expect(parseViewArgs("src/x.ts:42", "/w")).toMatchObject({ path: "/w/src/x.ts", line: 42 });
	expect(parseViewArgs("src/x.ts:42:7", "/w")).toMatchObject({ path: "/w/src/x.ts", line: 42 });
});

test("a trailing :digits only counts when the file does not exist with that name", () => {
	const odd = join(dir, "v:2");
	writeFileSync(odd, "x\n");
	expect(parseViewArgs(odd, "/w")).toMatchObject({ path: odd, line: undefined });
});

test("--edit and +N flags, @ prefix and ~ expand", () => {
	expect(parseViewArgs("--edit @a.ts", "/w")).toMatchObject({ edit: true, path: "/w/a.ts" });
	expect(parseViewArgs("a.ts +10", "/w")).toMatchObject({ line: 10 });
	expect(parseViewArgs("~/x.md", "/w", "/home/u")).toMatchObject({ path: "/home/u/x.md" });
});

test("quoted path with spaces", () => {
	expect(parseViewArgs(`"${f}"`, "/w")).toMatchObject({ path: f });
});

test("no path is an error", () => {
	expect(parseViewArgs("", "/w")).toEqual({ ok: false, error: "usage: /view <file>[:line] [--edit]" });
});

test("argv: read-only vim with +line, never goes through a shell", () => {
	expect(viewArgv({ path: "/w/a b.ts", line: 5, edit: false }, "vim")).toEqual(["vim", "-R", "+5", "--", "/w/a b.ts"]);
	expect(viewArgv({ path: "/w/a.ts", edit: true }, "vim")).toEqual(["vim", "--", "/w/a.ts"]);
});

test("editOutcome: says whether the human saved a change, so the agent knows to re-read", () => {
	expect(editOutcome("/r/a.md", "x", "x")).toBe("edited /r/a.md in the editor: no changes saved");
	expect(editOutcome("/r/a.md", "x", "y")).toBe("edited /r/a.md in the editor: changes saved; re-read it before acting");
	expect(editOutcome("/r/a.md", undefined, "y")).toBe("edited /r/a.md in the editor: file created; re-read it before acting");
});

test("pickEditor: PI_VIEW_EDITOR, then VISUAL, then EDITOR, then vi (never a hardcoded vim)", () => {
	expect(pickEditor({ PI_VIEW_EDITOR: "hx", VISUAL: "nvim", EDITOR: "nano" })).toBe("hx");
	expect(pickEditor({ VISUAL: "nvim", EDITOR: "nano" })).toBe("nvim");
	expect(pickEditor({ EDITOR: "nano" })).toBe("nano");
	expect(pickEditor({ VISUAL: "", EDITOR: "" })).toBe("vi");
});
