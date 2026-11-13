import { describe, expect, test, beforeEach } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openRegistry } from "./registry";
import { gumLookup, enrichRows } from "./registry-gum";

let gumDb: string;
beforeEach(() => {
	gumDb = join(mkdtempSync(join(tmpdir(), "gum-")), "gum.db");
	const g = openRegistry(gumDb);
	g.exec("CREATE TABLE projects (id INTEGER PRIMARY KEY, path TEXT UNIQUE, name TEXT, remote_url TEXT)");
	g.query("INSERT INTO projects (path,name,remote_url) VALUES (?,?,?)").run("/r/proj", "proj", "https://github.com/o/proj.git");
});

describe("gum enrichment", () => {
	test("looks up name and remote_url by repo path", () => {
		expect(gumLookup("/r/proj", gumDb)).toEqual({ name: "proj", remote_url: "https://github.com/o/proj.git" });
	});
	test("unknown repo returns null", () => {
		expect(gumLookup("/nope", gumDb)).toBeNull();
	});
	test("missing gum.db falls back to null without creating it", () => {
		const missing = join(tmpdir(), `no-such-${Date.now()}.db`);
		expect(gumLookup("/r/proj", missing)).toBeNull();
		expect(Bun.file(missing).size).toBe(0);
	});
	test("enrichRows adds repo_name/remote_url, nulls when unknown", () => {
		const rows = [{ repo: "/r/proj" }, { repo: "/x" }] as any[];
		const out = enrichRows(rows, gumDb);
		expect(out[0]).toMatchObject({ repo_name: "proj", remote_url: "https://github.com/o/proj.git" });
		expect(out[1]).toMatchObject({ repo_name: null, remote_url: null });
	});
});
