// Contract: pi-ladder.mk turns a topic fragment (variables only) into an ordered test ladder
// (static -> unit -> io -> flow), stops at the first red rung, and fails the guard on orphan or missing tests.
import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LADDER_MK = join(dirname(fileURLToPath(import.meta.url)), "..", "pi-ladder.mk");
let dir: string;

const PASS = `import { test, expect } from "bun:test";\ntest("ok", () => expect(1).toBe(1));\n`;
const FAIL = `import { test, expect } from "bun:test";\ntest("red", () => expect(1).toBe(2));\n`;

/** A fixture tree: <dir>/ext/fake.mk declares topic "fake"; its files sit beside it in <dir>/ext/. */
function fixture(opts: { unit?: string; io?: string; extraFiles?: Record<string, string>; fragment?: string } = {}) {
	const ext = join(dir, "ext");
	mkdirSync(ext, { recursive: true });
	writeFileSync(join(ext, "src.ts"), "export const x = 1;\n");
	writeFileSync(join(ext, "unit.test.ts"), opts.unit ?? PASS);
	writeFileSync(join(ext, "io.test.ts"), opts.io ?? `import { test } from "bun:test";\nimport { writeFileSync } from "node:fs";\ntest("io", () => writeFileSync(${JSON.stringify(join(dir, "io-ran"))}, "1"));\n`);
	for (const [name, body] of Object.entries(opts.extraFiles ?? {})) writeFileSync(join(ext, name), body);
	writeFileSync(
		join(ext, "fake.mk"),
		opts.fragment ??
			`fake_DIR := $(dir $(lastword $(MAKEFILE_LIST)))\nfake_STATIC := src.ts\nfake_UNIT := unit\nfake_IO := io\n$(eval $(call ladder,fake))\n`,
	);
	writeFileSync(join(dir, "Makefile"), `include ${LADDER_MK}\n`);
}

function make(...args: string[]) {
	const p = Bun.spawnSync(["make", "-s", "-C", dir, `LADDER_ROOT=${join(dir, "ext")}/`, ...args], { stdout: "pipe", stderr: "pipe" });
	return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "pi-ladder-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("a topic fragment yields a ladder that runs its rungs in order and passes when all are green", () => {
	fixture();
	const r = make("test-fake");
	expect(r.code).toBe(0);
	expect(r.out.indexOf("[fake] static")).toBeGreaterThanOrEqual(0);
	expect(r.out.indexOf("[fake] static")).toBeLessThan(r.out.indexOf("[fake] unit"));
	expect(r.out.indexOf("[fake] unit")).toBeLessThan(r.out.indexOf("[fake] io"));
	expect(existsSync(join(dir, "io-ran"))).toBe(true);
});

test("a red unit rung stops the ladder before the io rung and names the failing rung", () => {
	fixture({ unit: FAIL });
	const r = make("test-fake");
	expect(r.code).not.toBe(0);
	expect(existsSync(join(dir, "io-ran"))).toBe(false);
	expect(r.out).toContain("[fake] unit");
});

test("asking for a rung runs the rungs below it and none above", () => {
	fixture();
	const r = make("test-fake-unit");
	expect(r.code).toBe(0);
	expect(r.out).toContain("[fake] unit");
	expect(existsSync(join(dir, "io-ran"))).toBe(false);
});

test("an empty rung is skipped, not an error", () => {
	fixture();
	const r = make("test-fake-flow");
	expect(r.code).toBe(0);
	expect(r.out).toContain("[fake] flow (none)");
});

test("the guard passes when every test file in a topic directory belongs to a topic", () => {
	fixture();
	expect(make("ladder-check").code).toBe(0);
});

test("the guard fails and names a test file that belongs to no topic", () => {
	fixture({ extraFiles: { "orphan.test.ts": PASS } });
	const r = make("ladder-check");
	expect(r.code).not.toBe(0);
	expect(r.out).toContain("orphan.test.ts");
});

test("the guard tolerates an orphan listed in the baseline file but still fails a new one", () => {
	fixture({ extraFiles: { "old.test.ts": PASS, "ladder-orphans.txt": "old.test.ts\n" } });
	expect(make("ladder-check").code).toBe(0);
	writeFileSync(join(dir, "ext", "new.test.ts"), PASS);
	const r = make("ladder-check");
	expect(r.code).not.toBe(0);
	expect(r.out).toContain("new.test.ts");
	expect(r.out).not.toContain("old.test.ts");
});

test("a static rung checks every listed file, so a syntax error in any of them is red", () => {
	fixture({
		extraFiles: { "broken.ts": "export const = ;\n" },
		fragment: `fake_DIR := $(dir $(lastword $(MAKEFILE_LIST)))\nfake_STATIC := src.ts broken.ts\nfake_UNIT := unit\nfake_IO := io\n$(eval $(call ladder,fake))\n`,
	});
	const r = make("test-fake-static");
	expect(r.code).not.toBe(0);
	expect(r.out).toContain("broken.ts");
});

test("the guard fails and names a manifest entry whose test file does not exist", () => {
	fixture({
		fragment: `fake_DIR := $(dir $(lastword $(MAKEFILE_LIST)))\nfake_STATIC := src.ts\nfake_UNIT := unit ghost\nfake_IO := io\n$(eval $(call ladder,fake))\n`,
	});
	const r = make("ladder-check");
	expect(r.code).not.toBe(0);
	expect(r.out).toContain("ghost.test.ts");
});

test("test-ladders runs the guard and every registered topic", () => {
	fixture();
	const r = make("test-ladders");
	expect(r.code).toBe(0);
	expect(existsSync(join(dir, "io-ran"))).toBe(true);
});
